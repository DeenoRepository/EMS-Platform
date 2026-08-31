import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { validateEnv } from '../env-validate';
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
    test('bounded MRO and WMS API logging batches use structured logger', () => {
      const routePaths = [
        'apps/web/src/app/api/mro/checklists/route.ts',
        'apps/web/src/app/api/mro/plans/route.ts',
        'apps/web/src/app/api/mro/schedules/route.ts',
        'apps/web/src/app/api/mro/schedules/[id]/route.ts',
        'apps/web/src/app/api/wms/categories/route.ts',
        'apps/web/src/app/api/wms/nomenclature/route.ts',
        'apps/web/src/app/api/wms/warehouses/route.ts',
        'apps/web/src/app/api/wms/operations/route.ts',
        // WMS detail/zones/inventories batch
        'apps/web/src/app/api/wms/warehouses/[id]/route.ts',
        'apps/web/src/app/api/wms/warehouses/[id]/zones/route.ts',
        'apps/web/src/app/api/wms/nomenclature/[id]/route.ts',
        'apps/web/src/app/api/wms/inventories/route.ts',
        'apps/web/src/app/api/wms/inventories/[id]/route.ts',
        // WMS stock/zones/cells batch
        'apps/web/src/app/api/wms/zones/[id]/route.ts',
        'apps/web/src/app/api/wms/zones/[id]/cells/route.ts',
        'apps/web/src/app/api/wms/stats/route.ts',
        'apps/web/src/app/api/wms/stock/route.ts',
        'apps/web/src/app/api/wms/stock/[id]/location/route.ts',
        'apps/web/src/app/api/wms/transfers/route.ts',
        // Feedback batch
        'apps/web/src/app/api/feedback/route.ts',
        'apps/web/src/app/api/feedback/[id]/route.ts',
        'apps/web/src/app/api/feedback/[id]/comments/route.ts',
        // SRM batch
        'apps/web/src/app/api/srm/sync/route.ts',
        'apps/web/src/app/api/srm/stats/route.ts',
        'apps/web/src/app/api/srm/issues/[id]/route.ts',
        'apps/web/src/app/api/srm/analytics/reliability/route.ts',
        // EPS batch
        'apps/web/src/app/api/eps/reports/generate/route.ts',
        'apps/web/src/app/api/eps/history/route.ts',
        'apps/web/src/app/api/eps/documents/[id]/route.ts',
        'apps/web/src/app/api/eps/custom-sections/route.ts',
        'apps/web/src/app/api/eps/custom-fields/route.ts',
        'apps/web/src/app/api/eps/approvals/[id]/route.ts',
        // Misc batch
        'apps/web/src/app/api/users/route.ts',
        'apps/web/src/app/api/setup/execute/route.ts',
      ];

      for (const routePath of routePaths) {
        const source = readRepositoryFile(routePath);
        assert.match(source, /from ['"]@\/lib\/logger['"]/, `${routePath} must import logger`);
        assert.doesNotMatch(source, /console\.error/, `${routePath} must not use console.error`);
      }
    });

    test('configured webhook secret cannot be bypassed by an absent token', () => {
      const source = readRepositoryFile('apps/web/src/app/api/srm/webhooks/[id]/route.ts');
      assert.match(source, /if\s*\(\s*!providedToken\s*\|\|\s*providedToken\s*!==\s*webhookAuth\.secret\s*\)/);
      assert.doesNotMatch(source, /if\s*\(\s*providedToken\s*&&\s*providedToken\s*!==\s*webhookAuth\.secret\s*\)/);
    });

    test('active integrations reject unsigned webhook configuration unless explicitly allowed', () => {
      const webhookSource = readRepositoryFile('apps/web/src/app/api/srm/webhooks/[id]/route.ts');
      const createSource = readRepositoryFile('apps/web/src/app/api/srm/integrations/route.ts');
      const updateSource = readRepositoryFile('apps/web/src/app/api/srm/integrations/[id]/route.ts');

      assert.match(webhookSource, /!webhookAuth\.secret\s*&&\s*!webhookAuth\.allowUnsigned/);
      assert.match(createSource, /Boolean\(isActive\)\s*&&\s*!hasSecureSrmWebhookAuth\(authConfig\)/);
      assert.match(updateSource, /resolvedIsActive\s*&&\s*!hasSecureSrmWebhookAuth\(resolvedAuthConfig\)/);
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
      const internalDbError = new Error('internal database failure');
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

  describe('Security Defaults and Hardcoded Credentials Prevention', () => {
    test('setup UI starts with empty password fields', () => {
      const source = readRepositoryFile('apps/web/src/app/setup/page.tsx');
      assert.match(source, /useState\(''\);\s*\/\/\s*dbPassword|const \[dbPassword, setDbPassword\] = useState\(''\)/);
      assert.match(source, /const \[adminPassword, setAdminPassword\] = useState\(''\)/);
      assert.match(source, /const \[ldapBindPassword, setLdapBindPassword\] = useState\(''\)/);
      assert.doesNotMatch(source, /const \[adminPassword, setAdminPassword\] = useState\('admin123'\)/);
      assert.doesNotMatch(source, /const \[dbPassword, setDbPassword\] = useState\('postgrespassword'\)/);
    });

    test('environment example does not ship a demo Jira token', () => {
      const envExample = readRepositoryFile('.env.example');
      assert.match(envExample, /^JIRA_API_TOKEN=REPLACE_WITH_JIRA_TOKEN$/m);
      assert.doesNotMatch(envExample, /^JIRA_API_TOKEN=adminpassword$/m);
    });

    test('environment validation rejects LDAP adminpassword defaults', () => {
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

    test('compose templates require secrets without committed fallback defaults', () => {
      const devCompose = readRepositoryFile('docker-compose.yml');
      const prodCompose = readRepositoryFile('docker-compose.prod.yml');
      const offlineCompose = readRepositoryFile('docker-compose.offline.yml');

      assert.match(devCompose, /^# EMS Platform — LOCAL DEVELOPMENT ONLY$/m);
      assert.match(devCompose, /NODE_ENV:\s*development/);
      assert.match(devCompose, /POSTGRES_PASSWORD:\s*\$\{POSTGRES_PASSWORD:\?/);
      assert.match(devCompose, /JWT_SECRET:\s*\$\{JWT_SECRET:\?/);
      assert.doesNotMatch(devCompose, /postgrespassword|adminpassword|8f7b2c9a1d4e6f3a5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90/);
      assert.match(prodCompose, /POSTGRES_PASSWORD:\s*\$\{POSTGRES_PASSWORD:\?/);
      assert.match(prodCompose, /JWT_SECRET:\s*\$\{JWT_SECRET:\?/);
      assert.match(offlineCompose, /POSTGRES_PASSWORD:\s*\$\{POSTGRES_PASSWORD:\?/);
      assert.match(offlineCompose, /JWT_SECRET:\s*\$\{JWT_SECRET:\?/);
    });

    test('reset-admin CLI enforces non-empty password and forbids hardcoded default', () => {
      const resetAdminSource = readRepositoryFile('packages/database/src/reset-admin.ts');
      assert.match(resetAdminSource, /process\.env\.ADMIN_PASSWORD\s*\|\|\s*process\.argv\[2\]/);
      assert.doesNotMatch(resetAdminSource, /hashPassword\('admin123'\)/);
    });

    test('files API endpoint performs authentication, traversal guard and object access check', () => {
      const filesRouteSource = readRepositoryFile('apps/web/src/app/api/files/[...path]/route.ts');
      assert.match(filesRouteSource, /getCurrentUser\(req\)/);
      assert.match(filesRouteSource, /normalizeStoredFilePath/);
      assert.match(filesRouteSource, /canReadStoredFile/);
      assert.match(filesRouteSource, /resolvedFullPath\.startsWith\(uploadRoot\)/);
    });

    test('production database schema paths use versioned migrations, not destructive db push', () => {
      // Regression guard for plans/done/2026-08/L2-prisma-migration-baseline.md:
      // db push --accept-data-loss silently drops/recreates columns on schema
      // changes and has no rollback plan. Every path that applies the schema
      // to a real (potentially non-empty) database must use `migrate deploy`.
      const productionPaths = [
        'apps/web/src/app/api/setup/execute/route.ts',
        'scripts/baremetal-install.sh',
        'scripts/baremetal-install.ps1',
        'scripts/ems-platform.service',
        'Dockerfile',
      ];

      for (const filePath of productionPaths) {
        const source = readRepositoryFile(filePath);
        // Strip full-line comments (#, //) so that explanatory prose referencing the
        // forbidden pattern (e.g. "not db push --accept-data-loss") doesn't trip the guard.
        const executableLines = source
          .split('\n')
          .filter((line) => !/^\s*(#|\/\/)/.test(line))
          .join('\n');

        assert.doesNotMatch(
          executableLines,
          /db push[^\n]*--accept-data-loss/,
          `${filePath} must not apply schema via 'db push --accept-data-loss'`
        );
        assert.match(
          executableLines,
          /migrate deploy/,
          `${filePath} must apply schema via 'prisma migrate deploy'`
        );
      }
    });

    test('startup paths do not suppress a failed migrate deploy', () => {
      // Regression guard for plans/active/L6-migration-failure-not-suppressed.md.
      // `migrate deploy` refuses (Prisma P3005) on a database created before the
      // migration baseline. That refusal is the whole point of L2 — swallowing it
      // with `|| true` starts the app against an unmigrated schema while the
      // healthcheck reports green. Installers are excluded on purpose: they must
      // continue and print baseline instructions instead of aborting.
      const startupPaths = ['Dockerfile', 'scripts/ems-platform.service'];

      for (const filePath of startupPaths) {
        const source = readRepositoryFile(filePath);
        const executableLines = source
          .split('\n')
          .filter((line) => !/^\s*#/.test(line))
          .join('\n');

        assert.doesNotMatch(
          executableLines,
          /migrate deploy[^\n]*\|\|\s*(true|:)/,
          `${filePath} must not swallow a failed 'migrate deploy' with '|| true'`
        );
        assert.doesNotMatch(
          executableLines,
          /^ExecStartPre=-/m,
          `${filePath} must not prefix the migration ExecStartPre with '-' (ignores failure)`
        );
      }
    });

    test('baseline migration exists and can build a fresh schema from scratch', () => {
      const migrationsDir = readRepositoryFile(
        'packages/database/prisma/migrations/migration_lock.toml'
      );
      assert.match(migrationsDir, /provider\s*=\s*"postgresql"/);

      const baselineMigration = readRepositoryFile(
        'packages/database/prisma/migrations/20260831030000_init/migration.sql'
      );
      assert.match(baselineMigration, /CREATE TABLE "User"/);
      assert.ok(baselineMigration.length > 1000, 'baseline migration must contain the full schema');
    });

    test('setup API endpoints guard against re-installation by non-admin users', () => {
      const setupExecSource = readRepositoryFile('apps/web/src/app/api/setup/execute/route.ts');
      const setupTestDbSource = readRepositoryFile('apps/web/src/app/api/setup/test-db/route.ts');
      const setupTestLdapSource = readRepositoryFile('apps/web/src/app/api/setup/test-ldap/route.ts');

      assert.match(setupExecSource, /fileInstalled[\s\S]*?!user\s*\|\|\s*!isAdminUser\(user\)/);
      assert.match(setupTestDbSource, /fileInstalled[\s\S]*?!user\s*\|\|\s*!isAdminUser\(user\)/);
      assert.match(setupTestLdapSource, /fileInstalled[\s\S]*?!user\s*\|\|\s*!isAdminUser\(user\)/);
    });

    test('server startup actually wires validateEnv() via instrumentation.ts under the nodejs runtime', () => {
      const instrumentationSource = readRepositoryFile('apps/web/src/instrumentation.ts');
      assert.match(instrumentationSource, /export\s+(async\s+)?function\s+register\s*\(/);
      assert.match(instrumentationSource, /NEXT_RUNTIME\s*===\s*['"]nodejs['"]/);
      assert.match(instrumentationSource, /import\(['"]@\/lib\/env-validate['"]\)/);
    });
  });
});
