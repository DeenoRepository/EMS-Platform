import { before, beforeEach, mock, test } from 'node:test';
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
let stockRows: unknown[] = [];
let stockFindArgs: unknown = null;

const prismaMock = {
  stockItem: {
    findMany: async (args: unknown) => {
      stockFindArgs = args;
      return stockRows;
    },
  },
  warehouse: {
    findMany: async () => [],
  },
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock, PurchaseRequestStatus } });
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    unauthorizedResponse: () => Response.json({ success: false }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false }, { status: 403 }),
    isAdminUser: (user: JwtUserPayload | null) => Boolean(user?.roles.includes('admin')),
  },
});
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: JwtUserPayload | null, permission: string) => Boolean(user?.permissions.includes(permission)),
  },
});
mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, message: string) => Response.json({ success: false, error: message }, { status: 500 }),
  },
});

const viewer: JwtUserPayload = {
  userId: 'viewer-1',
  ldapLogin: 'viewer',
  displayName: 'Viewer',
  roles: ['viewer'],
  permissions: [PERMISSIONS.PRM_REQUESTS_VIEW],
};

let shortagesGET: (request: Request) => Promise<Response>;

before(async () => {
  const route = await import('@/app/api/prm/shortages/route');
  shortagesGET = route.GET as unknown as typeof shortagesGET;
});

beforeEach(() => {
  currentUser = null;
  stockRows = [];
  stockFindArgs = null;
});

test('GET /api/prm/shortages returns 401 for anonymous requests', async () => {
  const response = await shortagesGET(makeRequest({ url: 'http://localhost/api/prm/shortages' }));
  assert.equal(response.status, 401);
});

test('GET /api/prm/shortages returns 403 without PRM permission', async () => {
  currentUser = { ...viewer, permissions: [] };
  const response = await shortagesGET(makeRequest({ url: 'http://localhost/api/prm/shortages' }));
  assert.equal(response.status, 403);
});

test('returns only rows with quantity strictly below minStock and excludes deleted nomenclature', async () => {
  currentUser = viewer;
  stockRows = [
    {
      id: 'stock-low', warehouseId: 'wh-1', nomenclatureId: 'nom-low', quantity: 3,
      nomenclature: { id: 'nom-low', name: 'Low', article: 'L-1', unit: 'pcs', minStock: 5, deletedAt: null },
      warehouse: { id: 'wh-1', name: 'Main', code: 'MAIN' },
    },
    {
      id: 'stock-equal', warehouseId: 'wh-1', nomenclatureId: 'nom-equal', quantity: 5,
      nomenclature: { id: 'nom-equal', name: 'Equal', article: 'E-1', unit: 'pcs', minStock: 5, deletedAt: null },
      warehouse: { id: 'wh-1', name: 'Main', code: 'MAIN' },
    },
    {
      id: 'stock-deleted', warehouseId: 'wh-1', nomenclatureId: 'nom-deleted', quantity: 1,
      nomenclature: { id: 'nom-deleted', name: 'Deleted', article: 'D-1', unit: 'pcs', minStock: 5, deletedAt: new Date() },
      warehouse: { id: 'wh-1', name: 'Main', code: 'MAIN' },
    },
  ];

  const response = await shortagesGET(makeRequest({ url: 'http://localhost/prm/shortages' }));
  const body = (await response.json()) as { success: boolean; data: Array<{ nomenclatureId: string; shortageQty: number }> };
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data, [{
    stockItemId: 'stock-low', warehouseId: 'wh-1', warehouseName: 'Main', warehouseCode: 'MAIN',
    nomenclatureId: 'nom-low', name: 'Low', article: 'L-1', unit: 'pcs', quantity: 3, minStock: 5, shortageQty: 2,
  }]);
});

test('does not query a foreign warehouse for a non-admin user', async () => {
  currentUser = viewer;
  const response = await shortagesGET(makeRequest({ url: 'http://localhost/prm/shortages', searchParams: { warehouseId: 'foreign-wh' } }));
  assert.equal(response.status, 200);
  assert.deepEqual((stockFindArgs as any).where.warehouseId, { in: [] });
});
