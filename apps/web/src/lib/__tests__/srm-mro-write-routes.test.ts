import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

let currentUser: JwtUserPayload | null = null;
let integration: any = null;
let syncResult = { count: 3, source: 'mock-srm' };
let mroResult: any = null;
let schedules: any[] = [];
let createdSchedules: any[] = [];
let syncCalls: any[] = [];
let mroCalls: any[] = [];

const syncUser: JwtUserPayload = {
  userId: 'srm-operator',
  ldapLogin: 'srm.operator',
  displayName: 'SRM Operator',
  roles: ['operator'],
  permissions: [PERMISSIONS.SRM_SYNC_TRIGGER, PERMISSIONS.MRO_SCHEDULE_MANAGE, PERMISSIONS.MRO_SCHEDULE_VIEW],
};

const viewer: JwtUserPayload = {
  userId: 'viewer-id',
  ldapLogin: 'viewer',
  displayName: 'Viewer',
  roles: ['viewer'],
  permissions: [],
};

function requirePermission(user: JwtUserPayload | null, permission: string | string[]) {
  if (!user) return { errorResponse: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  const permissions = Array.isArray(permission) ? permission : [permission];
  if (!permissions.some((code) => user.permissions.includes(code))) {
    return { errorResponse: Response.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

const prismaMock = {
  srmIntegration: {
    findUnique: async () => integration,
  },
  maintenanceSchedule: {
    findMany: async () => schedules,
    create: async (args: unknown) => {
      createdSchedules.push(args);
      return { id: 'schedule-1', ...(args as any).data };
    },
  },
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock } });
mock.module('@ems/shared', { namedExports: { PERMISSIONS } });
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    requireAuth: async (_request: Request, permission: string | string[]) => requirePermission(currentUser, permission),
  },
});
mock.module('@/lib/logger', {
  namedExports: { logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } },
});
mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, message: string) => Response.json({ success: false, error: message }, { status: 500 }),
  },
});
mock.module('@/lib/jira-service', {
  namedExports: {
    syncJiraIssues: async (...args: unknown[]) => {
      syncCalls.push(args);
      return syncResult;
    },
    createMroWorkOrderFromIssue: async (...args: unknown[]) => {
      mroCalls.push(args);
      return mroResult;
    },
  },
});

interface RouteContext { params: Promise<{ id: string }> }
type RequestHandler = (request: Request) => Promise<Response>;
type IdHandler = (request: Request, context: RouteContext) => Promise<Response>;
const handlers: {
  sync?: RequestHandler;
  integrationSync?: IdHandler;
  createMro?: IdHandler;
  schedulesGET?: RequestHandler;
  schedulesPOST?: RequestHandler;
} = {};

before(async () => {
  const sync = await import('@/app/api/srm/sync/route');
  const integrationSync = await import('@/app/api/srm/integrations/[id]/sync/route');
  const createMro = await import('@/app/api/srm/issues/[id]/create-mro-order/route');
  const schedules = await import('@/app/api/mro/schedules/route');
  handlers.sync = sync.POST as unknown as RequestHandler;
  handlers.integrationSync = integrationSync.POST as unknown as IdHandler;
  handlers.createMro = createMro.POST as unknown as IdHandler;
  handlers.schedulesGET = schedules.GET as unknown as RequestHandler;
  handlers.schedulesPOST = schedules.POST as unknown as RequestHandler;
});

beforeEach(() => {
  currentUser = null;
  integration = { id: 'integration-1', name: 'Jira EMS' };
  syncResult = { count: 3, source: 'mock-srm' };
  mroResult = {
    issue: { issueKey: 'EMS-42' },
    order: { id: 'mro-order-1' },
  };
  schedules = [];
  createdSchedules = [];
  syncCalls = [];
  mroCalls = [];
});

function request(method: string, body?: unknown, searchParams?: Record<string, string>) {
  return makeRequest({ method, body, searchParams, url: 'http://localhost:3000/api/srm-mro-write-test' });
}

function context(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

describe('O2 SRM synchronization and MRO write contracts', { concurrency: false }, () => {
  test('enforces permissions on global and integration sync', async () => {
    assert.equal((await handlers.sync!(request('POST'))).status, 401);
    currentUser = viewer;
    assert.equal((await handlers.sync!(request('POST'))).status, 403);

    currentUser = syncUser;
    const global = await handlers.sync!(request('POST'));
    assert.equal(global.status, 200);
    assert.equal((await global.json()).message, 'Синхронизировано заявок: 3');
    assert.equal(syncCalls.length, 1);

    integration = null;
    const missing = await handlers.integrationSync!(request('POST'), context('missing'));
    assert.equal(missing.status, 404);
    assert.equal(syncCalls.length, 1);

    integration = { id: 'integration-1', name: 'Jira EMS' };
    const scoped = await handlers.integrationSync!(request('POST'), context('integration-1'));
    assert.equal(scoped.status, 200);
    assert.deepEqual(syncCalls[1], ['integration-1']);
  });

  test('creates an MRO order from an issue only with MRO management permission', async () => {
    assert.equal((await handlers.createMro!(request('POST'), context('issue-42'))).status, 401);
    currentUser = viewer;
    assert.equal((await handlers.createMro!(request('POST'), context('issue-42'))).status, 403);

    currentUser = syncUser;
    const response = await handlers.createMro!(request('POST'), context('issue-42'));
    const body = await response.json() as { success: boolean; data: { issue: { issueKey: string } } };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.issue.issueKey, 'EMS-42');
    assert.deepEqual(mroCalls[0], ['issue-42', syncUser.userId]);
  });

  test('filters overdue schedules and requires view permission', async () => {
    assert.equal((await handlers.schedulesGET!(request('GET'))).status, 401);
    currentUser = viewer;
    assert.equal((await handlers.schedulesGET!(request('GET'))).status, 403);

    currentUser = syncUser;
    schedules = [{ id: 'schedule-1', status: 'MISSED' }];
    const response = await handlers.schedulesGET!(request('GET', undefined, { status: 'OVERDUE', equipmentId: 'equipment-1' }));
    const body = await response.json() as { success: boolean; data: any[] };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data, schedules);
  });

  test('validates and creates a planned MRO schedule', async () => {
    currentUser = syncUser;
    const invalid = await handlers.schedulesPOST!(request('POST', { equipmentId: 'equipment-1' }));
    assert.equal(invalid.status, 400);
    assert.equal(createdSchedules.length, 0);

    const response = await handlers.schedulesPOST!(request('POST', {
      equipmentId: 'equipment-1', planId: 'plan-1', title: 'Quarterly inspection',
      scheduledDate: '2026-09-15T10:00:00.000Z', notes: '  inspect bearings  ',
    }));
    const body = await response.json() as { success: boolean; data: any };

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(createdSchedules.length, 1);
    assert.equal(createdSchedules[0].data.status, 'PLANNED');
    assert.equal(createdSchedules[0].data.notes, '  inspect bearings  ');
    assert.equal(createdSchedules[0].data.scheduledDate instanceof Date, true);
  });
});
