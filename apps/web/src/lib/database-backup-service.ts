import { spawn } from 'node:child_process';
import zlib from 'node:zlib';
import { prisma } from '@ems/database';
import { logger } from './logger';

export interface ParsedDbConfig {
  host: string;
  port: string;
  user: string;
  password?: string;
  database: string;
  schema?: string;
}

export type DumpMode = 'full' | 'data' | 'schema';

export interface DumpResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
  sizeBytes: number;
  mode: DumpMode;
  method: 'pg_dump' | 'prisma_fallback';
}

/**
 * Парсит строку подключения PostgreSQL
 */
export function parseDatabaseUrl(databaseUrl?: string): ParsedDbConfig {
  const urlStr = databaseUrl !== undefined ? databaseUrl : (process.env.DATABASE_URL || '');
  if (!urlStr) {
    throw new Error('Переменная окружения DATABASE_URL не задана');
  }

  const normalized = urlStr.replace(/^postgres:\/\//, 'postgresql://');
  const parsed = new URL(normalized);
  const schema = parsed.searchParams.get('schema') || 'public';

  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username || 'postgres'),
    password: decodeURIComponent(parsed.password || ''),
    database: parsed.pathname.replace(/^\//, '') || 'ems_platform',
    schema,
  };
}

/**
 * Снятие дампа через утилиту pg_dump
 */
async function dumpViaPgDump(config: ParsedDbConfig, mode: DumpMode): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      '-h', config.host,
      '-p', config.port,
      '-U', config.user,
      '-d', config.database,
      '--no-owner',
      '--no-privileges',
    ];

    if (config.schema) {
      args.push('-n', config.schema);
    }

    if (mode === 'data') {
      args.push('--data-only', '--inserts');
    } else if (mode === 'schema') {
      args.push('--schema-only');
    } else {
      // Full dump
      args.push('--clean', '--if-exists');
    }

    const env = {
      ...process.env,
      PGPASSWORD: config.password || '',
    };

    const child = spawn('pg_dump', args, { env });
    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];

    child.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => errorChunks.push(Buffer.from(chunk)));

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        const errMsg = Buffer.concat(errorChunks).toString('utf-8');
        reject(new Error(`pg_dump завершился с кодом ${code}: ${errMsg}`));
      }
    });
  });
}

/**
 * Резервный экспортер данных через Prisma (если pg_dump недоступен)
 */
async function dumpViaPrismaFallback(mode: DumpMode): Promise<Buffer> {
  const timestamp = new Date().toISOString();
  const header = `-- ==============================================================================
-- EMS Platform Database Export (Prisma Fallback)
-- Created: ${timestamp}
-- Mode: ${mode}
-- ==============================================================================
BEGIN;
`;

  const lines: string[] = [header];

  // Экспорт основных таблиц в виде транзакционного дампа
  const [
    users,
    roles,
    permissions,
    equipments,
    nomenclatures,
    warehouses,
    stockItems,
    stockTransfers,
    jiraIssues,
    feedbackTickets,
    systemSettings,
  ] = await Promise.all([
    prisma.user.findMany().catch(() => []),
    prisma.role.findMany().catch(() => []),
    prisma.permission.findMany().catch(() => []),
    prisma.equipment.findMany().catch(() => []),
    prisma.nomenclature.findMany().catch(() => []),
    prisma.warehouse.findMany().catch(() => []),
    prisma.stockItem.findMany().catch(() => []),
    prisma.stockTransfer.findMany().catch(() => []),
    prisma.jiraIssueCache.findMany().catch(() => []),
    prisma.feedbackTicket.findMany().catch(() => []),
    prisma.systemSetting.findMany().catch(() => []),
  ]);

  const dumpPayload = {
    metadata: {
      platform: 'EMS Platform',
      version: '1.0.0',
      exportedAt: timestamp,
      mode,
    },
    tables: {
      users,
      roles,
      permissions,
      equipments,
      nomenclatures,
      warehouses,
      stockItems,
      stockTransfers,
      jiraIssues,
      feedbackTickets,
      systemSettings,
    },
  };

  lines.push(`-- EXPORTED_JSON_PAYLOAD_START\n`);
  lines.push(JSON.stringify(dumpPayload, null, 2));
  lines.push(`\n-- EXPORTED_JSON_PAYLOAD_END\nCOMMIT;\n`);

  return Buffer.from(lines.join('\n'), 'utf-8');
}

/**
 * Создает сжатый Gzip дамп базы данных
 */
export async function createDatabaseBackup(mode: DumpMode = 'full'): Promise<DumpResult> {
  const config = parseDatabaseUrl();
  let sqlBuffer: Buffer;
  let method: 'pg_dump' | 'prisma_fallback' = 'pg_dump';

  try {
    sqlBuffer = await dumpViaPgDump(config, mode);
    logger.info(`Дамп БД успешно создан через pg_dump (режим: ${mode}, размер: ${sqlBuffer.length} байт)`);
  } catch (err) {
    logger.warn('Не удалось снять дамп через pg_dump, переключение на Prisma fallback экспорт', {
      error: err instanceof Error ? err.message : String(err),
    });
    sqlBuffer = await dumpViaPrismaFallback(mode);
    method = 'prisma_fallback';
  }

  // Сжатие в gzip
  const compressedBuffer = zlib.gzipSync(sqlBuffer, { level: 6 });
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `ems_db_${mode}_${dateStr}.sql.gz`;

  return {
    buffer: compressedBuffer,
    filename,
    contentType: 'application/gzip',
    sizeBytes: compressedBuffer.length,
    mode,
    method,
  };
}
