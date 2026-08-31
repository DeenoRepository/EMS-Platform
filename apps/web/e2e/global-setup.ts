/**
 * global-setup.ts — Playwright global setup for EMS-Platform E2E smoke tests.
 *
 * Provisions a dedicated, ephemeral PostgreSQL database (never the
 * developer's local dev DB, never CI's unit-test dummy DATABASE_URL),
 * applies the versioned Prisma migrations (see
 * plans/done/2026-08/L2-prisma-migration-baseline.md), then seeds it with
 * the repository's standard seed data (packages/database/src/seed.ts) plus
 * one E2E-specific known-password admin user so tests have a stable login.
 *
 * Torn down by global-teardown.ts after the run.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@ems/database';
import { PERMISSION_DEFINITIONS } from '@ems/shared';
import * as crypto from 'node:crypto';

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const databasePackageDir = path.join(repoRoot, 'packages', 'database');

export const E2E_DB_NAME = 'ems_e2e_test';
export const E2E_ADMIN_LOGIN = 'e2e_admin';
export const E2E_ADMIN_PASSWORD = 'E2eSmokeTestPassword!2026';
export const E2E_GUEST_LOGIN = 'e2e_guest';
export const E2E_GUEST_PASSWORD = 'E2eSmokeTestGuest!2026';

function buildDatabaseUrl(dbName: string): string {
  const host = process.env.E2E_DB_HOST || 'localhost';
  const port = process.env.E2E_DB_PORT || '5432';
  const user = process.env.E2E_DB_USER || 'postgres';
  const password = process.env.E2E_DB_PASSWORD || 'postgres';
  return `postgresql://${user}:${password}@${host}:${port}/${dbName}?schema=public`;
}

function hashPassword(password: string, iterations = 210_000): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

async function globalSetup(): Promise<void> {
  const adminUrl = buildDatabaseUrl('postgres');
  const dbUrl = buildDatabaseUrl(E2E_DB_NAME);

  // 1. Recreate the E2E database from scratch so every run starts from a
  //    known, reproducible state — see L4 Step 2 "воспроизводимое состояние".
  const adminClient = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  try {
    // Terminate any leftover connections from a previous crashed/killed run
    // before dropping — otherwise DROP DATABASE fails with Postgres error
    // 55006 ("is being accessed by other users").
    await adminClient.$executeRawUnsafe(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${E2E_DB_NAME}' AND pid <> pg_backend_pid()`
    );
    await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${E2E_DB_NAME}`);
    await adminClient.$executeRawUnsafe(`CREATE DATABASE ${E2E_DB_NAME}`);
  } finally {
    await adminClient.$disconnect();
  }

  // 2. Apply the versioned migration baseline (not db push) — consistent
  //    with L2's production path, and exercises the same migrations that
  //    ship to production. Invoke Prisma's installed Node entrypoint directly
  //    so the setup does not depend on Windows/POSIX shell shims.
  const prismaEntryPoint = path.join(
    databasePackageDir,
    'node_modules',
    'prisma',
    'build',
    'index.js'
  );
  execFileSync(
    process.execPath,
    [prismaEntryPoint, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
    {
      cwd: databasePackageDir,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    }
  );

  // 3. Seed permissions/roles and a known E2E admin + guest user directly
  //    via Prisma (not the interactive seed.ts, which generates random
  //    passwords) so tests have a fixed, documented login.
  const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    for (const def of Object.values(PERMISSION_DEFINITIONS) as Array<{
      code: string;
      displayName: string;
      module: string;
      description: string;
    }>) {
      await client.permission.upsert({
        where: { code: def.code },
        update: { displayName: def.displayName, module: def.module, description: def.description },
        create: def,
      });
    }

    const adminRole = await client.role.upsert({
      where: { name: 'admin' },
      update: { displayName: 'Администратор системы', isSystem: true },
      create: {
        name: 'admin',
        displayName: 'Администратор системы',
        description: 'Полный доступ ко всем модулям',
        isSystem: true,
      },
    });

    const guestRole = await client.role.upsert({
      where: { name: 'guest' },
      update: { displayName: 'Гость (Только чтение)', isSystem: true },
      create: {
        name: 'guest',
        displayName: 'Гость (Только чтение)',
        description: 'Доступ только на просмотр базовой информации',
        isSystem: true,
      },
    });

    const allPermissions = await client.permission.findMany();
    for (const perm of allPermissions) {
      await client.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
    // Guest gets zero permissions on purpose: this is the RBAC-denial fixture.

    const adminUser = await client.user.upsert({
      where: { ldapLogin: E2E_ADMIN_LOGIN },
      update: { passwordHash: hashPassword(E2E_ADMIN_PASSWORD), isActive: true },
      create: {
        ldapLogin: E2E_ADMIN_LOGIN,
        displayName: 'E2E Admin',
        email: 'e2e-admin@ems.local',
        passwordHash: hashPassword(E2E_ADMIN_PASSWORD),
        isActive: true,
      },
    });
    await client.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });

    const guestUser = await client.user.upsert({
      where: { ldapLogin: E2E_GUEST_LOGIN },
      update: { passwordHash: hashPassword(E2E_GUEST_PASSWORD), isActive: true },
      create: {
        ldapLogin: E2E_GUEST_LOGIN,
        displayName: 'E2E Guest',
        email: 'e2e-guest@ems.local',
        passwordHash: hashPassword(E2E_GUEST_PASSWORD),
        isActive: true,
      },
    });
    await client.userRole.upsert({
      where: { userId_roleId: { userId: guestUser.id, roleId: guestRole.id } },
      update: {},
      create: { userId: guestUser.id, roleId: guestRole.id },
    });

  } finally {
    await client.$disconnect();
  }
}

export default globalSetup;
