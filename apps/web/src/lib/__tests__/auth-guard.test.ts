import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getCurrentUser, isAdminUser, requireAuth, unauthorizedResponse, forbiddenResponse } from '../auth-guard';
import { signSessionToken } from '@ems/auth';
import { PERMISSIONS, JwtUserPayload } from '@ems/shared';
import type { NextRequest } from 'next/server';

// Обеспечиваем наличие JWT_SECRET для тестов
process.env.JWT_SECRET = process.env.JWT_SECRET || 'super_secret_test_jwt_key_32_characters_long_min';

function makeNextRequest(overrides: {
  method?: string;
  authHeader?: string;
  origin?: string;
  host?: string;
} = {}): NextRequest {
  const headers = new Headers();
  if (overrides.authHeader) headers.set('authorization', overrides.authHeader);
  if (overrides.origin) headers.set('origin', overrides.origin);
  if (overrides.host) headers.set('host', overrides.host);

  return {
    method: overrides.method || 'GET',
    headers,
  } as unknown as NextRequest;
}

const adminUser: JwtUserPayload = {
  userId: 'admin-id-123',
  ldapLogin: 'admin',
  displayName: 'Администратор Системы',
  roles: ['admin'],
  permissions: [],
};

const guestUser: JwtUserPayload = {
  userId: 'guest-id-456',
  ldapLogin: 'guest',
  displayName: 'Гостевой Пользователь',
  roles: ['guest'],
  permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW],
};

describe('auth-guard unit tests', () => {
  describe('getCurrentUser', () => {
    test('returns null when no token present', async () => {
      const req = makeNextRequest();
      const user = await getCurrentUser(req);
      assert.strictEqual(user, null);
    });

    test('returns user payload from valid Bearer token', async () => {
      const token = await signSessionToken(adminUser);
      const req = makeNextRequest({ authHeader: `Bearer ${token}` });
      const user = await getCurrentUser(req);
      assert.ok(user);
      assert.strictEqual(user.userId, adminUser.userId);
      assert.strictEqual(user.ldapLogin, adminUser.ldapLogin);
      assert.deepStrictEqual(user.roles, adminUser.roles);
    });

    test('returns null when Bearer token is malformed', async () => {
      const req = makeNextRequest({ authHeader: 'Bearer invalid.malformed.token' });
      const user = await getCurrentUser(req);
      assert.strictEqual(user, null);
    });
  });

  describe('unauthorizedResponse & forbiddenResponse', () => {
    test('unauthorizedResponse returns 401 with error message', async () => {
      const res = unauthorizedResponse('Требуется авторизация');
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error, 'Требуется авторизация');
    });

    test('forbiddenResponse returns 403 with error message', async () => {
      const res = forbiddenResponse('Недостаточно прав');
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error, 'Недостаточно прав');
    });
  });

  describe('isAdminUser', () => {
    test('returns true for the admin role', () => {
      assert.strictEqual(isAdminUser({ roles: ['admin'] }), true);
    });

    test('returns true for the administrator role', () => {
      assert.strictEqual(isAdminUser({ roles: ['administrator'] }), true);
    });

    test('returns false for a regular user', () => {
      assert.strictEqual(isAdminUser({ roles: ['guest'] }), false);
    });
  });

  describe('requireAuth', () => {
    test('returns errorResponse 401 when no user authenticated', async () => {
      const req = makeNextRequest({ method: 'GET' });
      const result = await requireAuth(req);
      assert.ok(result.errorResponse);
      assert.strictEqual(result.errorResponse.status, 401);
    });

    test('returns user when authenticated without specific permission check', async () => {
      const token = await signSessionToken(adminUser);
      const req = makeNextRequest({ authHeader: `Bearer ${token}`, method: 'GET' });
      const result = await requireAuth(req);
      assert.ok(result.user);
      assert.strictEqual(result.user.userId, adminUser.userId);
    });

    test('returns user when user has required permission', async () => {
      const token = await signSessionToken(guestUser);
      const req = makeNextRequest({ authHeader: `Bearer ${token}`, method: 'GET' });
      const result = await requireAuth(req, PERMISSIONS.EPS_EQUIPMENT_VIEW);
      assert.ok(result.user);
      assert.strictEqual(result.user.userId, guestUser.userId);
    });

    test('returns 403 when user lacks required permission', async () => {
      const token = await signSessionToken(guestUser);
      const req = makeNextRequest({ authHeader: `Bearer ${token}`, method: 'GET' });
      const result = await requireAuth(req, PERMISSIONS.ADMIN_USERS_MANAGE);
      assert.ok(result.errorResponse);
      assert.strictEqual(result.errorResponse.status, 403);
    });

    test('admin user bypasses permission checks', async () => {
      const token = await signSessionToken(adminUser);
      const req = makeNextRequest({ authHeader: `Bearer ${token}`, method: 'GET' });
      const result = await requireAuth(req, PERMISSIONS.ADMIN_USERS_MANAGE);
      assert.ok(result.user);
      assert.strictEqual(result.user.userId, adminUser.userId);
    });

    test('CSRF: blocks cross-origin mutating requests (POST)', async () => {
      const token = await signSessionToken(adminUser);
      const req = makeNextRequest({
        authHeader: `Bearer ${token}`,
        method: 'POST',
        origin: 'https://attacker.evil.com',
        host: 'ems.company.local',
      });
      const result = await requireAuth(req);
      assert.ok(result.errorResponse);
      assert.strictEqual(result.errorResponse.status, 403);
    });

    test('CSRF: allows same-origin mutating requests', async () => {
      const token = await signSessionToken(adminUser);
      const req = makeNextRequest({
        authHeader: `Bearer ${token}`,
        method: 'POST',
        origin: 'https://ems.company.local',
        host: 'ems.company.local',
      });
      const result = await requireAuth(req);
      assert.ok(result.user);
    });
  });
});
