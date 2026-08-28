import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { prisma } from '@ems/database';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { hasPermission } from '@ems/auth';
import { PERMISSIONS } from '@ems/shared';

export const dynamic = 'force-dynamic';

export interface ServiceHealth {
  status: 'healthy' | 'unreachable' | 'degraded' | 'disabled';
  name: string;
  latencyMs?: number;
}

export interface SystemHealthReport {
  isReady: boolean;
  status: 'ok' | 'degraded';
  timestamp: string;
  services?: {
    database: ServiceHealth;
    storage: ServiceHealth;
    ldap: ServiceHealth;
  };
}

function checkTcpSocket(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = (result: boolean) => {
      if (!isResolved) {
        isResolved = true;
        if (timer) clearTimeout(timer);
        socket.destroy();
        resolve(result);
      }
    };

    timer = setTimeout(() => cleanup(false), timeoutMs);
    socket.once('connect', () => cleanup(true));
    socket.once('error', () => cleanup(false));
    socket.connect(port, host);
  });
}

export async function GET(req: NextRequest) {
  const rateLimitRes = await enforceRateLimit(req, {
    limit: 60,
    windowMs: 60_000,
    prefix: 'system:health',
  });
  if (rateLimitRes) return rateLimitRes;

  const url = new URL(req.url);
  const wantsDiagnostics = url.searchParams.get('diagnostics') === 'true';

  let user = null;
  if (wantsDiagnostics) {
    user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !user.roles.includes('admin') &&
      !hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) &&
      !hasPermission(user, PERMISSIONS.ADMIN_AUDIT_VIEW)
    ) {
      return forbiddenResponse();
    }
  }

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

  // 1a. Fast TCP Pre-flight Check with IPv4 fallback
  let dbHealth: ServiceHealth;
  let isTcpOpen = await checkTcpSocket(dbHost, dbPort, 1500);
  if (!isTcpOpen && dbHost === 'localhost') {
    isTcpOpen = await checkTcpSocket('127.0.0.1', dbPort, 1500);
    if (isTcpOpen) dbHost = '127.0.0.1';
  }

  if (!isTcpOpen) {
    dbHealth = {
      status: 'unreachable',
      name: 'Database',
    };
  } else {
    // 1b. Query check if TCP is open
    try {
      let timeoutHandle: NodeJS.Timeout | null = null;
      const dbCheckPromise = prisma.$queryRaw`SELECT 1 as healthy`;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('timeout')), 3000);
      });

      const dbStart = Date.now();
      await Promise.race([dbCheckPromise, timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      const latencyMs = Date.now() - dbStart;

      dbHealth = {
        status: 'healthy',
        name: 'Database',
        latencyMs,
      };
    } catch {
      dbHealth = {
        status: 'degraded',
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
  const overallStatus: 'ok' | 'degraded' = isReady && storageHealth.status === 'healthy' ? 'ok' : 'degraded';

  const responseHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  if (!wantsDiagnostics) {
    return NextResponse.json(
      {
        success: true,
        status: overallStatus,
        isReady,
        timestamp: new Date().toISOString(),
      },
      { status: isReady ? 200 : 503, headers: responseHeaders }
    );
  }

  const report: SystemHealthReport = {
    isReady,
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth,
      storage: storageHealth,
      ldap: ldapHealth,
    },
  };

  return NextResponse.json(
    {
      success: true,
      data: report,
    },
    { status: isReady ? 200 : 503, headers: responseHeaders }
  );
}
