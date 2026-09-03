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
let findManyArgs: unknown = null;

const prismaMock = {
  purchaseRequest: {
    findMany: async (args: unknown) => {
      findManyArgs = args;
      return [{
        requestNumber: 'PR-1', status: PurchaseRequestStatus.DRAFT, priority: 'LOW',
        supplierName: 'Supplier, LLC', estimatedTotal: 100, currency: 'RUB',
        createdAt: new Date('2026-09-02T00:00:00.000Z'),
        targetWarehouse: { name: 'Main' }, requester: { displayName: 'User' }, items: [{ id: 'item-1' }],
      }];
    },
  },
  warehouse: { findMany: async () => [{ id: 'wh-1' }] },
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock, PurchaseRequestStatus } });
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    isAdminUser: (user: JwtUserPayload | null) => Boolean(user?.roles.includes('admin')),
    unauthorizedResponse: () => Response.json({ success: false }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false }, { status: 403 }),
  },
});
mock.module('@ems/auth', {
  namedExports: { hasPermission: (user: JwtUserPayload | null, permission: string) => Boolean(user?.permissions.includes(permission)) },
});
mock.module('@/lib/safe-error', {
  namedExports: { safeErrorResponse: (_error: unknown, message: string) => Response.json({ success: false, error: message }, { status: 500 }) },
});

const viewer: JwtUserPayload = {
  userId: 'viewer-1', ldapLogin: 'viewer', displayName: 'Viewer', roles: ['viewer'],
  permissions: [PERMISSIONS.PRM_REQUESTS_VIEW],
};
let exportGET: (request: Request) => Promise<Response>;

before(async () => {
  const route = await import('@/app/api/prm/requests/export/route');
  exportGET = route.GET as unknown as typeof exportGET;
});

beforeEach(() => {
  currentUser = null;
  findManyArgs = null;
});

test('GET /api/prm/requests/export returns 401 for anonymous requests', async () => {
  const response = await exportGET(makeRequest({ url: 'http://localhost/api/prm/requests/export' }));
  assert.equal(response.status, 401);
});

test('GET /api/prm/requests/export returns 403 without view or manage permission', async () => {
  currentUser = { ...viewer, permissions: [] };
  const response = await exportGET(makeRequest({ url: 'http://localhost/api/prm/requests/export' }));
  assert.equal(response.status, 403);
});

test('exports scoped requests as CSV with download headers and escaped values', async () => {
  currentUser = viewer;
  const response = await exportGET(makeRequest({
    url: 'http://localhost/api/prm/requests/export',
    searchParams: { scope: 'my_requests', warehouseId: 'wh-1' },
  }));
  const csv = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.match(csv, /^Номер заявки,Статус/);
  assert.match(csv, /"Supplier, LLC"/);
  assert.deepEqual((findManyArgs as any).where.OR, undefined);
  assert.equal((findManyArgs as any).where.requesterId, 'viewer-1');
});
