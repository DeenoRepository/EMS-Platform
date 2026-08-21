import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { PrismaClient, prisma } from '@ems/database';
import { hashPassword } from '@ems/auth';
import { PERMISSIONS } from '@ems/shared';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getCurrentUser } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Rate limiting: max 3 setup executions per 10 minutes
  const rateLimitError = enforceRateLimit(req, { limit: 3, windowMs: 10 * 60 * 1000, prefix: 'setup-exec' });
  if (rateLimitError) return rateLimitError;

  let client: PrismaClient | null = null;
  try {
    const rootDir = process.cwd();
    const installedFilePath = path.join(rootDir, '.installed');
    const rootInstalledFilePath = path.join(rootDir, '..', '..', '.installed');

    const fileInstalled = fs.existsSync(installedFilePath) || fs.existsSync(rootInstalledFilePath);

    // Check if database already has admin users to prevent hijacking on uninstalled file markers
    let dbHasAdmin = false;
    try {
      const adminCount = await prisma.user.count({
        where: {
          roles: {
            some: {
              role: {
                name: 'admin',
              },
            },
          },
        },
      });
      dbHasAdmin = adminCount > 0;
    } catch {
      // Database not connected/initialized yet
      dbHasAdmin = false;
    }

    if (fileInstalled || dbHasAdmin) {
      // Only authenticated admin can reconfigure an already installed system
      const user = await getCurrentUser(req);
      if (!user || !user.roles.includes('admin')) {
        return NextResponse.json(
          { success: false, error: 'Система уже установлена и настроена. Повторная настройка разрешена только авторизованному администратору.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const {
      dbConfig,
      adminConfig,
      ldapConfig,
      storageConfig,
      jiraConfig,
    } = body;

    if (!adminConfig?.login || !adminConfig?.password) {
      return NextResponse.json(
        { success: false, error: 'Укажите логин и пароль супер-администратора' },
        { status: 400 }
      );
    }

    // Build database URL
    let dbUrl = dbConfig?.url?.trim();
    if (!dbUrl) {
      const host = dbConfig?.host || process.env.DB_HOST || 'localhost';
      const port = dbConfig?.port || '5432';
      const user = dbConfig?.user || 'postgres';
      const pass = dbConfig?.password || '';
      const database = dbConfig?.database || 'ems_db';
      const authStr = pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}` : encodeURIComponent(user);
      dbUrl = `postgresql://${authStr}@${host}:${port}/${database}`;
    }

    // Automatically synchronize database schema if schema.prisma is found
    try {
      const potentialSchemaPaths = [
        path.join(rootDir, 'packages', 'database', 'prisma', 'schema.prisma'),
        path.join(rootDir, '..', '..', 'packages', 'database', 'prisma', 'schema.prisma'),
        path.join(rootDir, 'prisma', 'schema.prisma'),
        path.join(rootDir, '..', 'packages', 'database', 'prisma', 'schema.prisma'),
      ];
      const schemaPath = potentialSchemaPaths.find((p) => fs.existsSync(p));
      if (schemaPath) {
        execSync(`npx prisma db push --schema="${schemaPath}" --accept-data-loss --skip-generate`, {
          env: {
            ...process.env,
            DATABASE_URL: dbUrl,
          },
          stdio: 'pipe',
          timeout: 45000,
        });
      }
    } catch (schemaSyncErr: any) {
      console.warn('Database schema sync notice:', schemaSyncErr?.message || schemaSyncErr);
    }

    // Initialize temporary PrismaClient with the target database URL
    client = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });

    // 1. Ensure all system permissions exist
    const allPermissions = Object.values(PERMISSIONS);
    for (const code of allPermissions) {
      await client.permission.upsert({
        where: { code },
        create: {
          code,
          displayName: code,
          module: code.split('.')[0] || 'system',
          description: `Право доступа ${code}`,
        },
        update: {},
      });
    }

    // 2. Ensure default roles exist
    const allDbPermissions = await client.permission.findMany();
    const adminRole = await client.role.upsert({
      where: { name: 'admin' },
      create: {
        name: 'admin',
        displayName: 'Администратор',
        description: 'Полный доступ ко всем модулям и настройкам системы',
        isSystem: true,
      },
      update: {},
    });

    // Link all permissions to admin role
    for (const perm of allDbPermissions) {
      await client.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        },
        create: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
        update: {},
      });
    }

    // Engineer role
    const engineerRole = await client.role.upsert({
      where: { name: 'engineer' },
      create: {
        name: 'engineer',
        displayName: 'Инженер по надежности',
        description: 'Инженер по надежности: паспорта оборудования, ТО и складские операции',
        isSystem: true,
      },
      update: {},
    });

    const engineerPermCodes = [
      PERMISSIONS.EPS_EQUIPMENT_VIEW,
      PERMISSIONS.EPS_EQUIPMENT_CREATE,
      PERMISSIONS.EPS_EQUIPMENT_EDIT,
      PERMISSIONS.EPS_DOCUMENTS_UPLOAD,
      PERMISSIONS.WMS_STOCK_VIEW,
      PERMISSIONS.WMS_OPERATIONS_CREATE,
      PERMISSIONS.MRO_SCHEDULE_VIEW,
      PERMISSIONS.SRM_DASHBOARD_VIEW,
    ];
    for (const perm of allDbPermissions.filter((p) => engineerPermCodes.includes(p.code as any))) {
      await client.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: engineerRole.id,
            permissionId: perm.id,
          },
        },
        create: {
          roleId: engineerRole.id,
          permissionId: perm.id,
        },
        update: {},
      });
    }

    // 3. Create or update the Superadmin User
    const passwordHash = hashPassword(adminConfig.password);
    const superadmin = await client.user.upsert({
      where: { ldapLogin: adminConfig.login.trim().toLowerCase() },
      create: {
        ldapLogin: adminConfig.login.trim().toLowerCase(),
        displayName: adminConfig.displayName?.trim() || 'Главный Администратор',
        email: adminConfig.email?.trim() || null,
        passwordHash,
        isActive: true,
      },
      update: {
        passwordHash,
        displayName: adminConfig.displayName?.trim() || undefined,
        email: adminConfig.email?.trim() || undefined,
        isActive: true,
      },
    });

    // Assign admin role to superadmin
    await client.userRole.upsert({
      where: {
        userId_roleId: {
          userId: superadmin.id,
          roleId: adminRole.id,
        },
      },
      create: {
        userId: superadmin.id,
        roleId: adminRole.id,
      },
      update: {},
    });

    // 4. Update .env files
    const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    const storageDir = storageConfig?.dir || './uploads';
    const jiraHost = jiraConfig?.host || jiraConfig?.baseUrl || '';
    const jiraEmail = jiraConfig?.email || jiraConfig?.userEmail || '';
    const envLines = [
      `# EMS Platform Configuration Generated by Setup Wizard on ${new Date().toISOString()}`,
      `DATABASE_URL="${dbUrl}"`,
      `JWT_SECRET="${jwtSecret}"`,
      `JWT_EXPIRES_IN="8h"`,
      `JWT_EXPIRATION="8h"`,
      ``,
      `# Storage Configuration`,
      `STORAGE_TYPE="local"`,
      `STORAGE_LOCAL_DIR="${storageDir}"`,
      `UPLOAD_DIR="${storageDir}"`,
      ``,
      `# LDAP / Active Directory Integration`,
      `LDAP_ENABLED="${ldapConfig?.enabled ? 'true' : 'false'}"`,
      `LDAP_URL="${ldapConfig?.url || ''}"`,
      `LDAP_BIND_DN="${ldapConfig?.bindDn || ''}"`,
      `LDAP_BIND_PASSWORD="${ldapConfig?.bindPassword || ''}"`,
      `LDAP_SEARCH_BASE="${ldapConfig?.searchBase || ''}"`,
      `LDAP_SEARCH_FILTER="${ldapConfig?.searchFilter || '(sAMAccountName={{username}})'}"`,
      ``,
      `# Jira SRM Integration`,
      `JIRA_HOST="${jiraHost}"`,
      `JIRA_BASE_URL="${jiraHost}"`,
      `JIRA_EMAIL="${jiraEmail}"`,
      `JIRA_USER_EMAIL="${jiraEmail}"`,
      `JIRA_API_TOKEN="${jiraConfig?.apiToken || ''}"`,
      `JIRA_PROJECT_KEY="${jiraConfig?.projectKey || 'EMS'}"`,
      ``,
    ].join('\n');

    try {
      // Write to project root .env and apps/web .env
      const rootEnvPath = path.join(rootDir, '..', '..', '.env');
      const webEnvPath = path.join(rootDir, '.env');
      if (fs.existsSync(path.dirname(rootEnvPath))) {
        fs.writeFileSync(rootEnvPath, envLines, 'utf-8');
      }
      fs.writeFileSync(webEnvPath, envLines, 'utf-8');
    } catch (envErr) {
      console.warn('Could not write to disk .env:', envErr);
    }

    // 5. Create .installed lock file
    try {
      const installMeta = JSON.stringify(
        {
          installedAt: new Date().toISOString(),
          superadminLogin: superadmin.ldapLogin,
          dbUrlTested: true,
        },
        null,
        2
      );
      fs.writeFileSync(installedFilePath, installMeta, 'utf-8');
      const rootInstallMeta = path.join(rootDir, '..', '..', '.installed');
      if (fs.existsSync(path.dirname(rootInstallMeta))) {
        fs.writeFileSync(rootInstallMeta, installMeta, 'utf-8');
      }
    } catch (lockErr) {
      console.warn('Could not write .installed marker:', lockErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Система EMS успешно установлена и готова к работе!',
      redirect: '/login',
    });
  } catch (error: any) {
    console.error('Setup execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка во время выполнения установки',
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.$disconnect().catch(() => {});
    }
  }
}
