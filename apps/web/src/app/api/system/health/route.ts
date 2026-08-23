import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import net from 'net';
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

function checkTcpSocket(host: string, port: number, timeoutMs = 600): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(port, host);
  });
}

export async function GET(req: NextRequest) {
  // 1. Parse Database Config
  let dbHealth: ServiceHealth;
  const dbUrl = process.env.DATABASE_URL || '';
  let dbHost = '127.0.0.1';
  let dbPort = 5432;
  let dbName = 'ems_db';

  try {
    const urlMatch = dbUrl.match(/@([^:/]+)(?::(\d+))?\/([^?]+)/);
    if (urlMatch) {
      dbHost = urlMatch[1] || '127.0.0.1';
      dbPort = parseInt(urlMatch[2] || '5432', 10);
      dbName = urlMatch[3] || 'ems_db';
    }
  } catch {
    // fallback
  }

  const maskedHost = `${dbHost}:${dbPort}`;

  // 1a. Fast TCP Pre-flight Check (< 50ms)
  const isTcpOpen = await checkTcpSocket(dbHost, dbPort, 600);

  if (!isTcpOpen) {
    dbHealth = {
      status: 'unreachable',
      name: 'PostgreSQL Database',
      host: maskedHost,
      database: dbName,
      error: `Сервер PostgreSQL на ${maskedHost} недоступен (порт закрыт или контейнер ems_postgres отключен).`,
      command: 'docker compose up -d postgres ldap',
      instructions: 'Запустите Docker Desktop и выполните: docker compose up -d postgres ldap',
    };
  } else {
    // 1b. Deep query check if TCP is open
    try {
      const dbCheckPromise = prisma.$queryRaw`SELECT 1 as healthy`;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Превышено время ответа от PostgreSQL (1.5 сек)')), 1500)
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
      let errorMsg = error?.message || 'Не удалось выполнить запрос к базе данных';
      if (errorMsg.includes("Can't reach database server") || errorMsg.includes('ECONNREFUSED')) {
        errorMsg = `Сервер PostgreSQL на ${maskedHost} не отвечает.`;
      }

      dbHealth = {
        status: 'unreachable',
        name: 'PostgreSQL Database',
        host: maskedHost,
        database: dbName,
        error: errorMsg,
        command: 'docker compose up -d postgres ldap',
        instructions: 'Запустите Docker Desktop и выполните: docker compose up -d postgres ldap',
      };
    }
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
