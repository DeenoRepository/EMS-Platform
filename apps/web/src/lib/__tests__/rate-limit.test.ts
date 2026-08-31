import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { checkRateLimit, getClientIp, _resetRateLimitStore } from '../../lib/rate-limit';
import type { NextRequest } from 'next/server';

// Мок NextRequest с нужными заголовками
function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  afterEach(() => {
    _resetRateLimitStore();
  });

  describe('checkRateLimit', () => {
    test('allows first request', async () => {
      const result = await checkRateLimit('test-ip-1', { limit: 3, windowMs: 60_000 });
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.remaining, 2);
      assert.strictEqual(result.limit, 3);
    });

    test('allows up to the limit', async () => {
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit('test-ip-2', { limit: 3, windowMs: 60_000 });
        assert.strictEqual(result.allowed, true);
      }
    });

    test('blocks after exceeding the limit', async () => {
      for (let i = 0; i < 3; i++) {
        await checkRateLimit('test-ip-3', { limit: 3, windowMs: 60_000 });
      }
      const result = await checkRateLimit('test-ip-3', { limit: 3, windowMs: 60_000 });
      assert.strictEqual(result.allowed, false);
      assert.strictEqual(result.remaining, 0);
    });

    test('different identifiers are tracked independently', async () => {
      for (let i = 0; i < 3; i++) {
        await checkRateLimit('ip-a', { limit: 3, windowMs: 60_000 });
      }
      // ip-a should be blocked
      const resA = await checkRateLimit('ip-a', { limit: 3, windowMs: 60_000 });
      assert.strictEqual(resA.allowed, false);
      // ip-b should still be allowed
      const resB = await checkRateLimit('ip-b', { limit: 3, windowMs: 60_000 });
      assert.strictEqual(resB.allowed, true);
    });

    test('prefix isolates separate rate limit buckets', async () => {
      for (let i = 0; i < 2; i++) {
        await checkRateLimit('shared-ip', { limit: 2, windowMs: 60_000, prefix: 'login' });
      }
      // login bucket exhausted
      const resLogin = await checkRateLimit('shared-ip', { limit: 2, windowMs: 60_000, prefix: 'login' });
      assert.strictEqual(resLogin.allowed, false);
      // reports bucket is independent
      const resReports = await checkRateLimit('shared-ip', { limit: 2, windowMs: 60_000, prefix: 'reports' });
      assert.strictEqual(resReports.allowed, true);
    });

    test('retryAfterSeconds is positive when blocked', async () => {
      for (let i = 0; i < 3; i++) {
        await checkRateLimit('test-ip-4', { limit: 3, windowMs: 60_000 });
      }
      const result = await checkRateLimit('test-ip-4', { limit: 3, windowMs: 60_000 });
      assert.ok(result.retryAfterSeconds > 0);
    });

    test('window resets after TTL (simulated with short window)', async () => {
      await checkRateLimit('test-ip-5', { limit: 1, windowMs: 50 });
      await checkRateLimit('test-ip-5', { limit: 1, windowMs: 50 });
      // Now blocked
      const resBlocked = await checkRateLimit('test-ip-5', { limit: 1, windowMs: 50 });
      assert.strictEqual(resBlocked.allowed, false);
      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Should be allowed again
      const resAllowed = await checkRateLimit('test-ip-5', { limit: 1, windowMs: 50 });
      assert.strictEqual(resAllowed.allowed, true);
    });
  });

  describe('getClientIp', () => {
    const originalTrustedProxyCount = process.env.TRUSTED_PROXY_COUNT;

    afterEach(() => {
      if (originalTrustedProxyCount === undefined) {
        delete process.env.TRUSTED_PROXY_COUNT;
      } else {
        process.env.TRUSTED_PROXY_COUNT = originalTrustedProxyCount;
      }
    });

    // Nginx использует proxy_add_x_forwarded_for: реальный peer дописывается
    // справа. При одном доверенном прокси (значение по умолчанию) доверять
    // можно только последнему элементу списка.
    test('takes the hop appended by the trusted proxy, not the client-supplied first entry', () => {
      const req = makeRequest({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' });
      assert.strictEqual(getClientIp(req), '10.0.0.1');
    });

    test('reads IP from x-real-ip if no x-forwarded-for', () => {
      const req = makeRequest({ 'x-real-ip': '5.6.7.8' });
      assert.strictEqual(getClientIp(req), '5.6.7.8');
    });

    test('falls back to 127.0.0.1 if no IP headers', () => {
      const req = makeRequest({});
      assert.strictEqual(getClientIp(req), '127.0.0.1');
    });

    test('trims whitespace around the trusted hop', () => {
      const req = makeRequest({ 'x-forwarded-for': '  9.9.9.9 ,  10.0.0.1  ' });
      assert.strictEqual(getClientIp(req), '10.0.0.1');
    });

    // Регрессия: спуфинг X-Forwarded-For не должен давать новый bucket.
    // До исправления брался первый элемент, поэтому произвольный префикс
    // обнулял счётчик и позволял неограниченный перебор паролей.
    test('a spoofed X-Forwarded-For prefix does not create a new rate limit bucket', async () => {
      const attackerHeaders = [
        '203.0.113.1, 10.0.0.1',
        '203.0.113.2, 10.0.0.1',
        '198.51.100.7, 203.0.113.9, 10.0.0.1',
      ];

      const identifiers = attackerHeaders.map((value) =>
        getClientIp(makeRequest({ 'x-forwarded-for': value }))
      );

      assert.deepStrictEqual(identifiers, ['10.0.0.1', '10.0.0.1', '10.0.0.1']);

      // Все три запроса делят один bucket, поэтому лимит 2 срабатывает.
      const results = [];
      for (const identifier of identifiers) {
        results.push(await checkRateLimit(identifier, { limit: 2, windowMs: 60_000, prefix: 'login' }));
      }
      assert.deepStrictEqual(
        results.map((r) => r.allowed),
        [true, true, false]
      );
    });

    test('an empty or whitespace-only X-Forwarded-For falls back to x-real-ip', () => {
      const req = makeRequest({ 'x-forwarded-for': '  ,  ', 'x-real-ip': '5.6.7.8' });
      assert.strictEqual(getClientIp(req), '5.6.7.8');
    });

    test('TRUSTED_PROXY_COUNT=0 ignores client-controlled headers entirely', () => {
      process.env.TRUSTED_PROXY_COUNT = '0';
      const req = makeRequest({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '5.6.7.8' });
      assert.strictEqual(getClientIp(req), '127.0.0.1');
    });

    test('TRUSTED_PROXY_COUNT=2 trusts the second hop from the right', () => {
      process.env.TRUSTED_PROXY_COUNT = '2';
      const req = makeRequest({ 'x-forwarded-for': '1.2.3.4, 203.0.113.5, 10.0.0.1' });
      assert.strictEqual(getClientIp(req), '203.0.113.5');
    });

    test('more trusted proxies than hops clamps to the leftmost entry', () => {
      process.env.TRUSTED_PROXY_COUNT = '5';
      const req = makeRequest({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' });
      assert.strictEqual(getClientIp(req), '203.0.113.5');
    });

    test('an invalid TRUSTED_PROXY_COUNT falls back to the single-proxy default', () => {
      process.env.TRUSTED_PROXY_COUNT = 'not-a-number';
      const req = makeRequest({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' });
      assert.strictEqual(getClientIp(req), '10.0.0.1');
    });
  });
});
