import { NextRequest, NextResponse } from 'next/server';

/**
 * rate-limit.ts — In-memory rate limiter for Next.js API routes.
 *
 * Архитектура: pluggable store.
 *
 * По умолчанию используется InMemoryStore — достаточно для единственного
 * инстанса (монолитный Docker-деплой).
 *
 * Для горизонтального масштабирования переключитесь на RedisStore:
 *
 * ```ts
 * // lib/rate-limit-store.ts
 * import { Redis } from 'ioredis';
 * import { RedisRateLimitStore } from '@/lib/rate-limit';
 *
 * const redis = new Redis(process.env.RATE_LIMIT_REDIS_URL!);
 * export const rateLimitStore = new RedisRateLimitStore(redis);
 * ```
 *
 * Затем передайте его в enforceRateLimit:
 * ```ts
 * import { rateLimitStore } from '@/lib/rate-limit-store';
 * enforceRateLimit(req, { limit: 10, windowMs: 60_000 }, undefined, rateLimitStore);
 * ```
 */

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface RateLimitStore {
  /** Инкрементирует счётчик для ключа и возвращает текущее значение + TTL. */
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  /** Сбрасывает счётчик (для тестов). */
  reset?(): void | Promise<void>;
}

// ---------------------------------------------------------------------------
// In-Memory Store (default, single-instance)
// ---------------------------------------------------------------------------

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitRecord>();

  constructor() {
    // Очистка устаревших записей каждые 5 минут
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
          if (record.resetAt <= now) {
            this.store.delete(key);
          }
        }
      }, 5 * 60 * 1000).unref?.();
    }
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || record.resetAt <= now) {
      const newRecord: RateLimitRecord = { count: 1, resetAt: now + windowMs };
      this.store.set(key, newRecord);
      return { count: 1, resetAt: newRecord.resetAt };
    }

    record.count += 1;
    return { count: record.count, resetAt: record.resetAt };
  }

  reset(): void {
    this.store.clear();
  }
}

// ---------------------------------------------------------------------------
// Redis Store (для горизонтального масштабирования)
// Раскомментируйте и установите ioredis: pnpm add ioredis
// ---------------------------------------------------------------------------
//
// import type { Redis } from 'ioredis';
//
// export class RedisRateLimitStore implements RateLimitStore {
//   constructor(private readonly redis: Redis) {}
//
//   async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
//     const pipeline = this.redis.pipeline();
//     pipeline.incr(key);
//     pipeline.pttl(key);
//     const [[, count], [, ttl]] = await pipeline.exec() as [[null, number], [null, number]];
//
//     const windowSec = Math.ceil(windowMs / 1000);
//     if (ttl === -1) {
//       await this.redis.expire(key, windowSec);
//     }
//
//     const resetAt = Date.now() + (ttl > 0 ? ttl : windowMs);
//     return { count, resetAt };
//   }
//
//   async reset(): Promise<void> {
//     await this.redis.flushdb();
//   }
// }

// ---------------------------------------------------------------------------
// Singleton default store
// ---------------------------------------------------------------------------

const defaultStore: RateLimitStore = new InMemoryRateLimitStore();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  /** Maximum number of allowed requests in the time window */
  limit: number;
  /** Window duration in milliseconds (default: 60,000ms = 1 minute) */
  windowMs?: number;
  /** Optional custom identifier prefix (e.g. 'login', 'reports') */
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

/**
 * Check rate limit for a specific identifier (IP address, user ID, or custom key).
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
  store: RateLimitStore = defaultStore
): Promise<RateLimitResult> {
  const windowMs = options.windowMs ?? 60 * 1000;
  const limit = options.limit;
  const key = `${options.prefix ?? 'rl'}:${identifier}`;

  const { count, resetAt } = await store.increment(key, windowMs);

  const remaining = Math.max(0, limit - count);
  const allowed = count <= limit;
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);

  return { allowed, limit, remaining, resetAt, retryAfterSeconds };
}

/**
 * Helper to extract client IP address from NextRequest.
 * Handles X-Forwarded-For (proxies/load balancers) and X-Real-IP (nginx).
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for may contain a comma-separated list; take the first (client) IP
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Apply rate limit check directly in route handler.
 * Returns NextResponse with 429 status if rate limit is exceeded, or null if allowed.
 */
export function enforceRateLimit(
  req: NextRequest,
  options: RateLimitOptions,
  customKey?: string,
  store?: RateLimitStore
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const identifier = customKey ? `${ip}:${customKey}` : ip;

  return checkRateLimit(identifier, options, store).then((result) => {
    if (!result.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Превышен лимит запросов. Повторите попытку через ${result.retryAfterSeconds} сек.`,
          retryAfter: result.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfterSeconds),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          },
        }
      );
    }
    return null;
  });
}

/**
 * Сбросить все счётчики rate limit (для тестов).
 * @internal
 */
export function _resetRateLimitStore(): void {
  (defaultStore as InMemoryRateLimitStore).reset?.();
}
