import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import crypto from 'crypto';
import { prisma } from '@ems/database';
import { getCurrentUser } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/safe-error';

export const dynamic = 'force-dynamic';

export interface DependencyCheckItem {
  id: string;
  name: string;
  category: 'runtime' | 'database' | 'storage' | 'security' | 'system';
  isCritical: boolean;
  status: 'PASS' | 'WARN' | 'FAIL';
  currentValue: string;
  requiredValue: string;
  message?: string;
  troubleshooting?: string;
}

/**
 * Проверка доступности TCP-порта (например, PostgreSQL 5432)
 */
async function checkTcpPort(host: string, port: number, timeoutMs = 2500): Promise<{ reachable: boolean; latencyMs: number; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      const latencyMs = Date.now() - startTime;
      socket.destroy();
      resolve({ reachable: true, latencyMs });
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve({ reachable: false, latencyMs: timeoutMs, error: `Таймаут соединения (${timeoutMs} мс)` });
    });

    socket.once('error', (err: any) => {
      socket.destroy();
      resolve({ reachable: false, latencyMs: Date.now() - startTime, error: err.message || 'Ошибка соединения' });
    });

    socket.connect(port, host);
  });
}

/**
 * Проверка прав на запись и чтение в каталоге хранилища
 */
function checkStorageAccess(dirPath: string): { writable: boolean; error?: string } {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const testFile = path.join(dirPath, `.ems_perm_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.tmp`);
    fs.writeFileSync(testFile, 'EMS storage write verification check', 'utf8');
    const readContent = fs.readFileSync(testFile, 'utf8');
    if (readContent !== 'EMS storage write verification check') {
      return { writable: false, error: 'Ошибка верификации записанных данных в хранилище' };
    }
    fs.unlinkSync(testFile);
    return { writable: true };
  } catch (err: any) {
    return { writable: false, error: err.message || 'Нет прав на запись в каталог' };
  }
}

export async function GET(req: NextRequest) {
  const rateLimitRes = await enforceRateLimit(req, {
    limit: 30,
    windowMs: 60_000,
    prefix: 'setup:status',
  });
  if (rateLimitRes) return rateLimitRes;

  try {
    const rootDir = process.cwd();
    const installedFilePath = path.join(rootDir, '.installed');
    const rootInstalledFilePath = path.join(rootDir, '..', '..', '.installed');

    const fileExists = fs.existsSync(installedFilePath) || fs.existsSync(rootInstalledFilePath);

    let hasAdmin = false;
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
      hasAdmin = adminCount > 0;
    } catch {
      hasAdmin = false;
    }

    const isInstalled = fileExists || hasAdmin;

    // -------------------------------------------------------------------------
    // Комплексная проверка зависимостей и системных требований
    // -------------------------------------------------------------------------
    const checks: DependencyCheckItem[] = [];

    // 1. Node.js Runtime Version
    const nodeMajor = parseInt(process.versions.node.split('.')[0] || '0', 10);
    const isNodeValid = nodeMajor >= 18;
    checks.push({
      id: 'node_runtime',
      name: 'Среда выполнения Node.js',
      category: 'runtime',
      isCritical: true,
      status: isNodeValid ? 'PASS' : 'FAIL',
      currentValue: `v${process.versions.node}`,
      requiredValue: '>= v18.0.0 (рекомендуется v20+ / v22+)',
      message: isNodeValid ? 'Версия Node.js соответствует требованиям платформы' : 'Версия Node.js устарела и не поддерживается',
      troubleshooting: isNodeValid ? undefined : 'Обновите Node.js до версии 18 или выше с официального сайта nodejs.org.',
    });

    // 2. Storage Directory Write/Read Permissions
    const uploadDirPath = path.resolve(process.env.STORAGE_LOCAL_DIR || process.env.UPLOAD_DIR || path.join(rootDir, 'uploads'));
    const storageResult = checkStorageAccess(uploadDirPath);
    checks.push({
      id: 'storage_access',
      name: 'Файловое хранилище (Uploads)',
      category: 'storage',
      isCritical: true,
      status: storageResult.writable ? 'PASS' : 'FAIL',
      currentValue: storageResult.writable ? 'Доступно (Чтение/Запись)' : 'Заблокировано',
      requiredValue: 'Полный доступ на чтение и запись (RW)',
      message: storageResult.writable ? `Каталог ${uploadDirPath} готов к хранению файлов и чертежей` : `Ошибка доступа к директории: ${storageResult.error}`,
      troubleshooting: storageResult.writable ? undefined : `Предоставьте процессу права на запись в каталог: chmod -R 775 ${uploadDirPath} или создайте директорию вручную.`,
    });

    // 3. Cryptographic Subsystem & Entropy
    let isCryptoReady = false;
    try {
      const bytes = crypto.randomBytes(32);
      isCryptoReady = bytes && bytes.length === 32;
    } catch {
      isCryptoReady = false;
    }
    checks.push({
      id: 'crypto_subsystem',
      name: 'Криптографическая подсистема',
      category: 'security',
      isCritical: true,
      status: isCryptoReady ? 'PASS' : 'FAIL',
      currentValue: isCryptoReady ? 'Активна (CSPRNG готов)' : 'Сбой энтропии',
      requiredValue: 'Аппаратный / системный генератор псевдослучайных чисел',
      message: isCryptoReady ? 'Генерация JWT-токенов и хеширование паролей готовы к работе' : 'Криптографический модуль Node.js недоступен',
      troubleshooting: isCryptoReady ? undefined : 'Проверьте доступность OpenSSL / системного провайдера криптографии.',
    });

    // 4. PostgreSQL Database Reachability Check
    let dbHost = process.env.DB_HOST || '127.0.0.1';
    let dbPort = parseInt(process.env.DB_PORT || '5432', 10);
    if (process.env.DATABASE_URL) {
      try {
        const parsedUrl = new URL(process.env.DATABASE_URL);
        if (parsedUrl.hostname) dbHost = parsedUrl.hostname;
        if (parsedUrl.port) dbPort = parseInt(parsedUrl.port, 10);
      } catch {
        // ignore parse error
      }
    }

    const pgCheck = await checkTcpPort(dbHost, dbPort);
    checks.push({
      id: 'postgres_service',
      name: 'СУБД PostgreSQL',
      category: 'database',
      isCritical: true,
      status: pgCheck.reachable ? 'PASS' : 'FAIL',
      currentValue: pgCheck.reachable ? `Доступен (${dbHost}:${dbPort}, ${pgCheck.latencyMs} мс)` : `Недоступен (${dbHost}:${dbPort})`,
      requiredValue: 'Запущенная служба PostgreSQL v14+ / v15+ / v16+',
      message: pgCheck.reachable ? `Сетевой сокет PostgreSQL успешно отвечает (${pgCheck.latencyMs} мс)` : `Соединение отклонено или таймаут: ${pgCheck.error}`,
      troubleshooting: pgCheck.reachable
        ? undefined
        : `Запустите СУБД PostgreSQL: выполните 'docker compose up -d postgres' или запустите локальную службу PostgreSQL на порту ${dbPort}.`,
    });

    // 5. System Memory Check
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const freeMemMB = Math.round(freeMemBytes / 1024 / 1024);
    const totalMemMB = Math.round(totalMemBytes / 1024 / 1024);
    const isMemSufficient = freeMemMB >= 256;
    checks.push({
      id: 'system_memory',
      name: 'Оперативная память',
      category: 'system',
      isCritical: false,
      status: isMemSufficient ? 'PASS' : 'WARN',
      currentValue: `${freeMemMB} МБ свободно из ${totalMemMB} МБ`,
      requiredValue: 'Минимум 256 МБ свободной RAM',
      message: isMemSufficient ? 'Объем свободной памяти достаточен для работы' : 'Малый объем свободной памяти, возможны задержки',
      troubleshooting: isMemSufficient ? undefined : 'Освободите оперативную память перед высокой нагрузкой.',
    });

    // Overall critical status: all critical checks must be PASS
    const allCriticalPassed = checks.filter((c) => c.isCritical).every((c) => c.status === 'PASS');
    const failedCriticalChecks = checks.filter((c) => c.isCritical && c.status === 'FAIL');

    // Check if user is admin
    const currentUser = await getCurrentUser(req);
    const isAdmin = currentUser?.roles.includes('admin') || false;

    const systemInfo = isAdmin
      ? {
          nodeVersion: process.version,
          platform: `${os.type()} ${os.release()} (${os.arch()})`,
          totalMemory: `${Math.round(totalMemBytes / 1024 / 1024 / 1024)} GB`,
          freeMemory: `${Math.round(freeMemBytes / 1024 / 1024 / 1024)} GB`,
          cwd: rootDir,
          uptime: `${Math.round(process.uptime())} сек`,
          dbHost,
          dbPort,
          uploadDirPath,
        }
      : undefined;

    return NextResponse.json({
      success: true,
      data: {
        isInstalled,
        dependencies: {
          allCriticalPassed,
          failedCount: failedCriticalChecks.length,
          checks: isAdmin || !isInstalled ? checks : [],
        },
        systemInfo,
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка проверки статуса установки и зависимостей');
  }
}
