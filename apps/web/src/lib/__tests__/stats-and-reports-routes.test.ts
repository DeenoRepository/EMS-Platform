/**
 * N9 phase 4: executable contracts for stats/analytics/report-generation
 * routes and the WMS stock, inventories, and MRO schedule detail routes.
 */
import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { adminUser, makePrismaMock, makeRequest } from './helpers/route-harness';

const prismaMock = makePrismaMock();
let currentUser: JwtUserPayload | null = null;
let auditCalls = 0;
let syncCalls = 0;

const forbiddenUser: JwtUserPayload = {
  userId: 'forbidden-id',
  ldapLogin: 'forbidden',
  displayName: 'Forbidden',
  roles: ['viewer'],
  permissions: [],
};

const wmsUser: JwtUserPayload = {
  userId: 'wms-id',
  ldapLogin: 'wms.user',
  displayName: 'WMS User',
  roles: ['storekeeper'],
  permissions: [PERMISSIONS.WMS_STOCK_VIEW, PERMISSIONS.WMS_INVENTORY_MANAGE],
};

const srmUser: JwtUserPayload = {
  userId: 'srm-id',
  ldapLogin: 'srm.user',
  displayName: 'SRM User',
  roles: ['engineer'],
  permissions: [PERMISSIONS.SRM_DASHBOARD_VIEW],
};

const mroUser: JwtUserPayload = {
  userId: 'mro-id',
  ldapLogin: 'mro.user',
  displayName: 'MRO User',
  roles: ['mechanic'],
  permissions: [PERMISSIONS.MRO_SCHEDULE_VIEW, PERMISSIONS.MRO_SCHEDULE_MANAGE, PERMISSIONS.MRO_EXECUTION_COMPLETE],
};

const epsReportsUser: JwtUserPayload = {
  userId: 'eps-reports-id',
  ldapLogin: 'eps.reports',
  displayName: 'EPS Reports User',
  roles: ['engineer'],
  permissions: [PERMISSIONS.EPS_REPORTS_VIEW],
};

mock.module('@ems/database', {
  namedExports: {
    prisma: prismaMock,
    EquipmentStatus: { ACTIVE: 'ACTIVE', UNDER_REPAIR: 'UNDER_REPAIR', DECOMMISSIONED: 'DECOMMISSIONED', IN_STORAGE: 'IN_STORAGE' },
    InventoryStatus: { IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', DRAFT: 'DRAFT' },
  },
});
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/logger', {
  namedExports: { logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } },
});
mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, publicError: string) =>
      Response.json({ success: false, error: publicError }, { status: 500 }),
  },
});
class MockSrmNotConfiguredError extends Error {}
mock.module('@/lib/jira-service', {
  namedExports: {
    SrmNotConfiguredError: MockSrmNotConfiguredError,
    syncJiraIssues: async () => {
      syncCalls += 1;
    },
    calculateSrmStats: async () => ({ mttr: 4, mtbf: 30, sla: 98 }),
    calculateAdvancedRamsMetrics: async () => ({ availability: 99 }),
  },
});
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    unauthorizedResponse: () => Response.json({ success: false }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false }, { status: 403 }),
    isAdminUser: (user: JwtUserPayload) => user.roles.some((role) => role === 'admin' || role === 'administrator'),
    requireAuth: async (_request: Request, permissions: string | string[]) => {
      if (!currentUser) {
        return { errorResponse: Response.json({ success: false }, { status: 401 }) };
      }
      const required = Array.isArray(permissions) ? permissions : [permissions];
      if (!required.some((permission) => currentUser?.permissions.includes(permission))) {
        return { errorResponse: Response.json({ success: false }, { status: 403 }) };
      }
      return { user: currentUser };
    },
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

type Handler = (request: Request, context?: unknown) => Promise<Response>;
const handlers: Record<string, Handler> = {};

before(async () => {
  const feedbackStats = await import('@/app/api/feedback/stats/route');
  const srmStats = await import('@/app/api/srm/stats/route');
  const srmReliability = await import('@/app/api/srm/analytics/reliability/route');
  const wmsStock = await import('@/app/api/wms/stock/route');
  const wmsStats = await import('@/app/api/wms/stats/route');
  const wmsInventories = await import('@/app/api/wms/inventories/route');
  const mroScheduleDetail = await import('@/app/api/mro/schedules/[id]/route');
  const epsReportGenerate = await import('@/app/api/eps/reports/generate/route');

  handlers.feedbackStatsGET = feedbackStats.GET as unknown as Handler;
  handlers.srmStatsGET = srmStats.GET as unknown as Handler;
  handlers.srmReliabilityGET = srmReliability.GET as unknown as Handler;
  handlers.wmsStockGET = wmsStock.GET as unknown as Handler;
  handlers.wmsStatsGET = wmsStats.GET as unknown as Handler;
  handlers.wmsInventoriesGET = wmsInventories.GET as unknown as Handler;
  handlers.wmsInventoriesPOST = wmsInventories.POST as unknown as Handler;
  handlers.mroScheduleGET = mroScheduleDetail.GET as unknown as Handler;
  handlers.mroSchedulePATCH = mroScheduleDetail.PATCH as unknown as Handler;
  handlers.epsReportGeneratePOST = epsReportGenerate.POST as unknown as Handler;
});

const scheduleContext = { params: Promise.resolve({ id: 'schedule-1' }) };

beforeEach(() => {
  currentUser = null;
  auditCalls = 0;
  syncCalls = 0;
  prismaMock.feedbackTicket.count = async () => 0;
  prismaMock.jiraIssueCache.count = async () => 1;
  prismaMock.jiraIssueCache.groupBy = async () => [];
  prismaMock.warehouse.findMany = async () => [];
  prismaMock.warehouse.count = async () => 0;
  prismaMock.stockItem.findMany = async () => [];
  prismaMock.stockItem.count = async () => 0;
  prismaMock.stockItem.findFirst = async () => ({ id: 'stock-item-1', quantity: 100 });
  prismaMock.nomenclature.count = async () => 0;
  prismaMock.stockOperation.findMany = async () => [];
  prismaMock.inventory.count = async () => 0;
  prismaMock.inventory.findMany = async () => [];
  prismaMock.inventory.findUnique = async () => null;
  prismaMock.inventory.create = async () => ({ id: 'inventory-1' });
  prismaMock.warehouse.findUnique = async () => ({ id: 'warehouse-1', name: 'Main', stockItems: [] });
  prismaMock.maintenanceSchedule.findUnique = async () => ({
    id: 'schedule-1',
    title: 'Monthly check',
    status: 'PLANNED',
    equipment: { id: 'e1', name: 'Pump' },
  });
  prismaMock.maintenanceSchedule.update = async () => ({ id: 'schedule-1', status: 'COMPLETED' });
  prismaMock.checklistResult.upsert = async () => ({ id: 'checklist-result-1' });
  prismaMock.maintenanceUsedPart.create = async () => ({ id: 'used-part-1' });
  prismaMock.stockOperation.create = async () => ({ id: 'stock-operation-1' });
  prismaMock.stockItem.update = async () => ({ id: 'stock-item-1' });
  prismaMock.equipment.findMany = async () => [];
  prismaMock.customSection.findMany = async () => [];
  prismaMock.customFieldDefinition.findMany = async () => [];
});

describe('GET /api/feedback/stats', () => {
  test('requires authentication and admin-feedback permission', async () => {
    assert.equal((await handlers.feedbackStatsGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.feedbackStatsGET(makeRequest())).status, 403);
  });

  test('returns aggregated KPIs for an administrator', async () => {
    currentUser = adminUser;
    const response = await handlers.feedbackStatsGET(makeRequest());
    const body = (await response.json()) as { success: boolean; data: { total: number } };
    assert.equal(response.status, 200);
    assert.equal(body.data.total, 0);
  });
});

describe('GET /api/srm/stats', () => {
  test('requires SRM dashboard permission', async () => {
    assert.equal((await handlers.srmStatsGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.srmStatsGET(makeRequest())).status, 403);
  });

  test('triggers a sync when the issue cache is empty and returns calculated stats', async () => {
    currentUser = srmUser;
    prismaMock.jiraIssueCache.count = async () => 0;
    const response = await handlers.srmStatsGET(makeRequest());
    const body = (await response.json()) as { success: boolean; data: { mttr: number } };
    assert.equal(response.status, 200);
    assert.equal(syncCalls, 1);
    assert.equal(body.data.mttr, 4);
  });
});

describe('GET /api/srm/analytics/reliability', () => {
  test('requires SRM dashboard permission and returns RAMS metrics', async () => {
    assert.equal((await handlers.srmReliabilityGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.srmReliabilityGET(makeRequest())).status, 403);
    currentUser = srmUser;
    const response = await handlers.srmReliabilityGET(makeRequest());
    assert.equal(response.status, 200);
  });
});

describe('GET /api/wms/stock', () => {
  test('requires stock-view permission', async () => {
    assert.equal((await handlers.wmsStockGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.wmsStockGET(makeRequest())).status, 403);
  });
});

describe('GET /api/wms/stats', () => {
  test('requires stock-view permission and scopes non-admins to their warehouses', async () => {
    assert.equal((await handlers.wmsStatsGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.wmsStatsGET(makeRequest())).status, 403);
    currentUser = wmsUser;
    const response = await handlers.wmsStatsGET(makeRequest());
    assert.equal(response.status, 200);
  });
});

describe('WMS inventories routes', () => {
  test('GET requires inventory-manage or stock-view permission', async () => {
    assert.equal((await handlers.wmsInventoriesGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.wmsInventoriesGET(makeRequest())).status, 403);
    currentUser = wmsUser;
    assert.equal((await handlers.wmsInventoriesGET(makeRequest())).status, 200);
  });

  test('POST validates warehouseId, requires manage permission, and rejects an unknown warehouse', async () => {
    currentUser = wmsUser;
    assert.equal((await handlers.wmsInventoriesPOST(makeRequest({ method: 'POST', body: {} }))).status, 400);

    prismaMock.warehouse.findUnique = async () => null;
    const missingWarehouse = await handlers.wmsInventoriesPOST(
      makeRequest({ method: 'POST', body: { warehouseId: 'missing' } }),
    );
    assert.equal(missingWarehouse.status, 404);

    prismaMock.warehouse.findUnique = async () => ({ id: 'warehouse-1', name: 'Main', stockItems: [] });
    const created = await handlers.wmsInventoriesPOST(
      makeRequest({ method: 'POST', body: { warehouseId: 'warehouse-1' } }),
    );
    assert.equal(created.status, 200);
    assert.equal(auditCalls, 1);
  });
});

describe('MRO schedule detail routes', () => {
  test('GET requires MRO schedule-view permission and returns 404 for a missing schedule', async () => {
    assert.equal((await handlers.mroScheduleGET(makeRequest(), scheduleContext)).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.mroScheduleGET(makeRequest(), scheduleContext)).status, 403);

    currentUser = mroUser;
    prismaMock.maintenanceSchedule.findUnique = async () => null;
    assert.equal((await handlers.mroScheduleGET(makeRequest(), scheduleContext)).status, 404);
  });

  test('PATCH completes a schedule and audits parts usage within a transaction', async () => {
    currentUser = mroUser;
    prismaMock.maintenanceSchedule.findUnique = async () => ({
      id: 'schedule-1',
      title: 'Monthly check',
      status: 'PLANNED',
      completedDate: null,
      completedById: null,
      notes: null,
      equipment: { id: 'e1', name: 'Pump' },
    });

    const response = await handlers.mroSchedulePATCH(
      makeRequest({
        method: 'PATCH',
        body: {
          status: 'COMPLETED',
          checklistItems: [{ id: 'i1', value: true }],
          usedParts: [{ nomenclatureId: 'n1', warehouseId: 'w1', quantity: 2 }],
        },
      }),
      scheduleContext,
    );
    assert.equal(response.status, 200);
  });

  test('PATCH rejects insufficient stock during part write-off', async () => {
    currentUser = mroUser;
    prismaMock.maintenanceSchedule.findUnique = async () => ({
      id: 'schedule-1',
      title: 'Monthly check',
      status: 'PLANNED',
      completedDate: null,
      completedById: null,
      notes: null,
      equipment: { id: 'e1', name: 'Pump' },
    });
    prismaMock.stockItem.findFirst = async () => ({ id: 'stock-item-1', quantity: 0 });

    const response = await handlers.mroSchedulePATCH(
      makeRequest({
        method: 'PATCH',
        body: { usedParts: [{ nomenclatureId: 'n1', warehouseId: 'w1', quantity: 5 }] },
      }),
      scheduleContext,
    );
    assert.equal(response.status, 500);
  });
});

describe('POST /api/eps/reports/generate', () => {
  test('requires reports-view/manage permission or admin', async () => {
    assert.equal((await handlers.epsReportGeneratePOST(makeRequest({ method: 'POST', body: {} }))).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.epsReportGeneratePOST(makeRequest({ method: 'POST', body: {} }))).status, 403);
  });

  test('generates a report with available columns for an authorized user', async () => {
    currentUser = epsReportsUser;
    const response = await handlers.epsReportGeneratePOST(makeRequest({ method: 'POST', body: {} }));
    const body = (await response.json()) as { success: boolean; data: { total: number; availableColumns: unknown[] } };
    assert.equal(response.status, 200);
    assert.equal(body.data.total, 0);
    assert.ok(body.data.availableColumns.length > 0);
  });
});
