import { test, describe, mock, before } from 'node:test';
import assert from 'node:assert';

// ─── Мокаем зависимости до импорта auth-guard ─────────────────────────────

// Мок @ems/auth — возвращаем заданный payload
let mockVerifyResult: object | null = null;
mock.module('@ems/auth', {
  namedExports: {
    verifySessionToken: async (_token: string) => mockVerifyResult,
    hasPermission: (user: { roles: string[]; permissions: string[] } | null, code: string) => {
      if (!user) return false;
      if (user.roles.includes('admin')) return true;
      return user.permissions.includes(code);
    },
    hasAnyPermission: (user: { roles: string[]; permissions: string[] } | null, codes: string[]) => {
      if (!user) return false;
      if (user.roles.includes('admin')) return true;
      return codes.some((c) => user.permissions.includes(c));
    },
  },
});

// Мок next/headers — возвращаем пустой cookieStore
mock.module('next/headers', {
  namedExports: {
    cookies: () => ({ get: (_name: string) => undefined }),
  },
});

// Мок @ems/shared
mock.module('@ems/shared', {
  namedExports: {
    PERMISSIONS: {
      EPS_EQUIPMENT_VIEW: 'eps.equipment.view',
      ADMIN_USERS_MANAGE: 'admin.users.manage',
    },
  },
});

// ─── Вспомогательные функции ───────────────────────────────────────────────

function makeReq(overrides: {
  method?: string;
  authHeader?: string;
  cookie?: string;
  origin?: string;
  host?: string;
} = {}): Request {
  return {
    method: overrides.method || 'GET',
    headers: {
      get: (name: string) => {
        if (name === 'authorization') return overrides.authHeader ?? null;
        if (name === 'origin') return overrides.origin ?? null;
        if (name === 'host') return overrides.host ?? 'localhost:3000';
        return null;
      },
    },
    cookies: {
      get: (_name: string) => overrides.cookie ? { value: overrides.cookie } : undefined,
    },
  } as unknown as Request;
}

const adminPayload = {
  userId: 'admin-id',
  ldapLogin: 'admin',
  displayName: 'Администратор',
  roles: ['admin'],
  permissions: [],
};

const guestPayload = {
  userId: 'guest-id',
  ldapLogin: 'guest',
  displayName: 'Гость',
  roles: ['guest'],
  permissions: ['eps.equipment.view'],
};

describe('auth-guard', () => {
  // Lazy import after mocks are set up
  let getCurrentUser: Function;
  let requireAuth: Function;
  let unauthorizedResponse: Function;
  let forbiddenResponse: Function;

  before(async () => {
    const mod = await import('../auth-guard');
    getCurrentUser = mod.getCurrentUser;
    requireAuth = mod.requireAuth;
    unauthorizedResponse = mod.unauthorizedResponse;
    forbiddenResponse = mod.forbiddenResponse;
  });

  describe('getCurrentUser', () => {
    test('returns null when no token present', async () => {
      mockVerifyResult = null;
      const result = await getCurrentUser(makeReq());
      assert.strictEqual(result, null);
    });

    test('returns user payload from valid Bearer token', async () => {
      mockVerifyResult = adminPayload;
      const result = await getCurrentUser(
        makeReq({ authHeader: 'Bearer valid.jwt.token' })
      );
      assert.deepStrictEqual(result, adminPayload);
    });

    test('returns null when verifySessionToken fails', async () => {
      mockVerifyResult = null;
      const result = await getCurrentUser(makeReq({ authHeader: 'Bearer bad-token' }));
      assert.strictEqual(result, null);
    });
  });

  describe('unauthorizedResponse', () => {
    test('returns 401 with default message', async () => {
      const res = unauthorizedResponse();
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.ok(body.error.length > 0);
    });

    test('returns 401 with custom message', async () => {
      const res = unauthorizedResponse('Пользовательское сообщение');
      const body = await res.json();
      assert.strictEqual(body.error, 'Пользовательское сообщение');
    });
  });

  describe('forbiddenResponse', () => {
    test('returns 403', async () => {
      const res = forbiddenResponse();
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });
  });

  describe('requireAuth', () => {
    test('returns errorResponse 401 when no user', async () => {
      mockVerifyResult = null;
      const result = await requireAuth(makeReq({ method: 'GET' }));
      assert.ok(result.errorResponse);
      assert.strictEqual(result.errorResponse.status, 401);
    });

    test('returns user when authenticated without permission check', async () => {
      mockVerifyResult = adminPayload;
      const result = await requireAuth(makeReq({ authHeader: 'Bearer valid.jwt.token', method: 'GET' }));
      assert.ok(result.user);
      assert.strictEqual(result.user.userId, adminPayload.userId);
    });

    test('returns user when authenticated and has required permission', async () => {
      mockVerifyResult = guestPayload;
      const result = await requireAuth(
        makeReq({ authHeader: 'Bearer valid', method: 'GET' }),
        'eps.equipment.view'
      );
      assert.ok(result.user);
    });

    test('returns 403 when user lacks required permission', async () => {
      mockVerifyResult = guestPayload;
      const result = await requireAuth(
        makeReq({ authHeader: 'Bearer valid', method: 'GET' }),
        'admin.users.manage'
      );
      assert.ok(result.errorResponse);
      assert.strictEqual(result.errorResponse.status, 403);
    });

    test('CSRF: blocks cross-origin POST requests', async () => {
      mockVerifyResult = adminPayload;
      const result = await requireAuth(
        makeReq({
          authHeader: 'Bearer valid',
          method: 'POST',
          origin: 'https://evil.com',
          host: 'ems.company.local',
        })
      );
      assert.ok(result.errorResponse);
      assert.strictEqual(result.errorResponse.status, 403);
    });

    test('CSRF: allows same-origin POST requests', async () => {
      mockVerifyResult = adminPayload;
      const result = await requireAuth(
        makeReq({
          authHeader: 'Bearer valid',
          method: 'POST',
          origin: 'http://ems.company.local',
          host: 'ems.company.local',
        })
      );
      assert.ok(result.user);
    });
  });
});
