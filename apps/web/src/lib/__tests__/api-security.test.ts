import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { validateEnv } from '../env-validate';
import { enforceRateLimit, _resetRateLimitStore } from '../rate-limit';
import { safeErrorResponse, toSafeErrorDetails } from '../safe-error';

describe('API Security and Hardening Regressions', () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  describe('Rate Limiting Matrix', () => {
    test('enforces rate limit and returns 429 when quota is exceeded', async () => {
      const createRequest = () =>
        new NextRequest('http://localhost:3000/api/eps/import/analyze', {
          method: 'POST',
          headers: { 'x-forwarded-for': '198.51.100.1' },
        });

      for (let index = 0; index < 5; index += 1) {
        const response = await enforceRateLimit(createRequest(), {
          limit: 5,
          windowMs: 60_000,
          prefix: 'test-matrix',
        });
        assert.equal(response, null);
      }

      const blockedResponse = await enforceRateLimit(createRequest(), {
        limit: 5,
        windowMs: 60_000,
        prefix: 'test-matrix',
      });

      assert.ok(blockedResponse);
      assert.equal(blockedResponse.status, 429);
      assert.equal(blockedResponse.headers.get('Retry-After'), '60');
      assert.equal(blockedResponse.headers.get('X-RateLimit-Remaining'), '0');
      const body = await blockedResponse.json();
      assert.equal(body.success, false);
      assert.ok(body.error.includes('Превышен лимит запросов'));
    });

    test('different prefixes do not share quota', async () => {
      const request = new NextRequest('http://localhost:3000/api/setup/status', {
        headers: { 'x-forwarded-for': '198.51.100.2' },
      });

      for (let index = 0; index < 2; index += 1) {
        await enforceRateLimit(request, { limit: 2, windowMs: 60_000, prefix: 'prefixA' });
      }

      const blockedA = await enforceRateLimit(request, {
        limit: 2,
        windowMs: 60_000,
        prefix: 'prefixA',
      });
      const allowedB = await enforceRateLimit(request, {
        limit: 2,
        windowMs: 60_000,
        prefix: 'prefixB',
      });

      assert.ok(blockedA);
      assert.equal(blockedA.status, 429);
      assert.equal(allowedB, null);
    });

    test('custom identifier isolates keys per user or tenant', async () => {
      const request = new NextRequest('http://localhost:3000/api/srm/webhooks/int-1', {
        headers: { 'x-forwarded-for': '198.51.100.3' },
      });

      for (let index = 0; index < 2; index += 1) {
        await enforceRateLimit(
          request,
          { limit: 2, windowMs: 60_000, prefix: 'webhook' },
          'integration-1',
        );
      }

      const blocked = await enforceRateLimit(
        request,
        { limit: 2, windowMs: 60_000, prefix: 'webhook' },
        'integration-1',
      );
      const allowed = await enforceRateLimit(
        request,
        { limit: 2, windowMs: 60_000, prefix: 'webhook' },
        'integration-2',
      );

      assert.ok(blocked);
      assert.equal(blocked.status, 429);
      assert.equal(allowed, null);
    });
  });

  describe('Safe Error Sanitization in 5xx responses', () => {
    test('does not leak database details or internal stack traces', async () => {
      const response = safeErrorResponse(
        new Error('internal database failure'),
        'Ошибка базы данных',
        500,
      );

      assert.equal(response.status, 500);
      const json = await response.json();
      assert.equal(json.success, false);
      assert.equal(json.error, 'Ошибка базы данных');
      assert.ok(json.correlationId);
      assert.equal(json.details, undefined);
      assert.equal(JSON.stringify(json).includes('postgres'), false);
      assert.equal(JSON.stringify(json).includes('10.0.0.5'), false);
    });

    test('toSafeErrorDetails preserves private details only for logging', () => {
      const error = new Error('private stack trace details');
      const details = toSafeErrorDetails(error, 'Стабильное сообщение');

      assert.equal(details.publicError, 'Стабильное сообщение');
      assert.equal(details.logMessage, 'private stack trace details');
      assert.ok(details.correlationId);
    });
  });

  describe('Environment validation', () => {
    test('rejects LDAP adminpassword defaults', () => {
      const originalEnv = { ...process.env };

      try {
        process.env.JWT_SECRET = 'secure_test_jwt_secret_with_at_least_32_chars';
        process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';
        process.env.LDAP_ENABLED = 'true';
        process.env.LDAP_BIND_PASSWORD = 'adminpassword';
        delete process.env.LDAP_ADMIN_PASSWORD;

        assert.throws(() => validateEnv(true), /LDAP_BIND_PASSWORD.*небезопасное значение/);

        process.env.LDAP_BIND_PASSWORD = 'secure-bind-password';
        process.env.LDAP_ADMIN_PASSWORD = 'adminpassword';
        assert.throws(() => validateEnv(true), /LDAP_ADMIN_PASSWORD.*небезопасное значение/);
      } finally {
        process.env = originalEnv;
      }
    });
  });
});
