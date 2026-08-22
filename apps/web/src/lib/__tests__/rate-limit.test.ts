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
    test('allows first request', () => {
      const result = checkRateLimit('test-ip-1', { limit: 3, windowMs: 60_000 });
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.remaining, 2);
      assert.strictEqual(result.limit, 3);
    });

    test('allows up to the limit', () => {
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit('test-ip-2', { limit: 3, windowMs: 60_000 });
        assert.strictEqual(result.allowed, true);
      }
    });

    test('blocks after exceeding the limit', () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit('test-ip-3', { limit: 3, windowMs: 60_000 });
      }
      const result = checkRateLimit('test-ip-3', { limit: 3, windowMs: 60_000 });
      assert.strictEqual(result.allowed, false);
      assert.strictEqual(result.remaining, 0);
    });

    test('different identifiers are tracked independently', () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit('ip-a', { limit: 3, windowMs: 60_000 });
      }
      // ip-a should be blocked
      assert.strictEqual(checkRateLimit('ip-a', { limit: 3, windowMs: 60_000 }).allowed, false);
      // ip-b should still be allowed
      assert.strictEqual(checkRateLimit('ip-b', { limit: 3, windowMs: 60_000 }).allowed, true);
    });

    test('prefix isolates separate rate limit buckets', () => {
      for (let i = 0; i < 2; i++) {
        checkRateLimit('shared-ip', { limit: 2, windowMs: 60_000, prefix: 'login' });
      }
      // login bucket exhausted
      assert.strictEqual(
        checkRateLimit('shared-ip', { limit: 2, windowMs: 60_000, prefix: 'login' }).allowed,
        false
      );
      // reports bucket is independent
      assert.strictEqual(
        checkRateLimit('shared-ip', { limit: 2, windowMs: 60_000, prefix: 'reports' }).allowed,
        true
      );
    });

    test('retryAfterSeconds is positive when blocked', () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit('test-ip-4', { limit: 3, windowMs: 60_000 });
      }
      const result = checkRateLimit('test-ip-4', { limit: 3, windowMs: 60_000 });
      assert.ok(result.retryAfterSeconds > 0);
    });

    test('window resets after TTL (simulated with short window)', async () => {
      checkRateLimit('test-ip-5', { limit: 1, windowMs: 50 });
      checkRateLimit('test-ip-5', { limit: 1, windowMs: 50 });
      // Now blocked
      assert.strictEqual(checkRateLimit('test-ip-5', { limit: 1, windowMs: 50 }).allowed, false);
      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Should be allowed again
      assert.strictEqual(checkRateLimit('test-ip-5', { limit: 1, windowMs: 50 }).allowed, true);
    });
  });

  describe('getClientIp', () => {
    test('reads IP from x-forwarded-for', () => {
      const req = makeRequest({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' });
      assert.strictEqual(getClientIp(req), '1.2.3.4');
    });

    test('reads IP from x-real-ip if no x-forwarded-for', () => {
      const req = makeRequest({ 'x-real-ip': '5.6.7.8' });
      assert.strictEqual(getClientIp(req), '5.6.7.8');
    });

    test('falls back to 127.0.0.1 if no IP headers', () => {
      const req = makeRequest({});
      assert.strictEqual(getClientIp(req), '127.0.0.1');
    });

    test('trims whitespace from x-forwarded-for', () => {
      const req = makeRequest({ 'x-forwarded-for': '  9.9.9.9 , 10.0.0.1' });
      assert.strictEqual(getClientIp(req), '9.9.9.9');
    });
  });
});
