import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrmRequestDeepLink } from '../prm-navigation';
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

let currentUser: JwtUserPayload | null = null;
let requestRecord: any;
let duplicateRecord: any = null;
let operationCreates: any[] = [];
let deliveryCreates: any[] = [];
let stockUpserts: any[] = [];
let itemUpdates: any[] = [];
let requestUpdates: any[] = [];
let transactionCalls = 0;
let transactionFailure: Error | null = null;
let auditEvents: any[] = [];
let notificationCreates: any[] = [];

const prismaMock: any = {
  $transaction: async (callback: (tx: any) => Promise<unknown>) => {
    transactionCalls += 1;
    if (transactionFailure) throw transactionFailure;
    return callback(prismaMock);
  },
  purchaseDelivery: {
    findUnique: async () => duplicateRecord,
    create: async (args: any) => {
      deliveryCreates.push(args);
      return {
        id: 'delivery-1',
        ...args.data,
        items: args.data.items.create,
        stockOperation: { id: 'operation-1', type: OperationType.RECEIPT },
      };
    },
  },
  purchaseRequest: {
    findUnique: async () => requestRecord,
    update: async (args: any) => {
      requestUpdates.push(args);
      return { ...requestRecord, status: args.data.status };
    },
    updateMany: async (args: any) => {
      requestUpdates.push(args);
      if (args.where?.id && args.where.id !== requestRecord.id) return { count: 0 };
      if (args.where?.status?.in && !args.where.status.in.includes(requestRecord.status)) return { count: 0 };
      if (args.data?.status) {
        requestRecord = { ...requestRecord, status: args.data.status };
      }
      return { count: 1 };
    },
  },
  stockOperation: {
    create: async (args: any) => {
      operationCreates.push(args);
      return { id: 'operation-1', type: OperationType.RECEIPT };
    },
  },
  stockItem: {
    upsert: async (args: any) => {
      stockUpserts.push(args);
      return { id: 'stock-1' };
    },
  },
  purchaseRequestItem: {
    update: async (args: any) => {
      itemUpdates.push(args);
      return { id: args.where.id, ...args.data };
    },
  },
  notification: {
    create: async (args: any) => {
      notificationCreates.push(args);
      return { id: 'notification-1' };
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
    logAuditEvent: async (event: unknown) => auditEvents.push(event),
  },
});
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    isAdminUser: (user: JwtUserPayload | null) => Boolean(user?.roles.includes('admin')),
    unauthorizedResponse: () => Response.json({ success: false }, { status: 401 }),
    forbiddenResponse: (message = 'Forbidden') => Response.json({ success: false, error: message }, { status: 403 }),
  },
});

const operator: JwtUserPayload = {
  userId: 'mol-1',
  ldapLogin: 'mol',
  displayName: 'Warehouse MOL',
  roles: ['storekeeper'],
  permissions: [PERMISSIONS.WMS_OPERATIONS_CREATE],
};
const viewer: JwtUserPayload = { ...operator, permissions: [PERMISSIONS.WMS_STOCK_VIEW] };

let deliveryPOST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

before(async () => {
  const route = await import('@/app/api/prm/requests/[id]/deliveries/route');
  deliveryPOST = route.POST as unknown as typeof deliveryPOST;
});

function resetState(status: string = PurchaseRequestStatus.APPROVED) {
  currentUser = null;
  requestRecord = {
    id: 'request-1',
    requestNumber: 'PR-20260902-ABC123',
    status,
    requesterId: 'requester-1',
    targetWarehouseId: 'warehouse-1',
    targetWarehouse: { id: 'warehouse-1', name: 'Main', code: 'MAIN', responsibleUserId: 'mol-1' },
    items: [{ id: 'request-item-1', nomenclatureId: 'nom-1', requestedQty: 10, receivedQty: 0, nomenclature: { id: 'nom-1', name: 'Bearing', unit: 'pcs' } }],
  };
  duplicateRecord = null;
  operationCreates = [];
  deliveryCreates = [];
  stockUpserts = [];
  itemUpdates = [];
  requestUpdates = [];
  transactionCalls = 0;
  transactionFailure = null;
  auditEvents = [];
  notificationCreates = [];
}

function context(id = 'request-1') {
  return { params: Promise.resolve({ id }) };
}

function request(body: unknown) {
  return makeRequest({ method: 'POST', url: 'http://localhost:3000/api/prm/test', body });
}

function validBody() {
  return {
    idempotencyKey: 'delivery-key-1',
    supplierName: 'Supplier',
    document: 'INV-1',
    items: [{ requestItemId: 'request-item-1', nomenclatureId: 'nom-1', receivedQty: 4, actualPrice: 12 }],
  };
}

describe('POST /api/prm/requests/[id]/deliveries', () => {
  test('returns 401 for anonymous requests', async () => {
    resetState();
    const response = await deliveryPOST(request(validBody()), context());
    assert.equal(response.status, 401);
  });

  test('returns 403 without delivery permission', async () => {
    resetState();
    currentUser = viewer;
    const response = await deliveryPOST(request(validBody()), context());
    assert.equal(response.status, 403);
  });

  test('returns 400 for missing idempotency key and zero quantity', async () => {
    resetState();
    currentUser = operator;
    const missingKey = await deliveryPOST(request({ items: validBody().items }), context());
    assert.equal(missingKey.status, 400);
    const zeroQty = await deliveryPOST(request({ ...validBody(), idempotencyKey: 'key-2', items: [{ ...validBody().items[0], receivedQty: 0 }] }), context());
    assert.equal(zeroQty.status, 400);
  });

  test('rejects delivery over requested quantity', async () => {
    resetState();
    currentUser = operator;
    const response = await deliveryPOST(request({ ...validBody(), items: [{ ...validBody().items[0], receivedQty: 11 }] }), context());
    assert.equal(response.status, 400);
    assert.equal(transactionCalls, 0);
  });

  test('creates one receipt, increments stock, updates receivedQty and status atomically', async () => {
    resetState();
    currentUser = operator;
    const response = await deliveryPOST(request(validBody()), context());
    assert.equal(response.status, 200);
    assert.equal(transactionCalls, 1);
    assert.equal(operationCreates.length, 1);
    assert.equal(operationCreates[0].data.type, OperationType.RECEIPT);
    assert.equal(stockUpserts.length, 1);
    assert.equal(stockUpserts[0].update.quantity.increment, 4);
    assert.equal(itemUpdates[0].data.receivedQty, 4);
    const statusUpdate = requestUpdates.find((u) => u.data?.status);
    assert.ok(statusUpdate);
    assert.equal(statusUpdate.data.status, PurchaseRequestStatus.PARTIALLY_DELIVERED);
    assert.equal(deliveryCreates.length, 1);
    assert.equal(auditEvents.length, 1);
    assert.equal(notificationCreates.length, 1);
    assert.equal(notificationCreates[0].data.link, buildPrmRequestDeepLink('request-1'));
  });

  test('returns the existing delivery for a repeated idempotency key without opening a transaction', async () => {
    resetState();
    currentUser = operator;
    duplicateRecord = { id: 'delivery-existing', idempotencyKey: 'delivery-key-1' };
    const response = await deliveryPOST(request(validBody()), context());
    const body = (await response.json()) as { duplicate: boolean; data: { id: string } };
    assert.equal(response.status, 200);
    assert.equal(body.duplicate, true);
    assert.equal(body.data.id, 'delivery-existing');
    assert.equal(transactionCalls, 0);
    assert.equal(operationCreates.length, 0);
  });

  test('rejects a CLOSED request before any delivery side effect', async () => {
    resetState(PurchaseRequestStatus.CLOSED);
    currentUser = operator;
    const response = await deliveryPOST(request(validBody()), context());
    assert.equal(response.status, 400);
    assert.equal(operationCreates.length, 0);
    assert.equal(stockUpserts.length, 0);
    assert.equal(itemUpdates.length, 0);
    assert.equal(requestUpdates.length, 0);
    assert.equal(deliveryCreates.length, 0);
    assert.equal(auditEvents.length, 0);
    assert.equal(notificationCreates.length, 0);
    assert.equal(transactionCalls, 0);
  });

  test('rolls back all persistence work when the transaction fails', async () => {
    resetState();
    currentUser = operator;
    transactionFailure = new Error('transaction failed');
    const response = await deliveryPOST(request(validBody()), context());
    assert.equal(response.status, 500);
    assert.equal(operationCreates.length, 0);
    assert.equal(deliveryCreates.length, 0);
    assert.equal(stockUpserts.length, 0);
    assert.equal(itemUpdates.length, 0);
    assert.equal(requestUpdates.length, 0);
  });
});
