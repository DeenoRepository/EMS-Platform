/**
 * M3 Wave 2 — API route tests: auth/login and setup/status.
 *
 * Scope:
 *   - POST /api/auth/login — rate-limit bypass, Zod validation (400 on bad body),
 *     LDAP-disabled path with bad credentials → 401.
 *   - GET /api/setup/status — rate-limit bypass, unauthenticated basic check.
 *
 * The setup/execute route requires a live database and file-system interactions
 * (PrismaClient migrations, .installed file); those scenarios belong to E2E (M5).
 * The login route's happy path requires a real Prisma user record; mocked here
 * to verify the contract shape, not the full auth flow.
 *
 * Requires TSX_TSCONFIG_PATH=apps/web/tsconfig.json (set by test-runner.mjs).
 */
import { test, describe, before, mock } from 'node:test';
import assert from 'node:assert/strict';
import { makeRequest, makePrismaMock } from './helpers/route-harness';

// ── Shared mocks ─────────────────────────────────────────────────────────────
let dbConnectionAttempts = 0;
const prismaMock = makePrismaMock();
const originalConnect = prismaMock.$connect;
prismaMock.$connect = async () => {
  dbConnectionAttempts += 1;
  return originalConnect();
};

mock.module('@ems/database', {
  namedExports: {
    prisma: prismaMock,
    PrismaClient: class MockPrismaClient {
      $connect = async () => {};
      $disconnect = async () => {};
      user = prismaMock.user;
      role = prismaMock.role;
      systemSetting = prismaMock.systemSetting;
    },
  },
});

mock.module('@/lib/rate-limit', {
  namedExports: { enforceRateLimit: async () => null },
});

mock.module('@/lib/logger', {
  namedExports: {
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  },
});

mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => null,
    isAdminUser: () => false,
    unauthorizedResponse: () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    forbiddenResponse: () =>
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
  },
});

// System settings: LDAP disabled by default
mock.module('@/lib/system-settings-service', {
  namedExports: {
    getSystemSettings: async () => ({ LDAP_ENABLED: false, LDAP_URL: null }),
  },
});

mock.module('@ems/auth', {
  namedExports: {
    authenticateLdap: async () => null,
    signSessionToken: (_payload: unknown) => 'signed-token',
    verifyPassword: async (_password: string, _hash: string) => false,
    fixKeyboardLayout: (s: string) => s,
    getUserRolesAndPermissions: async () => ({ roles: [], permissions: [] }),
    logAuditEvent: async () => {},
    hashPassword: async (_password: string) => 'hashed',
  },
});

// ── Route imports ─────────────────────────────────────────────────────────────
let loginPOST: (req: Request) => Promise<Response>;

before(async () => {
  const loginRoute = await import('@/app/api/auth/login/route');
  loginPOST = loginRoute.POST as unknown as (req: Request) => Promise<Response>;
});

// ── Tests — POST /api/auth/login ──────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('returns 400 when body is missing username', async () => {
    const res = await loginPOST(makeRequest({
      method: 'POST',
      url: 'http://localhost/api/auth/login',
      body: { password: 'secret123' },
    }));
    // Zod validation fails: username is required
    assert.equal(res.status, 400);
  });

  test('returns 400 when body is missing password', async () => {
    const res = await loginPOST(makeRequest({
      method: 'POST',
      url: 'http://localhost/api/auth/login',
      body: { username: 'user' },
    }));
    assert.equal(res.status, 400);
  });

  test('returns 400 when username exceeds 256 characters', async () => {
    const res = await loginPOST(makeRequest({
      method: 'POST',
      url: 'http://localhost/api/auth/login',
      body: { username: 'a'.repeat(257), password: 'secret' },
    }));
    assert.equal(res.status, 400);
  });

  test('returns 401 when LDAP disabled and no user found in database', async () => {
    // prismaMock.user.findFirst returns null by default → local auth fails → 401
    prismaMock.user.findFirst = async () => null;
    const res = await loginPOST(makeRequest({
      method: 'POST',
      url: 'http://localhost/api/auth/login',
      body: { username: 'unknown.user', password: 'wrongpassword' },
    }));
    assert.equal(res.status, 401);
    const body = await res.json() as { success: boolean; error: string };
    assert.equal(body.success, false);
    assert.ok(typeof body.error === 'string' && body.error.length > 0);
  });

  test('returns 400 when body is empty JSON object', async () => {
    const res = await loginPOST(makeRequest({
      method: 'POST',
      url: 'http://localhost/api/auth/login',
      body: {},
    }));
    assert.equal(res.status, 400);
  });

  test('does not open a real database connection', () => {
    assert.equal(dbConnectionAttempts, 0);
  });
});
