import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { enforceRateLimit, _resetRateLimitStore } from '../rate-limit';
import { safeErrorResponse, toSafeErrorDetails } from '../safe-error';

const repositoryRoot = path.resolve(process.cwd());

function readRepositoryFile(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

describe('API Security and Hardening Regressions', () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  describe('Rate Limiting Matrix', () => {
    test('enforces rate limit and returns 429 when quota is exceeded', async () => {
      const createReq = () =>
        new NextRequest('http://localhost:3000/api/eps/import/analyze', {
          method: 'POST',
          headers: { 'x-forwarded-for': '198.51.100.1' },
        });

      // 5 requests within limit of 5
      for (let i = 0; i < 5; i++) {
        const res = await enforceRateLimit(createReq(), { limit: 5, windowMs: 60_000, prefix: 'test-matrix' });
        assert.equal(res, null);
      }

      // 6th request is rejected with 429
      const blockedRes = await enforceRateLimit(createReq(), { limit: 5, windowMs: 60_000, prefix: 'test-matrix' });
      assert.ok(blockedRes);
      assert.equal(blockedRes.status, 429);
      assert.equal(blockedRes.headers.get('Retry-After'), '60');
      assert.equal(blockedRes.headers.get('X-RateLimit-Remaining'), '0');

      const body = await blockedRes.json();
      assert.equal(body.success, false);
      assert.ok(body.error.includes('Превышен лимит запросов'));
    });

    test('different prefixes do not share quota', async () => {
      const req = new NextRequest('http://localhost:3000/api/setup/status', {
        headers: { 'x-forwarded-for': '198.51.100.2' },
      });

      // Exhaust prefix A
      for (let i = 0; i < 2; i++) {
        await enforceRateLimit(req, { limit: 2, windowMs: 60_000, prefix: 'prefixA' });
      }
      const blockedA = await enforceRateLimit(req, { limit: 2, windowMs: 60_000, prefix: 'prefixA' });
      assert.ok(blockedA);
      assert.equal(blockedA.status, 429);

      // Prefix B still has quota
      const allowedB = await enforceRateLimit(req, { limit: 2, windowMs: 60_000, prefix: 'prefixB' });
      assert.equal(allowedB, null);
    });

    test('custom identifier isolates keys per user/tenant', async () => {
      const req = new NextRequest('http://localhost:3000/api/srm/webhooks/int-1', {
        headers: { 'x-forwarded-for': '198.51.100.3' },
      });

      // Exhaust integration 1
      for (let i = 0; i < 2; i++) {
        await enforceRateLimit(req, { limit: 2, windowMs: 60_000, prefix: 'webhook' }, 'integration-1');
      }
      const blocked1 = await enforceRateLimit(req, { limit: 2, windowMs: 60_000, prefix: 'webhook' }, 'integration-1');
      assert.ok(blocked1);

      // Integration 2 is unaffected
      const allowed2 = await enforceRateLimit(req, { limit: 2, windowMs: 60_000, prefix: 'webhook' }, 'integration-2');
      assert.equal(allowed2, null);
    });
    test('all sensitive endpoint handlers enforce endpoint-specific rate limits', () => {
      const sensitiveRoutes = [
        'apps/web/src/app/api/auth/login/route.ts',
        'apps/web/src/app/api/auth/logout/route.ts',
        'apps/web/src/app/api/auth/me/route.ts',
        'apps/web/src/app/api/setup/execute/route.ts',
        'apps/web/src/app/api/setup/test-db/route.ts',
        'apps/web/src/app/api/setup/test-ldap/route.ts',
        'apps/web/src/app/api/setup/status/route.ts',
        'apps/web/src/app/api/eps/import/analyze/route.ts',
        'apps/web/src/app/api/eps/import/execute/route.ts',
        'apps/web/src/app/api/eps/import/template/route.ts',
        'apps/web/src/app/api/eps/reports/generate/route.ts',
        'apps/web/src/app/api/eps/reports/templates/route.ts',
        'apps/web/src/app/api/eps/reports/templates/[id]/route.ts',
      ];

      for (const routePath of sensitiveRoutes) {
        const source = readRepositoryFile(routePath);
        assert.match(source, /enforceRateLimit\s*\(/, `${routePath} must call enforceRateLimit()`);
      }
    });
  });

  describe('Route Security Policy', () => {
    test('configured webhook secret cannot be bypassed by an absent token', () => {
      const source = readRepositoryFile('apps/web/src/app/api/srm/webhooks/[id]/route.ts');
      assert.match(source, /if\s*\(\s*!providedToken\s*\|\|\s*providedToken\s*!==\s*webhookSecret\s*\)/);
      assert.doesNotMatch(source, /if\s*\(\s*providedToken\s*&&\s*providedToken\s*!==\s*webhookSecret\s*\)/);
    });

    test('module status handlers require administrative permission', () => {
      const source = readRepositoryFile('apps/web/src/app/api/modules/status/route.ts');
      const permissionChecks = source.match(/hasPermission\(user,\s*PERMISSIONS\.ADMIN_SETTINGS_MANAGE\)/g) ?? [];
      assert.equal(permissionChecks.length, 2, 'GET and PATCH must both enforce ADMIN_SETTINGS_MANAGE');
    });

    test('known 5xx handlers use sanitized error responses', () => {
      const sanitizedRoutes = [
        'apps/web/src/app/api/modules/status/route.ts',
        'apps/web/src/app/api/setup/execute/route.ts',
        'apps/web/src/app/api/wms/operations/route.ts',
        'apps/web/src/app/api/wms/transfers/route.ts',
        'apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts',
        'apps/web/src/app/api/wms/transfers/[id]/receive/route.ts',
        'apps/web/src/app/api/wms/transfers/[id]/reject/route.ts',
        'apps/web/src/app/api/eps/equipment/[id]/documents/route.ts',
        'apps/web/src/app/api/eps/equipment/[id]/photos/route.ts',
        'apps/web/src/app/api/srm/issues/[id]/create-mro-order/route.ts',
        'apps/web/src/app/api/admin/users/route.ts',
      ];

      for (const routePath of sanitizedRoutes) {
        const source = readRepositoryFile(routePath);
        assert.match(source, /safeErrorResponse\s*\(/, `${routePath} must use safeErrorResponse()`);
        assert.doesNotMatch(source, /error\s*:\s*error\.message/, `${routePath} must not expose error.message`);
      }
    });
  });

  describe('Safe Error Sanitization in 5xx responses', () => {
    test('does not leak database host, password or internal stack traces', async () => {
      const internalDbError = new Error('FATAL: password authentication failed for user "postgres" at host 10.0.0.5:5432');
      const response = safeErrorResponse(internalDbError, 'Ошибка базы данных', 500);

      assert.equal(response.status, 500);
      const json = await response.json();
      assert.equal(json.success, false);
      assert.equal(json.error, 'Ошибка базы данных');
      assert.ok(json.correlationId);
      assert.equal(json.details, undefined);
      assert.equal(JSON.stringify(json).includes('postgres'), false);
      assert.equal(JSON.stringify(json).includes('10.0.0.5'), false);
    });

    test('toSafeErrorDetails extracts message safely without mutation', () => {
      const err = new Error('private stack trace details');
      const details = toSafeErrorDetails(err, 'Стабильное сообщение');

      assert.equal(details.publicError, 'Стабильное сообщение');
      assert.equal(details.logMessage, 'private stack trace details');
      assert.ok(details.correlationId);
    });
  });
});
