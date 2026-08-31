/**
 * N5 Wave 2: executable contracts for admin, maintenance, tag, permission,
 * and notification routes.
 *
 * Maintenance GET is intentionally public. Notification writes require an
 * authenticated user and scope updates by userId; they do not have a separate
 * permission-based 403 branch.
 */
import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { adminUser, makePrismaMock, makeRequest } from './helpers/route-harness';

const prismaMock = makePrismaMock();
let currentUser: JwtUserPayload | null = null;
let auditCalls = 0;
let notificationWhere: unknown = null;

const forbiddenUser: JwtUserPayload = {
  userId: 'forbidden-id',
  ldapLogin: 'forbidden',
  displayName: 'Forbidden',
  roles: ['viewer'],
  permissions: [],
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock } });
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, publicError: string) =>
      Response.json({ success: false, error: publicError }, { status: 500 }),
  },
});
mock.module('@/lib/system-settings-service', {
  namedExports: { invalidateSystemSettingsCache: () => {} },
});
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    unauthorizedResponse: () => Response.json({ success: false }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false }, { status: 403 }),
    isAdminUser: (user: JwtUserPayload) => user.roles.some((role) => role === 'admin' || role === 'administrator'),
  },
});
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: JwtUserPayload, permission: string) => user.permissions.includes(permission),
    logAuditEvent: async () => {
      auditCalls += 1;
    },
  },
});

interface RouteContext {
  params: Promise<{ id: string }>;
}
type Handler = (request: Request, context?: RouteContext) => Promise<Response>;

const handlers: Record<string, Handler> = {};

before(async () => {
  const roles = await import('@/app/api/admin/roles/route');
  const roleDetail = await import('@/app/api/admin/roles/[id]/route');
  const settings = await import('@/app/api/admin/settings/route');
  const maintenance = await import('@/app/api/system/maintenance/route');
  const tags = await import('@/app/api/eps/tags/route');
  const permissions = await import('@/app/api/admin/permissions/route');
  const notificationRead = await import('@/app/api/notifications/[id]/read/route');
  const notificationsReadAll = await import('@/app/api/notifications/read-all/route');

  handlers.rolesGET = roles.GET as unknown as Handler;
  handlers.rolesPOST = roles.POST as unknown as Handler;
  handlers.rolePATCH = roleDetail.PATCH as unknown as Handler;
  handlers.roleDELETE = roleDetail.DELETE as unknown as Handler;
  handlers.settingsGET = settings.GET as unknown as Handler;
  handlers.settingsPATCH = settings.PATCH as unknown as Handler;
  handlers.maintenanceGET = maintenance.GET as unknown as Handler;
  handlers.maintenancePATCH = maintenance.PATCH as unknown as Handler;
  handlers.tagsGET = tags.GET as unknown as Handler;
  handlers.tagsPOST = tags.POST as unknown as Handler;
  handlers.permissionsGET = permissions.GET as unknown as Handler;
  handlers.notificationPATCH = notificationRead.PATCH as unknown as Handler;
  handlers.notificationsPOST = notificationsReadAll.POST as unknown as Handler;
});

const context: RouteContext = { params: Promise.resolve({ id: 'role-1' }) };

beforeEach(() => {
  currentUser = null;
  auditCalls = 0;
  notificationWhere = null;
  prismaMock.role.findMany = async () => [];
  prismaMock.role.findUnique = async () => ({ id: 'role-1', name: 'operator', isSystem: false });
  prismaMock.role.create = async () => ({ id: 'role-1', name: 'operator', permissions: [] });
  prismaMock.role.update = async () => ({ id: 'role-1', displayName: 'Updated' });
  prismaMock.permission.findMany = async () => [];
  prismaMock.systemSetting.findMany = async () => [];
  prismaMock.systemSetting.findUnique = async () => null;
  prismaMock.tag.findMany = async () => [];
  prismaMock.tag.upsert = async () => ({ id: 'tag-1', name: 'Critical', color: 'error.main' });
  prismaMock.notification.updateMany = async (args?: unknown) => {
    notificationWhere = args;
    return { count: 1 };
  };
});

async function invoke(name: string, method: string, body?: unknown, withContext = false) {
  return handlers[name](
    makeRequest({ method, body, url: 'http://localhost:3000/api/test' }),
    withContext ? context : undefined,
  );
}

const protectedCases = [
  ['rolesGET', 'GET', undefined, false],
  ['rolesPOST', 'POST', { name: 'operator', displayName: 'Operator' }, false],
  ['rolePATCH', 'PATCH', { displayName: 'Updated' }, true],
  ['roleDELETE', 'DELETE', undefined, true],
  ['settingsGET', 'GET', undefined, false],
  ['settingsPATCH', 'PATCH', { APP_NAME: 'EMS Test' }, false],
  ['maintenancePATCH', 'PATCH', { system: { enabled: true } }, false],
  ['tagsGET', 'GET', undefined, false],
  ['tagsPOST', 'POST', { name: 'Critical', color: 'error.main' }, false],
  ['permissionsGET', 'GET', undefined, false],
] as const;

describe('admin and system protected route contracts', () => {
  for (const [name, method, body, withContext] of protectedCases) {
    test(`${name} returns 401 anonymously`, async () => {
      const response = await invoke(name, method, body, withContext);
      assert.equal(response.status, 401);
    });

    test(`${name} returns 403 without required permission`, async () => {
      currentUser = forbiddenUser;
      const response = await invoke(name, method, body, withContext);
      assert.equal(response.status, 403);
    });

    test(`${name} returns 2xx for an administrator`, async () => {
      currentUser = adminUser;
      if (name === 'rolesPOST') prismaMock.role.findUnique = async () => null;
      const response = await invoke(name, method, body, withContext);
      assert.ok(response.status >= 200 && response.status < 300, `${name}: ${response.status}`);
    });
  }

  test('maintenance GET is intentionally public', async () => {
    const response = await invoke('maintenanceGET', 'GET');
    const body = (await response.json()) as { success: boolean; data: { system: { enabled: boolean } } };
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.system.enabled, false);
  });
});

describe('write input validation', () => {
  test('role creation rejects missing required fields with 400', async () => {
    currentUser = adminUser;
    const response = await invoke('rolesPOST', 'POST', {});
    assert.equal(response.status, 400);
    assert.equal(auditCalls, 0);
  });

  test('maintenance update rejects malformed enabled flag with 400', async () => {
    currentUser = adminUser;
    const response = await invoke('maintenancePATCH', 'PATCH', { system: { enabled: 'yes' } });
    assert.equal(response.status, 400);
    assert.equal(auditCalls, 0);
  });

  test('tag creation rejects a missing name with 400', async () => {
    currentUser = adminUser;
    const response = await invoke('tagsPOST', 'POST', { color: 'primary.main' });
    assert.equal(response.status, 400);
  });
});

describe('notification ownership-scoped writes', () => {
  test('single-notification PATCH returns 401 anonymously', async () => {
    const response = await invoke('notificationPATCH', 'PATCH', undefined, true);
    assert.equal(response.status, 401);
  });

  test('single-notification PATCH succeeds and scopes update by authenticated user', async () => {
    currentUser = forbiddenUser;
    const response = await invoke('notificationPATCH', 'PATCH', undefined, true);
    assert.equal(response.status, 200);
    assert.match(JSON.stringify(notificationWhere), /forbidden-id/);
  });

  test('read-all POST returns 401 anonymously', async () => {
    const response = await invoke('notificationsPOST', 'POST');
    assert.equal(response.status, 401);
  });

  test('read-all POST succeeds and scopes update by authenticated user', async () => {
    currentUser = forbiddenUser;
    const response = await invoke('notificationsPOST', 'POST');
    assert.equal(response.status, 200);
    assert.match(JSON.stringify(notificationWhere), /forbidden-id/);
  });

  test('suite never opens a real database connection', () => {
    assert.equal(prismaMock._connectionAttempts(), 0);
  });
});
