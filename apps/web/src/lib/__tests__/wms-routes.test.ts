/**
 * M3 Wave 1 — API route tests: WMS transfers and operations.
 *
 * Contract under test for every route:
 *   • anonymous request (no token) → 401
 *   • authenticated user without required permission → 403
 *   • authenticated user with required permission → 2xx with expected shape
 *
 * No real PostgreSQL connection is opened; prisma is fully mocked via
 * mock.module('@ems/database'). Rate limiting is bypassed via mock of
 * '@/lib/rate-limit'. Auth is bypassed via mock of '@/lib/auth-guard'.
 *
 * Requires TSX_TSCONFIG_PATH=apps/web/tsconfig.json (set by test-runner.mjs).
 */
import { test, describe, before, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS } from '@ems/shared';
import { adminUser, wmsUser, viewOnlyUser, makeRequest, makePrismaMock } from './helpers/route-harness';

// ── Shared state ─────────────────────────────────────────────────────────────
let dbConnectionAttempts = 0;
const prismaMock = makePrismaMock();

// Track original $connect to count attempts
const originalConnect = prismaMock.$connect;
prismaMock.$connect = async () => {
  dbConnectionAttempts += 1;
  return originalConnect();
};

// ── Mock: @ems/database ───────────────────────────────────────────────────────
// Must be called before any dynamic import of a module that uses prisma.
mock.module('@ems/database', {
  namedExports: {
    prisma: prismaMock,
    StockTransferStatus: {
      DRAFT: 'DRAFT', PENDING: 'PENDING', DISPATCHED: 'DISPATCHED',
      RECEIVED: 'RECEIVED', REJECTED: 'REJECTED',
    },
    OperationType: {
      ISSUE: 'ISSUE', RECEIPT: 'RECEIPT', RETURN: 'RETURN',
      WRITE_OFF: 'WRITE_OFF', ADJUSTMENT: 'ADJUSTMENT', INVENTORY: 'INVENTORY',
    },
    Prisma: { SortOrder: { asc: 'asc', desc: 'desc' } },
  },
});

// ── Mock: @/lib/rate-limit (bypass; test rate-limit separately) ───────────────
mock.module('@/lib/rate-limit', {
  namedExports: {
    enforceRateLimit: async () => null, // null = no limit hit
  },
});

// ── Mock: @/lib/logger ───────────────────────────────────────────────────────
mock.module('@/lib/logger', {
  namedExports: {
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  },
});

// ── Mock: @ems/auth ───────────────────────────────────────────────────────────
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: { permissions: string[] }, perm: string) =>
      user.permissions.includes(perm),
    logAuditEvent: async () => {},
  },
});

// ── Current auth state ────────────────────────────────────────────────────────
let currentUser: typeof adminUser | typeof wmsUser | typeof viewOnlyUser | null = null;

mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    unauthorizedResponse: () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    forbiddenResponse: () =>
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
  },
});

// Helper mocks for wms services
mock.module('@/lib/wms-transfers-service', {
  namedExports: {
    generateTransferNumber: () => 'TRF-0001',
    buildTransferWhereInput: () => ({}),
    getTransferTabCounts: async () => ({ inbound: 0, outbound: 0, requests: 0, my_requests: 0 }),
    isTransfersAdmin: () => true,
    resolveUserWarehouseIds: async () => undefined,
  },
});

mock.module('@/lib/wms-operations-service', {
  namedExports: {
    isOperationsAdmin: () => true,
    buildOperationsWhereInput: () => ({}),
  },
});

// ── Route modules (dynamic imports after mock.module) ────────────────────────
let transfersGET: (req: Request) => Promise<Response>;
let transfersPOST: (req: Request) => Promise<Response>;
let operationsGET: (req: Request) => Promise<Response>;

before(async () => {
  const transfersRoute = await import('@/app/api/wms/transfers/route');
  transfersGET = transfersRoute.GET as unknown as (req: Request) => Promise<Response>;
  transfersPOST = transfersRoute.POST as unknown as (req: Request) => Promise<Response>;

  const operationsRoute = await import('@/app/api/wms/operations/route');
  operationsGET = operationsRoute.GET as unknown as (req: Request) => Promise<Response>;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/wms/transfers', () => {
  test('returns 401 for anonymous requests', async () => {
    currentUser = null;
    const res = await transfersGET(makeRequest({ url: 'http://localhost/api/wms/transfers' }));
    assert.equal(res.status, 401);
  });

  test('returns 403 when user lacks WMS_STOCK_VIEW', async () => {
    currentUser = viewOnlyUser; // has EPS_EQUIPMENT_VIEW, not WMS_STOCK_VIEW
    const res = await transfersGET(makeRequest({ url: 'http://localhost/api/wms/transfers' }));
    assert.equal(res.status, 403);
  });

  test('returns 200 with transfers list for authorized user', async () => {
    currentUser = wmsUser;
    prismaMock.stockTransfer.count = async () => 2;
    prismaMock.stockTransfer.findMany = async () => [
      { id: 'tr-1', number: 'TRF-0001' },
      { id: 'tr-2', number: 'TRF-0002' },
    ];
    const res = await transfersGET(makeRequest({ url: 'http://localhost/api/wms/transfers' }));
    assert.equal(res.status, 200);
    const body = await res.json() as { success: boolean; data: { items: unknown[]; total: number } };
    assert.equal(body.success, true);
    assert.equal(body.data.total, 2);
    assert.equal(body.data.items.length, 2);
  });

  test('does not open a real database connection', () => {
    assert.equal(dbConnectionAttempts, 0);
  });
});

describe('POST /api/wms/transfers', () => {
  test('returns 401 for anonymous requests', async () => {
    currentUser = null;
    const res = await transfersPOST(makeRequest({
      method: 'POST',
      url: 'http://localhost/api/wms/transfers',
      body: { type: 'TRANSFER' },
    }));
    assert.equal(res.status, 401);
  });

  test('returns 403 when user lacks WMS_OPERATIONS_CREATE', async () => {
    // viewOnlyUser has neither WMS_STOCK_VIEW nor WMS_OPERATIONS_CREATE
    currentUser = viewOnlyUser;
    const res = await transfersPOST(makeRequest({
      method: 'POST',
      url: 'http://localhost/api/wms/transfers',
      body: { type: 'TRANSFER', sourceWarehouseId: 'wh-1', targetWarehouseId: 'wh-2', items: [] },
    }));
    assert.equal(res.status, 403);
  });
});

describe('GET /api/wms/operations', () => {
  test('returns 401 for anonymous requests', async () => {
    currentUser = null;
    const res = await operationsGET(makeRequest({ url: 'http://localhost/api/wms/operations' }));
    assert.equal(res.status, 401);
  });

  test('returns 403 when user lacks WMS_STOCK_VIEW', async () => {
    currentUser = viewOnlyUser;
    const res = await operationsGET(makeRequest({ url: 'http://localhost/api/wms/operations' }));
    assert.equal(res.status, 403);
  });

  test('returns 200 with operations list for authorized user', async () => {
    currentUser = wmsUser;
    prismaMock.stockOperation.count = async () => 1;
    prismaMock.stockOperation.findMany = async () => [{ id: 'op-1', type: 'ISSUE' }];
    const res = await operationsGET(makeRequest({ url: 'http://localhost/api/wms/operations' }));
    assert.equal(res.status, 200);
    const body = await res.json() as { success: boolean; data: { items: unknown[]; total: number } };
    assert.equal(body.success, true);
    assert.equal(body.data.total, 1);
  });

  test('does not open a real database connection', () => {
    assert.equal(dbConnectionAttempts, 0);
  });
});
