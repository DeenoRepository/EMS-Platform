/**
 * logger.ts — структурированный логгер для EMS Platform
 *
 * Лёгкая обёртка над console с JSON-выводом в продакшене и
 * читаемым форматом в development. Без внешних зависимостей.
 *
 * Использование:
 *   import { logger } from '@/lib/logger';
 *   logger.error('login failed', { userId, ip, reason });
 *   logger.info('equipment created', { equipmentId });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  requestId?: string;
  [key: string]: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function write(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };

  if (IS_PRODUCTION) {
    // Structured JSON for log aggregation tools
    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  } else {
    // Human-readable for development
    const prefix = {
      debug: '🔍 DEBUG',
      info:  '✅ INFO ',
      warn:  '⚠️  WARN ',
      error: '❌ ERROR',
    }[level];

    const metaStr = meta && Object.keys(meta).length > 0
      ? ' ' + JSON.stringify(meta)
      : '';

    const output = `[${entry.ts}] ${prefix} ${msg}${metaStr}`;
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(output);
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(output);
    } else {
      // eslint-disable-next-line no-console
      console.log(output);
    }
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => write('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => write('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
};

/**
 * Creates a child logger with a persistent requestId bound to all entries.
 * Use in API route handlers:
 *   const log = requestLogger(crypto.randomUUID());
 *   log.info('request received', { method, pathname });
 */
export function requestLogger(requestId: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => write('debug', msg, { requestId, ...meta }),
    info:  (msg: string, meta?: Record<string, unknown>) => write('info',  msg, { requestId, ...meta }),
    warn:  (msg: string, meta?: Record<string, unknown>) => write('warn',  msg, { requestId, ...meta }),
    error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, { requestId, ...meta }),
  };
}
