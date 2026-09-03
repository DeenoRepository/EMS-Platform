/**
 * Executable tests for /api/prm/requests (GET list, POST create).
 *
 * Contract under test:
 *   • anonymous request (no token) → 401
 *   • authenticated user without required permission → 403
 *   • POST validation failure (no items / non-existent warehouse) → 400
 *   • authenticated user with permission → 2xx with expected shape
 *   • persistence failure → 500 without leaking internal error text
 *
 * No real PostgreSQL connection is opened; prisma is fully mocked via
 * mock.module('@ems/database').
 */
import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

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
} as const;

let currentUser: JwtUserPayload | null = null;
let warehouseRow: { id: string; name: string; isActive: boolean } | null = {
  id: 'wh-1',
  name: 'Main Warehouse',
  isActive: true,
};
let createdRecord: unknown = { id: 'created-request-id' };
let createShouldThrow = false;
let findManyResult: unknown[] = [];
let countResult = 0;
let auditEvents: unknown[] = [];
let createCallArgs: unknown = null;
let equipmentLookupCount = 0;
let scheduleLookupCount = 0;
let equipmentRows: Record<string, { id: string; deletedAt?: Date | null }> = {
  'eq-1': { id: 'eq-1', deletedAt: null },
};
let scheduleRows: Record<string, { id: string; equipmentId: string }> = {
  'sch-1': { id: 'sch-1', equipmentId: 'eq-1' },
  'sch-other': { id: 'sch-other', equipmentId: 'eq-other' },
};

const prismaMock = {
  purchaseRequest: {
    findMany: async () => findManyResult,
    count: async () => countResult,
    create: async (args: unknown) => {
      createCallArgs = args;
      if (createShouldThrow) throw new Error('db failure');
      return createdRecord;
    },
  },
  warehouse: {
    findMany: async () => [],
    findUnique: async () => warehouseRow,
  },
  equipment: {
    findFirst: async (args: { where: { id: string; deletedAt?: null } }) => {
      equipmentLookupCount++;
      const eq = equipmentRows[args.where.id];
      if (eq && (args.where.deletedAt === null ? eq.deletedAt === null : true)) {
        return eq;
      }
      return null;
    },
  },
  maintenanceSchedule: {
    findUnique: async (args: { where: { id: string } }) => {
      scheduleLookupCount++;
      return scheduleRows[args.where.id] || null;
    },
  },
};

mock.module('@ems/database', {
  namedExports: { prisma: prismaMock, PurchaseRequestStatus },
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
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: JwtUserPayload | null, permission: string) =>
      Boolean(user && user.permissions.includes(permission)),
    logAuditEvent: async (event: unknown) => {
      auditEvents.push(event);
    },
  },
});
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    isAdminUser: (user: JwtUserPayload | null) => Boolean(user && user.roles.includes('admin')),
    unauthorizedResponse: () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false, error: 'Forbidden' }, { status: 403 }),
  },
});

const viewerUser: JwtUserPayload = {
  userId: 'viewer-id',
  ldapLogin: 'viewer',
  displayName: 'Viewer',
  roles: ['viewer'],
  permissions: [PERMISSIONS.PRM_REQUESTS_VIEW],
};

const requesterUser: JwtUserPayload = {
  userId: 'requester-id',
  ldapLogin: 'requester',
  displayName: 'Requester',
  roles: ['engineer'],
  permissions: [PERMISSIONS.PRM_REQUESTS_VIEW, PERMISSIONS.PRM_REQUESTS_CREATE],
};

let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;

before(async () => {
  const route = await import('@/app/api/prm/requests/route');
  GET = route.GET as unknown as (req: Request) => Promise<Response>;
  POST = route.POST as unknown as (req: Request) => Promise<Response>;
});

function resetState() {
  currentUser = null;
  warehouseRow = { id: 'wh-1', name: 'Main Warehouse', isActive: true };
  createdRecord = { id: 'created-request-id' };
  createShouldThrow = false;
  findManyResult = [];
  countResult = 0;
  auditEvents = [];
  createCallArgs = null;
  equipmentLookupCount = 0;
  scheduleLookupCount = 0;
}

describe('GET /api/prm/requests', () => {
  test('returns 401 for anonymous requests', async () => {
    resetState();
    const res = await GET(makeRequest({ url: 'http://localhost/api/prm/requests' }));
    assert.equal(res.status, 401);
  });

  test('returns 403 without any PRM permission', async () => {
    resetState();
    currentUser = { ...viewerUser, permissions: [] };
    const res = await GET(makeRequest({ url: 'http://localhost/api/prm/requests' }));
    assert.equal(res.status, 403);
  });

  test('returns 200 with list for authorized viewer', async () => {
    resetState();
    currentUser = viewerUser;
    findManyResult = [{ id: 'req-1' }, { id: 'req-2' }];
    countResult = 2;
    const res = await GET(makeRequest({ url: 'http://localhost/api/prm/requests' }));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: { items: unknown[]; total: number } };
    assert.equal(body.success, true);
    assert.equal(body.data.total, 2);
    assert.equal(body.data.items.length, 2);
  });

  test('omits equipment label when user lacks EPS view and schedule label when user lacks MRO view', async () => {
    resetState();
    // User has PRM view and EPS view, but lacks MRO view
    currentUser = {
      ...viewerUser,
      permissions: [PERMISSIONS.PRM_REQUESTS_VIEW, PERMISSIONS.EPS_EQUIPMENT_VIEW],
    };
    findManyResult = [
      {
        id: 'req-1',
        equipmentId: 'eq-1',
        maintenanceScheduleId: 'sch-1',
        equipment: { id: 'eq-1', name: 'Pump 1', inventoryNumber: 'INV-1' },
        maintenanceSchedule: { id: 'sch-1', title: 'Quarterly Maintenance' },
      },
    ];
    countResult = 1;

    const res = await GET(makeRequest({ url: 'http://localhost/api/prm/requests' }));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: { items: Array<any> } };
    assert.equal(body.success, true);
    const item = body.data.items[0];
    assert.equal(item.equipmentId, 'eq-1');
    assert.deepEqual(item.equipment, { id: 'eq-1', name: 'Pump 1', inventoryNumber: 'INV-1' });
    // maintenanceSchedule must be sanitized to null because user lacks MRO_SCHEDULE_VIEW
    assert.equal(item.maintenanceSchedule, null);
  });

  test('omits equipment label when user lacks EPS view', async () => {
    resetState();
    // User has PRM view and MRO view, but lacks EPS view
    currentUser = {
      ...viewerUser,
      permissions: [PERMISSIONS.PRM_REQUESTS_VIEW, PERMISSIONS.MRO_SCHEDULE_VIEW],
    };
    findManyResult = [
      {
        id: 'req-1',
        equipmentId: 'eq-1',
        maintenanceScheduleId: 'sch-1',
        equipment: { id: 'eq-1', name: 'Pump 1', inventoryNumber: 'INV-1' },
        maintenanceSchedule: { id: 'sch-1', title: 'Quarterly Maintenance' },
      },
    ];
    countResult = 1;

    const res = await GET(makeRequest({ url: 'http://localhost/api/prm/requests' }));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: { items: Array<any> } };
    assert.equal(body.success, true);
    const item = body.data.items[0];
    assert.equal(item.equipment, null);
    assert.deepEqual(item.maintenanceSchedule, { id: 'sch-1', title: 'Quarterly Maintenance' });
  });
});

describe('POST /api/prm/requests', () => {
  test('returns 401 for anonymous requests', async () => {
    resetState();
    const res = await POST(
      makeRequest({ method: 'POST', url: 'http://localhost/api/prm/requests', body: {} }),
    );
    assert.equal(res.status, 401);
  });

  test('returns 403 without PRM_REQUESTS_CREATE', async () => {
    resetState();
    currentUser = viewerUser; // has VIEW only
    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: { targetWarehouseId: 'wh-1', items: [{ nomenclatureId: 'nom-1', requestedQty: 1, estimatedPrice: 10 }] },
      }),
    );
    assert.equal(res.status, 403);
  });

  test('returns 400 when items array is empty', async () => {
    resetState();
    currentUser = requesterUser;
    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: { targetWarehouseId: 'wh-1', items: [] },
      }),
    );
    assert.equal(res.status, 400);
  });

  test('returns 400 for zero/negative requestedQty', async () => {
    resetState();
    currentUser = requesterUser;
    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-1',
          items: [{ nomenclatureId: 'nom-1', requestedQty: 0, estimatedPrice: 10 }],
        },
      }),
    );
    assert.equal(res.status, 400);
  });

  test('returns 400 when target warehouse does not exist', async () => {
    resetState();
    currentUser = requesterUser;
    warehouseRow = null;
    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-missing',
          items: [{ nomenclatureId: 'nom-1', requestedQty: 2, estimatedPrice: 10 }],
        },
      }),
    );
    assert.equal(res.status, 400);
  });

  test('creates DRAFT request, computes estimatedTotal, and audits on success', async () => {
    resetState();
    currentUser = requesterUser;
    createdRecord = { id: 'created-request-id', requestNumber: 'PR-20260902-ABCDEF' };
    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-1',
          items: [
            { nomenclatureId: 'nom-1', requestedQty: 2, estimatedPrice: 100 },
            { nomenclatureId: 'nom-2', requestedQty: 1, estimatedPrice: 50 },
          ],
        },
      }),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    assert.equal(body.success, true);
    assert.equal(body.data.id, 'created-request-id');
    assert.equal((createCallArgs as any).data.status, PurchaseRequestStatus.DRAFT);
    assert.equal((createCallArgs as any).data.estimatedTotal, 250);
    assert.equal(auditEvents.length, 1);
  });

  test('returns 500 without leaking internal error when persistence fails', async () => {
    resetState();
    currentUser = requesterUser;
    createShouldThrow = true;
    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-1',
          items: [{ nomenclatureId: 'nom-1', requestedQty: 1, estimatedPrice: 10 }],
        },
      }),
    );
    assert.equal(res.status, 500);
    const body = (await res.json()) as { success: boolean; error: string };
    assert.equal(body.success, false);
    assert.doesNotMatch(body.error, /db failure/);
  });

  test('rejects creation when referenced equipment does not exist', async () => {
    resetState();
    currentUser = {
      ...requesterUser,
      permissions: [PERMISSIONS.PRM_REQUESTS_CREATE, PERMISSIONS.EPS_EQUIPMENT_VIEW],
    };

    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-1',
          equipmentId: 'non-existent-eq',
          items: [{ nomenclatureId: 'nom-1', requestedQty: 1, estimatedPrice: 100 }],
        },
      }),
    );

    assert.equal(res.status, 400);
    const json = (await res.json()) as { success: boolean; error: string };
    assert.equal(json.success, false);
    assert.match(json.error, /Оборудование не найдено/);
  });

  test('rejects creation when referenced maintenance schedule does not exist', async () => {
    resetState();
    currentUser = {
      ...requesterUser,
      permissions: [PERMISSIONS.PRM_REQUESTS_CREATE, PERMISSIONS.MRO_SCHEDULE_VIEW],
    };

    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-1',
          maintenanceScheduleId: 'non-existent-sch',
          items: [{ nomenclatureId: 'nom-1', requestedQty: 1, estimatedPrice: 100 }],
        },
      }),
    );

    assert.equal(res.status, 400);
    const json = (await res.json()) as { success: boolean; error: string };
    assert.equal(json.success, false);
    assert.match(json.error, /График ТО не найден/);
  });

  test('rejects creation when maintenance schedule does not belong to selected equipment', async () => {
    resetState();
    currentUser = {
      ...requesterUser,
      permissions: [
        PERMISSIONS.PRM_REQUESTS_CREATE,
        PERMISSIONS.EPS_EQUIPMENT_VIEW,
        PERMISSIONS.MRO_SCHEDULE_VIEW,
      ],
    };

    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-1',
          equipmentId: 'eq-1',
          maintenanceScheduleId: 'sch-other',
          items: [{ nomenclatureId: 'nom-1', requestedQty: 1, estimatedPrice: 100 }],
        },
      }),
    );

    assert.equal(res.status, 400);
    const json = (await res.json()) as { success: boolean; error: string };
    assert.equal(json.success, false);
    assert.match(json.error, /не относится к выбранному оборудованию/);
  });

  test('returns 403 without database lookup when creating with equipmentId without EPS_EQUIPMENT_VIEW', async () => {
    resetState();
    currentUser = {
      ...requesterUser,
      permissions: [PERMISSIONS.PRM_REQUESTS_CREATE], // lacks EPS_EQUIPMENT_VIEW
    };

    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-1',
          equipmentId: 'eq-1',
          items: [{ nomenclatureId: 'nom-1', requestedQty: 1, estimatedPrice: 100 }],
        },
      }),
    );

    assert.equal(res.status, 403);
    assert.equal(equipmentLookupCount, 0);
  });

  test('returns 403 without database lookup when creating with maintenanceScheduleId without MRO_SCHEDULE_VIEW', async () => {
    resetState();
    currentUser = {
      ...requesterUser,
      permissions: [PERMISSIONS.PRM_REQUESTS_CREATE, PERMISSIONS.EPS_EQUIPMENT_VIEW], // lacks MRO_SCHEDULE_VIEW
    };

    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-1',
          equipmentId: 'eq-1',
          maintenanceScheduleId: 'sch-1',
          items: [{ nomenclatureId: 'nom-1', requestedQty: 1, estimatedPrice: 100 }],
        },
      }),
    );

    assert.equal(res.status, 403);
    assert.equal(scheduleLookupCount, 0);
  });

  test('returns 403 when GET list has equipmentId filter but user lacks EPS_EQUIPMENT_VIEW', async () => {
    resetState();
    currentUser = {
      ...requesterUser,
      permissions: [PERMISSIONS.PRM_REQUESTS_VIEW],
    };

    const res = await GET(
      makeRequest({
        method: 'GET',
        url: 'http://localhost/api/prm/requests?equipmentId=eq-1',
      }),
    );

    assert.equal(res.status, 403);
  });

  test('returns 403 when GET list has maintenanceScheduleId filter but user lacks MRO_SCHEDULE_VIEW', async () => {
    resetState();
    currentUser = {
      ...requesterUser,
      permissions: [PERMISSIONS.PRM_REQUESTS_VIEW, PERMISSIONS.EPS_EQUIPMENT_VIEW],
    };

    const res = await GET(
      makeRequest({
        method: 'GET',
        url: 'http://localhost/api/prm/requests?maintenanceScheduleId=sch-1',
      }),
    );

    assert.equal(res.status, 403);
  });

  test('privacy-first: serializes equipment and equipmentId as null when caller lacks EPS_EQUIPMENT_VIEW', async () => {
    resetState();
    currentUser = {
      ...requesterUser,
      permissions: [PERMISSIONS.PRM_REQUESTS_VIEW, PERMISSIONS.MRO_SCHEDULE_VIEW],
    };
    findManyResult = [
      {
        id: 'req-1',
        equipmentId: 'eq-1',
        equipment: { id: 'eq-1', name: 'Pump 1', inventoryNumber: 'INV-1' },
        maintenanceScheduleId: 'sch-1',
        maintenanceSchedule: { id: 'sch-1', title: 'Plan 1' },
        targetWarehouse: { id: 'wh-1', name: 'Main', code: 'M1', responsibleUserId: 'u1' },
        requester: { id: requesterUser.userId, displayName: 'Req', ldapLogin: 'req' },
        reviewer: null,
        closedBy: null,
        items: [],
      },
    ];
    countResult = 1;

    const res = await GET(
      makeRequest({
        method: 'GET',
        url: 'http://localhost/api/prm/requests',
      }),
    );

    assert.equal(res.status, 200);
    const json = (await res.json()) as { success: boolean; data: { items: any[] } };
    assert.equal(json.data.items[0].equipment, null);
    assert.equal(json.data.items[0].equipmentId, null);
    assert.equal(json.data.items[0].maintenanceScheduleId, 'sch-1');
    assert.deepEqual(json.data.items[0].maintenanceSchedule, { id: 'sch-1', title: 'Plan 1' });
  });

  test('successfully creates a request linked to valid equipment and schedule when fully permitted', async () => {
    resetState();
    currentUser = {
      ...requesterUser,
      permissions: [
        PERMISSIONS.PRM_REQUESTS_CREATE,
        PERMISSIONS.EPS_EQUIPMENT_VIEW,
        PERMISSIONS.MRO_SCHEDULE_VIEW,
      ],
    };
    createdRecord = {
      id: 'created-req-1',
      equipmentId: 'eq-1',
      maintenanceScheduleId: 'sch-1',
      equipment: { id: 'eq-1', name: 'Pump 1', inventoryNumber: 'INV-1' },
      maintenanceSchedule: { id: 'sch-1', title: 'Quarterly Maintenance' },
    };

    const res = await POST(
      makeRequest({
        method: 'POST',
        url: 'http://localhost/api/prm/requests',
        body: {
          targetWarehouseId: 'wh-1',
          equipmentId: 'eq-1',
          maintenanceScheduleId: 'sch-1',
          items: [{ nomenclatureId: 'nom-1', requestedQty: 2, estimatedPrice: 50 }],
        },
      }),
    );

    assert.equal(res.status, 200);
    const json = (await res.json()) as { success: boolean; data: any };
    assert.equal(json.success, true);
    assert.equal((createCallArgs as any)?.data?.equipmentId, 'eq-1');
    assert.equal((createCallArgs as any)?.data?.maintenanceScheduleId, 'sch-1');
    assert.deepEqual(json.data.equipment, { id: 'eq-1', name: 'Pump 1', inventoryNumber: 'INV-1' });
    assert.deepEqual(json.data.maintenanceSchedule, { id: 'sch-1', title: 'Quarterly Maintenance' });
  });
});
