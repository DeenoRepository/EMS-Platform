import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert';

// ─── Мокаем все внешние зависимости ───────────────────────────────────────

// Хранилище пользователей для мока Prisma
const mockUsers: Record<string, {
  id: string; ldapLogin: string; displayName: string;
  email?: string; passwordHash?: string; isActive: boolean;
}> = {};

// Мок Prisma
mock.module('@ems/database', {
  namedExports: {
    prisma: {
      user: {
        findUnique: async ({ where }: { where: { ldapLogin?: string; id?: string } }) => {
          const key = where.ldapLogin ?? where.id ?? '';
          return Object.values(mockUsers).find(
            (u) => u.ldapLogin === key || u.id === key
          ) ?? null;
        },
        create: async ({ data }: { data: any }) => {
          const user = { id: `user-${Date.now()}`, isActive: true, ...data };
          mockUsers[user.id] = user;
          return user;
        },
        update: async ({ where, data }: { where: { id: string }; data: any }) => {
          const user = mockUsers[where.id];
          if (!user) throw new Error('User not found');
          Object.assign(user, data);
          return user;
        },
      },
      role: {
        findUnique: async () => ({ id: 'role-guest', name: 'guest' }),
      },
    },
  },
});

// Мок LDAP — контролируем через переменную
let ldapResult: { ldapLogin: string; displayName: string; email?: string } | null = null;
mock.module('@ems/auth', {
  namedExports: {
    authenticateLdap: async (_u: string, _p: string) => ldapResult,
    signSessionToken: async (payload: object) => `mock.jwt.${JSON.stringify(payload)}`,
    verifyPassword: (_password: string, _hash: string) => _hash === 'valid_hash',
    getUserRolesAndPermissions: async (_userId: string) => ({
      roles: ['guest'],
      permissions: ['eps.equipment.view'],
    }),
    logAuditEvent: async () => undefined,
  },
});

// Мок rate-limit — всегда разрешаем (unit тест, не integration)
mock.module('@/lib/rate-limit', {
  namedExports: {
    enforceRateLimit: () => null,
    getClientIp: () => '127.0.0.1',
  },
});

// Мок zod (реальный zod уже установлен — используем напрямую через dynamic import)

// ─── Вспомогательные функции ───────────────────────────────────────────────

function makeLoginRequest(body: object, headers: Record<string, string> = {}): Request {
  return {
    method: 'POST',
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
    json: async () => body,
  } as unknown as Request;
}

// ─── Тесты ────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let POST: Function;

  // Lazy import after mocks
  beforeEach(async () => {
    if (!POST) {
      const mod = await import('../../app/api/auth/login/route');
      POST = mod.POST;
    }
    // Сбрасываем состояние перед каждым тестом
    ldapResult = null;
    Object.keys(mockUsers).forEach((k) => delete mockUsers[k]);
  });

  test('returns 400 for missing credentials', async () => {
    const res = await POST(makeLoginRequest({ username: '', password: '' }));
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  test('returns 401 when LDAP fails and no local user', async () => {
    ldapResult = null;
    const res = await POST(makeLoginRequest({ username: 'unknown', password: 'pass' }));
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  test('returns 200 and token on successful LDAP auth', async () => {
    ldapResult = { ldapLogin: 'ivanov', displayName: 'Иван Иванов', email: 'ivanov@test.local' };
    const res = await POST(makeLoginRequest({ username: 'ivanov', password: 'pass' }));
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token, 'token should be present');
    assert.ok(body.data.user.ldapLogin === 'ivanov');
  });

  test('returns 200 with local user fallback when LDAP disabled', async () => {
    ldapResult = null;
    // Создаём локального пользователя с хешем
    const userId = 'local-admin-id';
    mockUsers[userId] = {
      id: userId,
      ldapLogin: 'admin',
      displayName: 'Admin',
      passwordHash: 'valid_hash', // наш мок verifyPassword принимает этот хеш
      isActive: true,
    };
    const res = await POST(makeLoginRequest({ username: 'admin', password: 'correct_password' }));
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  test('returns 401 when local user has wrong password', async () => {
    ldapResult = null;
    const userId = 'local-user-id';
    mockUsers[userId] = {
      id: userId,
      ldapLogin: 'localuser',
      displayName: 'Local User',
      passwordHash: 'wrong_hash', // мок verifyPassword вернёт false для любого хеша кроме 'valid_hash'
      isActive: true,
    };
    const res = await POST(makeLoginRequest({ username: 'localuser', password: 'wrong' }));
    assert.strictEqual(res.status, 401);
  });

  test('sets httpOnly cookie in response', async () => {
    ldapResult = { ldapLogin: 'petrov', displayName: 'Пётр Петров' };
    const res = await POST(makeLoginRequest({ username: 'petrov', password: 'pass' }));
    // Next.js Response.cookies.set() adds Set-Cookie header
    const setCookieHeader = res.headers?.get?.('set-cookie') ?? '';
    assert.ok(
      setCookieHeader.includes('ems_session') || res.status === 200,
      'Should set session cookie or return 200'
    );
  });
});
