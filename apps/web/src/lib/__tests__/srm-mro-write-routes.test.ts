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
let schedulesFindManyCalls: any[] = [];
let issueDetail: any = null;
let issueEquipment: any = null;
let issueSchedule: any = null;

const syncUser: JwtUserPayload = {
  userId: 'srm-operator',
  ldapLogin: 'srm.operator',
  displayName: 'SRM Operator',
  roles: ['operator'],
  permissions: [
    PERMISSIONS.SRM_SYNC_TRIGGER,
    PERMISSIONS.SRM_DASHBOARD_VIEW,
    PERMISSIONS.MRO_SCHEDULE_MANAGE,
    PERMISSIONS.MRO_SCHEDULE_VIEW,
  ],
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
  jiraIssueCache: {
    findFirst: async () => issueDetail,
  },
  equipment: {
    findUnique: async () => issueEquipment,
  },
  warehouse: {
    findMany: async () => [{ id: 'wh-1' }],
  },
  maintenanceSchedule: {
    findUnique: async () => issueSchedule,
    findMany: async (args: unknown) => {
      schedulesFindManyCalls.push(args);
      return schedules;
    },
    create: async (args: unknown) => {
      createdSchedules.push(args);
      return { id: 'schedule-1', ...(args as any).data };
    },
  },
};

const PurchaseRequestStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PARTIALLY_DELIVERED: 'PARTIALLY_DELIVERED',
  DELIVERED: 'DELIVERED',
  CLOSED: 'CLOSED',
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock, PurchaseRequestStatus } });
mock.module('@ems/shared', { namedExports: { PERMISSIONS } });
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    requireAuth: async (_request: Request, permission: string | string[]) => requirePermission(currentUser, permission),
    isAdminUser: (user: JwtUserPayload | null | undefined) =>
      Boolean(user && (user.roles?.includes('admin') || user.roles?.includes('ADMIN'))),
  },
});
mock.module('@/lib/logger', {
  namedExports: { logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } },
});
mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, message: string) =>
      Response.json({ success: false, error: message }, { status: 500 }),
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
  issueGET?: IdHandler;
  schedulesGET?: RequestHandler;
  schedulesPOST?: RequestHandler;
} = {};

before(async () => {
  const sync = await import('@/app/api/srm/sync/route');
  const integrationSync = await import('@/app/api/srm/integrations/[id]/sync/route');
  const createMro = await import('@/app/api/srm/issues/[id]/create-mro-order/route');
  const issue = await import('@/app/api/srm/issues/[id]/route');
  const schedules = await import('@/app/api/mro/schedules/route');
  handlers.sync = sync.POST as unknown as RequestHandler;
  handlers.integrationSync = integrationSync.POST as unknown as IdHandler;
  handlers.createMro = createMro.POST as unknown as IdHandler;
  handlers.issueGET = issue.GET as unknown as IdHandler;
  handlers.schedulesGET = schedules.GET as unknown as RequestHandler;
  handlers.schedulesPOST = schedules.POST as unknown as RequestHandler;
});

beforeEach(() => {
  currentUser = null;
  integration = { id: 'integration-1', name: 'Jira EMS' };
  issueDetail = null;
  issueEquipment = null;
  issueSchedule = null;
  syncResult = { count: 3, source: 'mock-srm' };
  mroResult = {
    issue: { issueKey: 'EMS-42' },
    order: { id: 'mro-order-1' },
  };
  schedules = [];
  createdSchedules = [];
  syncCalls = [];
  mroCalls = [];
  schedulesFindManyCalls = [];
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

  test('returns SRM issue details with optional equipment and MRO schedule', async () => {
    assert.equal((await handlers.issueGET!(request('GET'), context('issue-42'))).status, 401);

    currentUser = syncUser;
    assert.equal((await handlers.issueGET!(request('GET'), context('missing'))).status, 404);

    issueDetail = {
      id: 'issue-42', issueKey: 'EMS-42', summary: 'Pump failure', status: 'OPEN',
      equipmentId: 'equipment-1', mroScheduleId: 'schedule-1', integration: null,
    };
    issueEquipment = { id: 'equipment-1', name: 'Pump A', inventoryNumber: 'INV-1' };
    issueSchedule = { id: 'schedule-1', title: 'Emergency repair', status: 'IN_PROGRESS' };
    const response = await handlers.issueGET!(request('GET'), context('EMS-42'));
    const body = await response.json() as { success: boolean; data: any };
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.issueKey, 'EMS-42');
    assert.equal(body.data.equipment.name, 'Pump A');
    assert.equal(body.data.mroSchedule.id, 'schedule-1');
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

  test('does not include purchase requests when caller lacks PRM permissions', async () => {
    // syncUser has MRO_SCHEDULE_VIEW and MRO_SCHEDULE_MANAGE, but no PRM permissions
    currentUser = syncUser;
    schedules = [{ id: 'schedule-1', status: 'PLANNED' }];
    const response = await handlers.schedulesGET!(request('GET'));
    assert.equal(response.status, 200);
    assert.equal(schedulesFindManyCalls.length, 1);
    const callArgs = schedulesFindManyCalls[0];
    assert.equal(callArgs.include.purchaseRequests, undefined);
  });

  test('scopes purchase requests include to requester and warehouse for non-admin PRM viewer', async () => {
    currentUser = {
      userId: 'prm-mechanic',
      ldapLogin: 'prm.mechanic',
      displayName: 'Mechanic',
      roles: ['technician'],
      permissions: [PERMISSIONS.MRO_SCHEDULE_VIEW, PERMISSIONS.PRM_REQUESTS_VIEW],
    };
    schedules = [{ id: 'schedule-1', status: 'PLANNED' }];
    const response = await handlers.schedulesGET!(request('GET'));
    assert.equal(response.status, 200);
    assert.equal(schedulesFindManyCalls.length, 1);
    const callArgs = schedulesFindManyCalls[0];
    assert.ok(callArgs.include.purchaseRequests);
    assert.deepEqual(callArgs.include.purchaseRequests.where, {
      OR: [
        { requesterId: 'prm-mechanic' },
        { targetWarehouseId: { in: ['wh-1'] } },
      ],
    });
    assert.deepEqual(callArgs.include.purchaseRequests.select, {
      id: true,
      requestNumber: true,
      status: true,
    });
  });

  test('includes unrestricted purchase requests for admin or PRM manager', async () => {
    currentUser = {
      userId: 'prm-manager',
      ldapLogin: 'prm.manager',
      displayName: 'Manager',
      roles: ['manager'],
      permissions: [PERMISSIONS.MRO_SCHEDULE_VIEW, PERMISSIONS.PRM_REQUESTS_MANAGE],
    };
    schedules = [{ id: 'schedule-1', status: 'PLANNED' }];
    const response = await handlers.schedulesGET!(request('GET'));
    assert.equal(response.status, 200);
    assert.equal(schedulesFindManyCalls.length, 1);
    const callArgs = schedulesFindManyCalls[0];
    assert.ok(callArgs.include.purchaseRequests);
    assert.equal(callArgs.include.purchaseRequests.where, undefined);
    assert.deepEqual(callArgs.include.purchaseRequests.select, {
      id: true,
      requestNumber: true,
      status: true,
    });
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
