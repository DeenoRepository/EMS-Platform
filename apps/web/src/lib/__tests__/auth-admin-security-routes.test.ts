import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { adminUser, makePrismaMock, makeRequest } from './helpers/route-harness';

const prismaMock = makePrismaMock() as ReturnType<typeof makePrismaMock> & {
  userRole: {
    deleteMany: (args: unknown) => Promise<{ count: number }>;
    createMany: (args: unknown) => Promise<{ count: number }>;
  };
};

prismaMock.userRole = {
  deleteMany: async () => ({ count: 1 }),
  createMany: async () => ({ count: 1 }),
};

let currentUser: JwtUserPayload | null = null;
let auditEvents: unknown[] = [];
const allAuditEvents: unknown[] = [];
let userFindUniqueResult: any = null;
let userFindManyResult: any[] = [];
let auditItems: any[] = [];
let auditTotal = 0;
let auditWhere: unknown = null;
let auditQuery: unknown = null;
let backupCalls: string[] = [];
let backupFailure: Error | null = null;
let auditFailure: Error | null = null;

mock.module('@ems/database', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/rate-limit', {
  namedExports: {
    enforceRateLimit: async () => null,
    getClientIp: () => '127.0.0.1',
  },
});

mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async (req?: Request) =>
      req?.headers.get('x-test-authenticated') === 'true' ? viewer : currentUser,
    unauthorizedResponse: () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false, error: 'Forbidden' }, { status: 403 }),
  },
});

mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, message: string) =>
      Response.json({ success: false, error: message }, { status: 500 }),
  },
});

mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: JwtUserPayload, permission: string) => user.permissions.includes(permission),
    getUserRolesAndPermissions: async () => ({
      roles: ['admin'],
      permissions: [PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.ADMIN_AUDIT_VIEW, PERMISSIONS.ADMIN_SETTINGS_MANAGE],
    }),
    logAuditEvent: async (event: unknown) => {
      if (auditFailure) throw auditFailure;
      auditEvents.push(event);
      allAuditEvents.push(event);
    },
  },
});

mock.module('@/lib/database-backup-service', {
  namedExports: {
    createDatabaseBackup: async (mode: string) => {
      backupCalls.push(mode);
      if (backupFailure) throw backupFailure;
      return {
        buffer: Buffer.from('backup-data'),
        filename: `ems-${mode}.sql`,
        sizeBytes: 11,
        contentType: 'application/sql',
        method: 'pg_dump',
      };
    },
  },
});

interface RouteContext {
  params: Promise<{ id: string }>;
}
type Handler = (request: Request, context?: RouteContext) => Promise<Response>;

const handlers: Record<string, Handler> = {};

before(async () => {
  const me = await import('@/app/api/auth/me/route');
  const logout = await import('@/app/api/auth/logout/route');
  const users = await import('@/app/api/admin/users/route');
  const audit = await import('@/app/api/admin/audit-log/route');
  const dump = await import('@/app/api/admin/database/dump/route');

  handlers.meGET = me.GET as unknown as Handler;
  handlers.logoutPOST = logout.POST as unknown as Handler;
  handlers.usersGET = users.GET as unknown as Handler;
  handlers.usersPATCH = users.PATCH as unknown as Handler;
  handlers.auditGET = audit.GET as unknown as Handler;
  handlers.dumpGET = dump.GET as unknown as Handler;
});

beforeEach(() => {
  currentUser = null;
  auditEvents = [];
  userFindUniqueResult = null;
  userFindManyResult = [];
  auditItems = [];
  auditTotal = 0;
  auditWhere = null;
  auditQuery = null;
  backupCalls = [];
  backupFailure = null;
  auditFailure = null;

  prismaMock.user.findUnique = async () => userFindUniqueResult;
  prismaMock.user.findMany = async () => userFindManyResult;
  prismaMock.user.update = async () => ({ id: 'target-user', isActive: true });
  prismaMock.role.findMany = async () => [{ id: 'admin-role', name: 'admin' }];
  (prismaMock.auditLog as any).count = async (args?: unknown) => {
    auditWhere = args;
    return auditTotal;
  };
  (prismaMock.auditLog as any).findMany = async (args?: unknown) => {
    auditQuery = args;
    return auditItems;
  };
});

function request(method: string, body?: unknown, searchParams?: Record<string, string>) {
  return makeRequest({ method, body, searchParams, url: 'http://localhost:3000/api/security-test' });
}

const viewer: JwtUserPayload = {
  userId: 'viewer-id',
  ldapLogin: 'viewer',
  displayName: 'Viewer',
  roles: ['viewer'],
  permissions: [],
};

const adminWithUsersPermission: JwtUserPayload = {
  ...adminUser,
  permissions: [PERMISSIONS.ADMIN_USERS_MANAGE],
};

const adminWithAuditPermission: JwtUserPayload = {
  ...adminUser,
  permissions: [PERMISSIONS.ADMIN_AUDIT_VIEW],
};

const adminWithSettingsPermission: JwtUserPayload = {
  ...adminUser,
  permissions: [PERMISSIONS.ADMIN_SETTINGS_MANAGE],
};

describe('auth and admin security route contracts', { concurrency: false }, () => {
describe('GET /api/auth/me', () => {
  test('returns 401 when there is no session', async () => {
    const response = await handlers.meGET(request('GET'));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).success, false);
  });

  test('returns 401 when the session user is missing', async () => {
    currentUser = { ...viewer };
    userFindUniqueResult = null;

    const response = await handlers.meGET(request('GET'));

    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /не найден|заблокирован/i);
  });

  test('returns 401 when the session user is inactive', async () => {
    currentUser = { ...viewer };
    userFindUniqueResult = {
      id: 'viewer-id', ldapLogin: 'viewer', displayName: 'Viewer', email: null, isActive: false,
    };

    const response = await handlers.meGET(request('GET'));

    assert.equal(response.status, 401);
  });

  test('returns the active user and refreshed roles and permissions', async () => {
    currentUser = { ...viewer };
    userFindUniqueResult = {
      id: 'viewer-id', ldapLogin: 'viewer', displayName: 'Viewer', email: 'viewer@example.test', isActive: true,
    };

    const response = await handlers.meGET(request('GET'));
    const body = await response.json() as { success: boolean; data: JwtUserPayload };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.userId, 'viewer-id');
    assert.deepEqual(body.data.roles, ['admin']);
    assert.deepEqual(body.data.permissions, [
      PERMISSIONS.ADMIN_USERS_MANAGE,
      PERMISSIONS.ADMIN_AUDIT_VIEW,
      PERMISSIONS.ADMIN_SETTINGS_MANAGE,
    ]);
  });

  test('hides database errors behind a stable public response', async () => {
    currentUser = { ...viewer };
    prismaMock.user.findUnique = async () => {
      throw new Error('postgres password and stack trace');
    };

    const response = await handlers.meGET(request('GET'));
    const payload = JSON.stringify(await response.json());

    assert.equal(response.status, 500);
    assert.equal(payload.includes('postgres'), false);
    assert.equal(payload.includes('stack trace'), false);
  });
});

describe('POST /api/auth/logout', () => {
  test('clears cookies for anonymous, authenticated, and audit-failure scenarios', async () => {
    currentUser = null;
    auditFailure = null;
    let response = await handlers.logoutPOST(request('POST'));
    let setCookie = response.headers.get('set-cookie') ?? '';

    assert.equal(response.status, 200);
    assert.match(setCookie, /ems_session/);
    assert.match(setCookie, /ems_token/);
    assert.equal(auditEvents.length, 0);

    currentUser = { ...viewer };
    auditEvents = [];
    const auditCountBeforeAuthenticatedLogout = allAuditEvents.length;
    assert.equal(currentUser?.userId, 'viewer-id');
    response = await handlers.logoutPOST(makeRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/logout',
      headers: { 'x-test-authenticated': 'true' },
    }));
    const event = auditEvents[0] as { userId: string; action: string; entityType: string; entityId: string };

    assert.equal(response.status, 200);
    assert.equal(allAuditEvents.length, auditCountBeforeAuthenticatedLogout + 1);
    assert.deepEqual(event, {
      userId: 'viewer-id',
      action: 'LOGOUT',
      entityType: 'User',
      entityId: 'viewer-id',
      ipAddress: '127.0.0.1',
      userAgent: null,
    });

    auditFailure = new Error('audit database unavailable');
    response = await handlers.logoutPOST(request('POST'));
    const body = await response.json() as { success: boolean };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    setCookie = response.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /ems_session/);
    assert.match(setCookie, /ems_token/);
  });
});

describe('admin users route', () => {
  test('returns 401 anonymously and 403 for a user without permission', async () => {
    const anonymous = await handlers.usersGET(request('GET'));
    currentUser = viewer;
    const forbidden = await handlers.usersGET(request('GET'));

    assert.equal(anonymous.status, 401);
    assert.equal(forbidden.status, 403);
  });

  test('formats roles without exposing unrelated database fields', async () => {
    currentUser = adminWithUsersPermission;
    userFindManyResult = [{
      id: 'target-user', ldapLogin: 'operator', displayName: 'Operator', email: 'operator@example.test',
      isActive: true, lastLoginAt: null, createdAt: '2026-09-01T00:00:00.000Z',
      passwordHash: 'must-not-leak', roles: [{ role: { id: 'role-1', name: 'operator', displayName: 'Operator' } }],
    }];

    const response = await handlers.usersGET(request('GET'));
    const body = await response.json() as { data: any[] };

    assert.equal(response.status, 200);
    assert.deepEqual(body.data[0], {
      id: 'target-user', ldapLogin: 'operator', displayName: 'Operator', email: 'operator@example.test',
      isActive: true, lastLoginAt: null, createdAt: '2026-09-01T00:00:00.000Z',
      roles: [{ id: 'role-1', name: 'operator', displayName: 'Operator' }],
    });
    assert.equal(JSON.stringify(body).includes('must-not-leak'), false);
  });

  test('rejects malformed updates before any persistence or audit call', async () => {
    currentUser = adminWithUsersPermission;
    const response = await handlers.usersPATCH(request('PATCH', { userId: '' }));

    assert.equal(response.status, 400);
    assert.equal(auditEvents.length, 0);
  });

  test('prevents an administrator from deactivating their own account', async () => {
    currentUser = adminWithUsersPermission;
    userFindUniqueResult = { id: adminUser.userId, isActive: true };

    const response = await handlers.usersPATCH(request('PATCH', { userId: adminUser.userId, isActive: false }));

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /собственную учетную запись/i);
    assert.equal(auditEvents.length, 0);
  });

  test('returns 404 when the target user does not exist', async () => {
    currentUser = adminWithUsersPermission;
    userFindUniqueResult = null;

    const response = await handlers.usersPATCH(request('PATCH', { userId: 'missing-user', isActive: true }));

    assert.equal(response.status, 404);
    assert.equal(auditEvents.length, 0);
  });

  test('updates a different user and records an audit event', async () => {
    currentUser = adminWithUsersPermission;
    userFindUniqueResult = { id: 'target-user', isActive: true };

    const response = await handlers.usersPATCH(request('PATCH', {
      userId: 'target-user', roleIds: ['operator-role'], isActive: false,
    }));

    assert.equal(response.status, 200);
    assert.equal(auditEvents.length, 1);
    assert.deepEqual(auditEvents[0], {
      userId: adminUser.userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: 'target-user',
      changes: { roleIds: ['operator-role'], isActive: false },
    });
  });
});

describe('admin audit log route', () => {
  test('returns 401 anonymously and 403 without audit permission', async () => {
    assert.equal((await handlers.auditGET(request('GET'))).status, 401);
    currentUser = viewer;
    assert.equal((await handlers.auditGET(request('GET'))).status, 403);
  });

  test('applies filters and clamps pagination', async () => {
    currentUser = adminWithAuditPermission;
    auditTotal = 101;
    auditItems = [{ id: 'audit-1', action: 'UPDATE' }];

    const response = await handlers.auditGET(request('GET', undefined, {
      action: 'UPDATE', entityType: 'User', search: 'operator', page: '0', pageSize: '500',
    }));
    const body = await response.json() as { data: { page: number; pageSize: number; totalPages: number; items: any[] } };
    const countWhere = auditWhere as any;
    const findManyArgs = auditQuery as any;

    assert.equal(response.status, 200);
    assert.equal(body.data.page, 1);
    assert.equal(body.data.pageSize, 100);
    assert.equal(body.data.totalPages, 2);
    assert.deepEqual(body.data.items, auditItems);
    assert.equal(countWhere.where.action, 'UPDATE');
    assert.equal(countWhere.where.entityType, 'User');
    assert.equal(countWhere.where.OR.length, 3);
    assert.equal(findManyArgs.take, 100);
  });

  test('returns a stable 500 response on database failure', async () => {
    currentUser = adminWithAuditPermission;
    (prismaMock.auditLog as any).count = async () => { throw new Error('postgres connection details'); };

    const response = await handlers.auditGET(request('GET'));
    const payload = JSON.stringify(await response.json());

    assert.equal(response.status, 500);
    assert.equal(payload.includes('postgres'), false);
  });
});

describe('admin database dump route', () => {
  test('returns 401 anonymously and 403 without settings permission', async () => {
    assert.equal((await handlers.dumpGET(request('GET'))).status, 401);
    currentUser = viewer;
    assert.equal((await handlers.dumpGET(request('GET'))).status, 403);
  });

  test('returns the selected dump mode as a download and audits it', async () => {
    currentUser = adminWithSettingsPermission;

    const response = await handlers.dumpGET(request('GET', undefined, { mode: 'schema' }));
    const body = Buffer.from(await response.arrayBuffer()).toString();

    assert.equal(response.status, 200);
    assert.equal(body, 'backup-data');
    assert.deepEqual(backupCalls, ['schema']);
    assert.equal(response.headers.get('content-type'), 'application/sql');
    assert.match(response.headers.get('content-disposition') ?? '', /ems-schema\.sql/);
    assert.equal(auditEvents.length, 1);
  });

  test('defaults unknown dump modes to full', async () => {
    currentUser = adminWithSettingsPermission;

    const response = await handlers.dumpGET(request('GET', undefined, { mode: 'invalid' }));

    assert.equal(response.status, 200);
    assert.deepEqual(backupCalls, ['full']);
  });

  test('hides backup errors behind the public error message', async () => {
    currentUser = adminWithSettingsPermission;
    backupFailure = new Error('secret pg_dump command and credentials');

    const response = await handlers.dumpGET(request('GET'));
    const payload = JSON.stringify(await response.json());

    assert.equal(response.status, 500);
    assert.equal(payload.includes('credentials'), false);
    assert.equal(payload.includes('pg_dump'), false);
  });
});
});
