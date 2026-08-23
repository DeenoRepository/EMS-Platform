import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { prisma } from '@ems/database';

export const dynamic = 'force-dynamic';

export interface ServiceHealth {
  status: 'healthy' | 'unreachable' | 'degraded' | 'disabled';
  name: string;
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

function checkTcpSocket(host: string, port: number, timeoutMs = 500): Promise<boolean> {
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
  // 1. Parse Database Config for probing
  let dbHost = '127.0.0.1';
  let dbPort = 5432;
  const dbUrl = process.env.DATABASE_URL || '';

  try {
    const urlMatch = dbUrl.match(/@([^:/]+)(?::(\d+))?\/([^?]+)/);
    if (urlMatch) {
      dbHost = urlMatch[1] || '127.0.0.1';
      dbPort = parseInt(urlMatch[2] || '5432', 10);
    }
  } catch {
    // fallback
  }

  // 1a. Fast TCP Pre-flight Check (< 50ms)
  let dbHealth: ServiceHealth;
  const isTcpOpen = await checkTcpSocket(dbHost, dbPort, 500);

  if (!isTcpOpen) {
    dbHealth = {
      status: 'unreachable',
      name: 'Database',
    };
  } else {
    // 1b. Query check if TCP is open
    try {
      const dbCheckPromise = prisma.$queryRaw`SELECT 1 as healthy`;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 1500)
      );

      const dbStart = Date.now();
      await Promise.race([dbCheckPromise, timeoutPromise]);
      const latencyMs = Date.now() - dbStart;

      dbHealth = {
        status: 'healthy',
        name: 'Database',
        latencyMs,
      };
    } catch {
      dbHealth = {
        status: 'unreachable',
        name: 'Database',
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
      name: 'Storage',
    };
  } catch {
    storageHealth = {
      status: 'degraded',
      name: 'Storage',
    };
  }

  // 3. Check LDAP configuration
  const ldapEnabled = process.env.LDAP_ENABLED === 'true';
  const ldapHealth: ServiceHealth = {
    status: ldapEnabled ? 'healthy' : 'disabled',
    name: 'LDAP',
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
