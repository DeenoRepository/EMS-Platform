import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@ems/database';

export const dynamic = 'force-dynamic';

export interface ServiceHealth {
  status: 'healthy' | 'unreachable' | 'degraded' | 'disabled';
  name: string;
  host?: string;
  database?: string;
  error?: string;
  command?: string;
  instructions?: string;
  latencyMs?: number;
}

export interface SystemHealthReport {
  isReady: boolean;
  timestamp: string;
  services: {
    database: ServiceHealth;
    storage: ServiceHealth;
    ldap: ServiceHealth;
  };
}

export async function GET(req: NextRequest) {
  // 1. Check Database Health with strict 3-second timeout
  let dbHealth: ServiceHealth;
  const dbUrl = process.env.DATABASE_URL || '';
  let maskedHost = '127.0.0.1:5432';
  let dbName = 'ems_db';

  try {
    const urlMatch = dbUrl.match(/@([^:/]+)(?::(\d+))?\/([^?]+)/);
    if (urlMatch) {
      maskedHost = `${urlMatch[1]}:${urlMatch[2] || '5432'}`;
      dbName = urlMatch[3] || 'ems_db';
    }
  } catch {
    // fallback
  }

  try {
    const dbCheckPromise = prisma.$queryRaw`SELECT 1 as healthy`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Превышено время ожидания ответа от PostgreSQL (3 сек)')), 3000)
    );

    const dbStart = Date.now();
    await Promise.race([dbCheckPromise, timeoutPromise]);
    const latencyMs = Date.now() - dbStart;

    dbHealth = {
      status: 'healthy',
      name: 'PostgreSQL Database',
      host: maskedHost,
      database: dbName,
      latencyMs,
    };
  } catch (error: any) {
    let errorMsg = error?.message || 'Не удалось подключиться к базе данных';
    if (errorMsg.includes("Can't reach database server") || errorMsg.includes('ECONNREFUSED')) {
      errorMsg = `Сервер PostgreSQL на ${maskedHost} не отвечает (соединение разорвано или контейнер отключен).`;
    }

    dbHealth = {
      status: 'unreachable',
      name: 'PostgreSQL Database',
      host: maskedHost,
      database: dbName,
      error: errorMsg,
      command: 'docker compose up -d postgres ldap',
      instructions: 'Запустите Docker Desktop и выполните команду в терминале проекта: docker compose up -d postgres ldap',
    };
  }

  // 2. Check File Storage
  let storageHealth: ServiceHealth;
  try {
    const uploadDir = process.env.UPLOAD_DIR || process.env.STORAGE_LOCAL_DIR || './uploads';
    const resolvedPath = path.isAbsolute(uploadDir)
      ? uploadDir
      : path.join(process.cwd(), uploadDir);

    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }

    // Test write permission
    const testFile = path.join(resolvedPath, '.healthcheck');
    fs.writeFileSync(testFile, 'ok', 'utf8');
    fs.unlinkSync(testFile);

    storageHealth = {
      status: 'healthy',
      name: 'Файловое хранилище (uploads)',
      host: uploadDir,
    };
  } catch (err: any) {
    storageHealth = {
      status: 'degraded',
      name: 'Файловое хранилище (uploads)',
      error: `Ошибка доступа к директории загрузок: ${err.message}`,
    };
  }

  // 3. Check LDAP configuration
  const ldapEnabled = process.env.LDAP_ENABLED === 'true';
  const ldapHealth: ServiceHealth = {
    status: ldapEnabled ? 'healthy' : 'disabled',
    name: 'Active Directory / OpenLDAP',
    host: ldapEnabled ? process.env.LDAP_URL || 'ldap://127.0.0.1:389' : undefined,
  };

  const isReady = dbHealth.status === 'healthy';

  const report: SystemHealthReport = {
    isReady,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth,
      storage: storageHealth,
      ldap: ldapHealth,
    },
  };

  return NextResponse.json({
    success: true,
    data: report,
  });
}
