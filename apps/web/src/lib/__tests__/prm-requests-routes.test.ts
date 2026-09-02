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
});
