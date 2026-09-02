import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

const PurchaseRequestStatus = {
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  PARTIALLY_DELIVERED: 'PARTIALLY_DELIVERED',
  DELIVERED: 'DELIVERED',
  CLOSED: 'CLOSED',
} as const;

const OperationType = { RECEIPT: 'RECEIPT' } as const;

interface RequestItemState {
  id: string;
  nomenclatureId: string;
  requestedQty: number;
  receivedQty: number;
  nomenclature: { id: string; name: string; unit: string };
}

interface SharedState {
  request: {
    id: string;
    requestNumber: string;
    status: string;
    requesterId: string;
    targetWarehouseId: string;
    closedAt: Date | null;
    closedById: string | null;
    targetWarehouse: { id: string; name: string; code: string; responsibleUserId: string };
    requester: { id: string; displayName: string; ldapLogin: string };
    closedBy: { id: string; displayName: string; ldapLogin: string } | null;
    items: RequestItemState[];
  };
  stockOperations: any[];
  stockItems: Map<string, number>;
  deliveries: any[];
  auditLogs: any[];
  notifications: any[];
}

let sharedState: SharedState;
let currentUser: JwtUserPayload | null = null;
let transactionQueue = Promise.resolve();

function cloneState(state: SharedState): SharedState {
  return {
    request: {
      ...state.request,
      items: state.request.items.map((i) => ({ ...i, nomenclature: { ...i.nomenclature } })),
      targetWarehouse: { ...state.request.targetWarehouse },
      requester: { ...state.request.requester },
      closedBy: state.request.closedBy ? { ...state.request.closedBy } : null,
    },
    stockOperations: [...state.stockOperations],
    stockItems: new Map(state.stockItems),
    deliveries: [...state.deliveries],
    auditLogs: [...state.auditLogs],
    notifications: [...state.notifications],
  };
}

const prismaMock: any = {
  $transaction: async (callback: (tx: any) => Promise<unknown>) => {
    const previous = transactionQueue;
    let release!: () => void;
    transactionQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;

    const snapshot = cloneState(sharedState);
    try {
      return await callback(prismaMock);
    } catch (error) {
      sharedState = snapshot;
      throw error;
    } finally {
      release();
    }
  },
  purchaseDelivery: {
    findUnique: async (args: any) => {
      return sharedState.deliveries.find((d) => d.idempotencyKey === args.where.idempotencyKey) ?? null;
    },
    create: async (args: any) => {
      const record = {
        id: `delivery-${sharedState.deliveries.length + 1}`,
        ...args.data,
        items: args.data.items?.create ?? [],
        stockOperation: { id: args.data.stockOperationId, type: OperationType.RECEIPT },
      };
      sharedState.deliveries.push(record);
      return record;
    },
  },
  purchaseRequest: {
    findUnique: async (args: any) => {
      if (args.where.id !== sharedState.request.id) return null;
      return {
        ...sharedState.request,
        items: sharedState.request.items.map((i) => ({ ...i, nomenclature: { ...i.nomenclature } })),
        closedBy: sharedState.request.closedById
          ? { id: sharedState.request.closedById, displayName: 'Admin', ldapLogin: 'admin' }
          : null,
      };
    },
    updateMany: async (args: any) => {
      const { where, data } = args;
      if (where.id !== sharedState.request.id) return { count: 0 };
      if (where.status) {
        if (typeof where.status === 'string' && sharedState.request.status !== where.status) {
          return { count: 0 };
        }
        if (where.status.in && !where.status.in.includes(sharedState.request.status)) {
          return { count: 0 };
        }
      }
      if (data.status) sharedState.request.status = data.status;
      if (data.closedAt !== undefined) sharedState.request.closedAt = data.closedAt;
      if (data.closedById !== undefined) sharedState.request.closedById = data.closedById;
      return { count: 1 };
    },
  },
  stockOperation: {
    create: async (args: any) => {
      const record = { id: `op-${sharedState.stockOperations.length + 1}`, ...args.data };
      sharedState.stockOperations.push(record);
      return record;
    },
  },
  stockItem: {
    upsert: async (args: any) => {
      const key = `${args.where.warehouseId_nomenclatureId.warehouseId}:${args.where.warehouseId_nomenclatureId.nomenclatureId}`;
      const current = sharedState.stockItems.get(key) || 0;
      const next = current + (args.update?.quantity?.increment || args.create.quantity);
      sharedState.stockItems.set(key, next);
      return { id: `stock-${key}`, quantity: next };
    },
  },
  purchaseRequestItem: {
    update: async (args: any) => {
      const item = sharedState.request.items.find((i) => i.id === args.where.id);
      if (!item) throw new Error('Item not found');
      if (args.data.receivedQty !== undefined) item.receivedQty = args.data.receivedQty;
      if (args.data.actualPrice !== undefined) (item as any).actualPrice = args.data.actualPrice;
      return item;
    },
  },
  auditLog: {
    create: async (args: any) => {
      sharedState.auditLogs.push(args.data);
      return { id: `audit-${sharedState.auditLogs.length}`, ...args.data };
    },
  },
  notification: {
    create: async (args: any) => {
      sharedState.notifications.push(args.data);
      return { id: `notif-${sharedState.notifications.length}`, ...args.data };
    },
  },
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock, OperationType, PurchaseRequestStatus } });
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/logger', { namedExports: { logger: { warn: () => {}, error: () => {} } } });
mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, message: string) => Response.json({ success: false, error: message }, { status: 500 }),
  },
});
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: JwtUserPayload | null, permission: string) => Boolean(user?.permissions.includes(permission)),
    logAuditEvent: async (event: any) => {
      sharedState.auditLogs.push(event);
    },
  },
});
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    requireAuth: async () => {
      if (!currentUser) {
        return { user: null, errorResponse: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
      }
      return { user: currentUser, errorResponse: null };
    },
    isAdminUser: (user: JwtUserPayload | null) => Boolean(user?.roles.includes('admin')),
    unauthorizedResponse: () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    forbiddenResponse: (message = 'Forbidden') => Response.json({ success: false, error: message }, { status: 403 }),
  },
});

const adminUser: JwtUserPayload = {
  userId: 'admin-1',
  ldapLogin: 'admin',
  displayName: 'Admin User',
  roles: ['admin'],
  permissions: [PERMISSIONS.PRM_REQUESTS_MANAGE, PERMISSIONS.WMS_OPERATIONS_CREATE],
};

let deliveryPOST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
let closePOST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

before(async () => {
  const deliveryRoute = await import('@/app/api/prm/requests/[id]/deliveries/route');
  const closeRoute = await import('@/app/api/prm/requests/[id]/close/route');
  deliveryPOST = deliveryRoute.POST as unknown as typeof deliveryPOST;
  closePOST = closeRoute.POST as unknown as typeof closePOST;
});

function resetSharedState(initialStatus: string, initialRequested: number, initialReceived: number) {
  currentUser = adminUser;
  transactionQueue = Promise.resolve();
  sharedState = {
    request: {
      id: 'req-conc-1',
      requestNumber: 'PR-CONC-001',
      status: initialStatus,
      requesterId: 'requester-1',
      targetWarehouseId: 'wh-1',
      closedAt: null,
      closedById: null,
      targetWarehouse: { id: 'wh-1', name: 'Main WH', code: 'MWH', responsibleUserId: 'admin-1' },
      requester: { id: 'requester-1', displayName: 'Requester', ldapLogin: 'req1' },
      closedBy: null,
      items: [
        {
          id: 'item-1',
          nomenclatureId: 'nom-1',
          requestedQty: initialRequested,
          receivedQty: initialReceived,
          nomenclature: { id: 'nom-1', name: 'Bearing', unit: 'pcs' },
        },
      ],
    },
    stockOperations: [],
    stockItems: new Map(),
    deliveries: [],
    auditLogs: [],
    notifications: [],
  };
}

function postRequest(url: string, body: unknown) {
  return makeRequest({ method: 'POST', url, body });
}

function context(id = 'req-conc-1') {
  return { params: Promise.resolve({ id }) };
}

describe('PRM Concurrency: Delivery vs Explicit Close Coordination', () => {
  beforeEach(() => {
    currentUser = adminUser;
  });

  test('delivery commits to DELIVERED, then close commits to CLOSED serially', async () => {
    // Request is in progress with 5/10 received
    resetSharedState(PurchaseRequestStatus.IN_PROGRESS, 10, 5);

    const deliveryPayload = {
      idempotencyKey: 'conc-del-1',
      supplierName: 'Supplier A',
      items: [{ requestItemId: 'item-1', nomenclatureId: 'nom-1', receivedQty: 5 }],
    };

    // 1. Delivery executes and completes the order
    const deliveryRes = await deliveryPOST(
      postRequest('http://localhost/api/prm/requests/req-conc-1/deliveries', deliveryPayload),
      context(),
    );
    assert.equal(deliveryRes.status, 200);
    assert.equal(sharedState.request.status, PurchaseRequestStatus.DELIVERED);
    assert.equal(sharedState.request.items[0].receivedQty, 10);
    assert.equal(sharedState.deliveries.length, 1);
    assert.equal(sharedState.stockOperations.length, 1);

    // 2. Close executes against the DELIVERED request
    const closeRes = await closePOST(
      postRequest('http://localhost/api/prm/requests/req-conc-1/close', {}),
      context(),
    );
    assert.equal(closeRes.status, 200);
    assert.equal(sharedState.request.status, PurchaseRequestStatus.CLOSED);
    assert.ok(sharedState.request.closedAt instanceof Date);
    assert.equal(sharedState.request.closedById, adminUser.userId);
  });

  test('when close commits first to CLOSED, an in-flight delivery rolls back with 0 side effects and never reopens CLOSED', async () => {
    // Request was already delivered (10/10) and is now closed
    resetSharedState(PurchaseRequestStatus.DELIVERED, 10, 10);

    // Close wins and marks the request CLOSED
    const closeRes = await closePOST(
      postRequest('http://localhost/api/prm/requests/req-conc-1/close', {}),
      context(),
    );
    assert.equal(closeRes.status, 200);
    assert.equal(sharedState.request.status, PurchaseRequestStatus.CLOSED);

    const initialDeliveriesCount = sharedState.deliveries.length;
    const initialOperationsCount = sharedState.stockOperations.length;
    const initialStockMap = new Map(sharedState.stockItems);
    const initialAuditLogsCount = sharedState.auditLogs.length;

    // In-flight / stale delivery arrives attempting to execute
    const staleDeliveryPayload = {
      idempotencyKey: 'stale-del-key',
      supplierName: 'Late Supplier',
      items: [{ requestItemId: 'item-1', nomenclatureId: 'nom-1', receivedQty: 1 }],
    };

    const deliveryRes = await deliveryPOST(
      postRequest('http://localhost/api/prm/requests/req-conc-1/deliveries', staleDeliveryPayload),
      context(),
    );

    // Delivery must be rejected with 400 (if caught pre-tx) or 409 (if caught in tx)
    assert.ok(deliveryRes.status === 400 || deliveryRes.status === 409);

    // Critical assertion: Status is NEVER overwritten from CLOSED to DELIVERED or PARTIALLY_DELIVERED
    assert.equal(sharedState.request.status, PurchaseRequestStatus.CLOSED);

    // Zero stock, delivery, operation, item, or audit side effects from delivery
    assert.equal(sharedState.deliveries.length, initialDeliveriesCount);
    assert.equal(sharedState.stockOperations.length, initialOperationsCount);
    assert.deepEqual([...sharedState.stockItems.entries()], [...initialStockMap.entries()]);
    assert.equal(sharedState.auditLogs.length, initialAuditLogsCount);
    assert.equal(sharedState.request.items[0].receivedQty, 10);
  });

  test('concurrent delivery and close contenders produce strictly valid serial outcomes under Promise.all', async () => {
    resetSharedState(PurchaseRequestStatus.PARTIALLY_DELIVERED, 10, 5);

    const deliveryPayload = {
      idempotencyKey: 'conc-del-pair',
      items: [{ requestItemId: 'item-1', nomenclatureId: 'nom-1', receivedQty: 5 }],
    };

    // Fire both simultaneously
    const [deliveryRes, closeRes] = await Promise.all([
      deliveryPOST(postRequest('http://localhost/api/prm/requests/req-conc-1/deliveries', deliveryPayload), context()),
      closePOST(postRequest('http://localhost/api/prm/requests/req-conc-1/close', {}), context()),
    ]);

    // Possible valid serialized outcomes:
    // Outcome A: Delivery ran first (200), transitioned to DELIVERED, then Close ran (200) -> Final CLOSED
    // Outcome B: Close ran first (400 because PARTIALLY_DELIVERED not DELIVERED), then Delivery ran (200) -> Final DELIVERED
    if (deliveryRes.status === 200 && closeRes.status === 200) {
      assert.equal(sharedState.request.status, PurchaseRequestStatus.CLOSED);
      assert.equal(sharedState.request.items[0].receivedQty, 10);
      assert.equal(sharedState.deliveries.length, 1);
    } else if (closeRes.status === 400 && deliveryRes.status === 200) {
      assert.equal(sharedState.request.status, PurchaseRequestStatus.DELIVERED);
      assert.equal(sharedState.request.items[0].receivedQty, 10);
      assert.equal(sharedState.deliveries.length, 1);
    } else {
      assert.fail(`Unexpected concurrency status combination: delivery=${deliveryRes.status}, close=${closeRes.status}`);
    }

    // Never in an invalid or overwritten status
    assert.ok(
      sharedState.request.status === PurchaseRequestStatus.CLOSED ||
      sharedState.request.status === PurchaseRequestStatus.DELIVERED,
    );
  });

  test('two concurrent deliveries with stale pre-transaction snapshots reconcile receivedQty, status, and stock', async () => {
    // Request has 10 units requested, 0 received
    resetSharedState(PurchaseRequestStatus.APPROVED, 10, 0);

    const delivery1Payload = {
      idempotencyKey: 'conc-del-stale-1',
      supplierName: 'Supplier 1',
      items: [{ requestItemId: 'item-1', nomenclatureId: 'nom-1', receivedQty: 4, actualPrice: 100 }],
    };

    const delivery2Payload = {
      idempotencyKey: 'conc-del-stale-2',
      supplierName: 'Supplier 2',
      items: [{ requestItemId: 'item-1', nomenclatureId: 'nom-1', receivedQty: 6, actualPrice: 105 }],
    };

    // Both deliveries execute concurrently under Promise.all:
    // Both obtain pre-transaction snapshots where receivedQty === 0.
    // They then serialize on the transaction claim/lock.
    const [res1, res2] = await Promise.all([
      deliveryPOST(postRequest('http://localhost/api/prm/requests/req-conc-1/deliveries', delivery1Payload), context()),
      deliveryPOST(postRequest('http://localhost/api/prm/requests/req-conc-1/deliveries', delivery2Payload), context()),
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    // Sum of deliveries must equal exactly 10 (4 + 6), not 6 or 4
    assert.equal(sharedState.request.items[0].receivedQty, 10);
    assert.equal(sharedState.request.status, PurchaseRequestStatus.DELIVERED);
    assert.equal(sharedState.deliveries.length, 2);
    assert.equal(sharedState.stockOperations.length, 2);
    assert.equal(sharedState.stockItems.get('wh-1:nom-1'), 10);
  });

  test('stale pre-transaction snapshot over-receipt attempt is rejected in transaction with zero side effects', async () => {
    // Request has 10 units requested, 0 received
    resetSharedState(PurchaseRequestStatus.APPROVED, 10, 0);

    const delivery1Payload = {
      idempotencyKey: 'conc-del-over-1',
      supplierName: 'Supplier 1',
      items: [{ requestItemId: 'item-1', nomenclatureId: 'nom-1', receivedQty: 6, actualPrice: 100 }],
    };

    const delivery2Payload = {
      idempotencyKey: 'conc-del-over-2',
      supplierName: 'Supplier 2',
      items: [{ requestItemId: 'item-1', nomenclatureId: 'nom-1', receivedQty: 6, actualPrice: 105 }],
    };

    // Both pass preflight validation because both see receivedQty === 0 (remaining 10 >= 6).
    // D1 runs and claims the transaction, updates receivedQty to 6.
    // D2 serializes, re-reads locked request, sees remaining is 4 (< 6), and aborts.
    const [res1, res2] = await Promise.all([
      deliveryPOST(postRequest('http://localhost/api/prm/requests/req-conc-1/deliveries', delivery1Payload), context()),
      deliveryPOST(postRequest('http://localhost/api/prm/requests/req-conc-1/deliveries', delivery2Payload), context()),
    ]);

    const successfulRes = res1.status === 200 ? res1 : res2;
    const failedRes = res1.status === 200 ? res2 : res1;

    assert.equal(successfulRes.status, 200);
    assert.equal(failedRes.status, 400);

    const failedBody = (await failedRes.json()) as { success: boolean; error: string };
    assert.equal(failedBody.success, false);
    assert.match(failedBody.error, /Приёмка превышает остаток по позиции/);

    // Exactly 6 received, exactly 1 delivery, exactly 1 stock operation
    assert.equal(sharedState.request.items[0].receivedQty, 6);
    assert.equal(sharedState.request.status, PurchaseRequestStatus.PARTIALLY_DELIVERED);
    assert.equal(sharedState.deliveries.length, 1);
    assert.equal(sharedState.stockOperations.length, 1);
    assert.equal(sharedState.stockItems.get('wh-1:nom-1'), 6);
  });

  test('concurrent duplicate idempotency keys serialize and return existing delivery without duplicating stock', async () => {
    resetSharedState(PurchaseRequestStatus.APPROVED, 10, 0);

    const duplicatePayload = {
      idempotencyKey: 'conc-same-key-dup',
      supplierName: 'Supplier Identical',
      items: [{ requestItemId: 'item-1', nomenclatureId: 'nom-1', receivedQty: 5 }],
    };

    // Both pass preflight idempotency check concurrently before either commits.
    const [res1, res2] = await Promise.all([
      deliveryPOST(postRequest('http://localhost/api/prm/requests/req-conc-1/deliveries', duplicatePayload), context()),
      deliveryPOST(postRequest('http://localhost/api/prm/requests/req-conc-1/deliveries', duplicatePayload), context()),
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    const body1 = (await res1.json()) as { success: boolean; duplicate?: boolean };
    const body2 = (await res2.json()) as { success: boolean; duplicate?: boolean };

    assert.equal(body1.success, true);
    assert.equal(body2.success, true);
    // Exactly one was fresh, the other detected duplicate inside transaction
    const duplicateCount = (body1.duplicate ? 1 : 0) + (body2.duplicate ? 1 : 0);
    assert.equal(duplicateCount, 1);

    // Stock and deliveries must never be doubled
    assert.equal(sharedState.deliveries.length, 1);
    assert.equal(sharedState.stockOperations.length, 1);
    assert.equal(sharedState.stockItems.get('wh-1:nom-1'), 5);
    assert.equal(sharedState.request.items[0].receivedQty, 5);
  });
});
