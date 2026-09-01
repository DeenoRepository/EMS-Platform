import { before, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

const StockTransferStatus = {
  REQUESTED: 'REQUESTED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

const OperationType = { TRANSFER: 'TRANSFER' } as const;

let currentUser: JwtUserPayload | null = null;
let transfer: any;
let stockByKey = new Map<string, any>();
let locationStockItem: any;
let cellsById = new Map<string, any>();
let stockUpdates: any[] = [];
let stockCreates: any[] = [];
let transferItemUpdates: any[] = [];
let transferUpdates: any[] = [];
let operationCreates: any[] = [];
let notificationCreates: any[] = [];
let auditEvents: any[] = [];
let transactionCalls = 0;
let transactionFailure: Error | null = null;

const operator: JwtUserPayload = {
  userId: 'operator-id',
  ldapLogin: 'operator',
  displayName: 'Warehouse Operator',
  roles: ['storekeeper'],
  permissions: [PERMISSIONS.WMS_OPERATIONS_CREATE, PERMISSIONS.WMS_ZONES_MANAGE],
};

const otherOperator: JwtUserPayload = {
  ...operator,
  userId: 'other-operator-id',
};

function hasPermission(user: JwtUserPayload | null, permission: string): boolean {
  return Boolean(user && (user.roles.includes('admin') || user.permissions.includes(permission)));
}

interface PrismaMock {
  $transaction: (callback: (tx: PrismaMock) => Promise<unknown>) => Promise<unknown>;
  stockTransfer: { findUnique: () => Promise<any>; update: (args: unknown) => Promise<any> };
  stockTransferItem: { update: (args: unknown) => Promise<any> };
  stockItem: {
    findUnique: (args: any) => Promise<any>;
    update: (args: unknown) => Promise<any>;
    create: (args: unknown) => Promise<any>;
  };
  stockOperation: { create: (args: unknown) => Promise<any> };
  storageCell: { findUnique: (args: any) => Promise<any> };
  notification: { create: (args: unknown) => Promise<any> };
}

const prismaMock: PrismaMock = {
  $transaction: async (callback) => {
    transactionCalls += 1;
    if (transactionFailure) throw transactionFailure;
    return callback(prismaMock);
  },
  stockTransfer: {
    findUnique: async () => transfer,
    update: async (args: unknown) => {
      transferUpdates.push(args);
      return { ...transfer, status: (args as any).data.status };
    },
  },
  stockTransferItem: {
    update: async (args: unknown) => {
      transferItemUpdates.push(args);
      return { id: (args as any).where.id, ...(args as any).data };
    },
  },
  stockItem: {
    findUnique: async (args: any) => {
      if (args?.where?.id) return locationStockItem;
      const key = `${args?.where?.warehouseId_nomenclatureId?.warehouseId}:${args?.where?.warehouseId_nomenclatureId?.nomenclatureId}`;
      return stockByKey.get(key) ?? null;
    },
    update: async (args: unknown) => {
      stockUpdates.push(args);
      return { id: (args as any).where.id, quantity: (args as any).data.quantity };
    },
    create: async (args: unknown) => {
      stockCreates.push(args);
      return { id: 'created-stock', ...(args as any).data };
    },
  },
  stockOperation: {
    create: async (args: unknown) => {
      operationCreates.push(args);
      return { id: 'operation-1' };
    },
  },
  storageCell: {
    findUnique: async (args: any) => cellsById.get(args?.where?.id) ?? null,
  },
  notification: {
    create: async (args: unknown) => {
      notificationCreates.push(args);
      return { id: 'notification-1' };
    },
  },
};

mock.module('@ems/database', {
  namedExports: { prisma: prismaMock, StockTransferStatus, OperationType },
});

mock.module('@ems/shared', {
  namedExports: { PERMISSIONS },
});

mock.module('@ems/auth', {
  namedExports: {
    hasPermission,
    logAuditEvent: async (event: unknown) => {
      auditEvents.push(event);
    },
  },
});

mock.module('@/lib/rate-limit', {
  namedExports: { enforceRateLimit: async () => null },
});

mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    isAdminUser: (user: JwtUserPayload) => user.roles.includes('admin') || user.roles.includes('administrator'),
    unauthorizedResponse: () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    forbiddenResponse: (message = 'Forbidden') => Response.json({ success: false, error: message }, { status: 403 }),
  },
});

mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, message: string) => Response.json({ success: false, error: message }, { status: 500 }),
  },
});

mock.module('@/lib/logger', {
  namedExports: {
    logger: { warn: () => {}, error: () => {}, info: () => {}, debug: () => {} },
  },
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

type Handler = (request: Request, context: RouteContext) => Promise<Response>;
const handlers: Record<string, Handler> = {};

before(async () => {
  const dispatch = await import('@/app/api/wms/transfers/[id]/dispatch/route');
  const receive = await import('@/app/api/wms/transfers/[id]/receive/route');
  const reject = await import('@/app/api/wms/transfers/[id]/reject/route');
  const location = await import('@/app/api/wms/stock/[id]/location/route');

  handlers.dispatch = dispatch.POST as unknown as Handler;
  handlers.receive = receive.POST as unknown as Handler;
  handlers.reject = reject.POST as unknown as Handler;
  handlers.location = location.PATCH as unknown as Handler;
});

function resetState() {
  currentUser = null;
  transfer = {
    id: 'transfer-1',
    transferNumber: 'TR-2026-0001',
    sourceWarehouseId: 'source-warehouse',
    targetWarehouseId: 'target-warehouse',
    createdById: 'requester-id',
    dispatchedById: 'sender-id',
    requestReason: 'production need',
    status: StockTransferStatus.REQUESTED,
    sourceWarehouse: { id: 'source-warehouse', code: 'SRC', name: 'Source', responsibleUserId: 'sender-id' },
    targetWarehouse: { id: 'target-warehouse', code: 'DST', name: 'Target', responsibleUserId: 'receiver-id' },
    createdBy: { id: 'requester-id', displayName: 'Requester' },
    dispatchedBy: { id: 'sender-id', displayName: 'Sender' },
    items: [{
      id: 'transfer-item-1',
      nomenclatureId: 'nom-1',
      quantity: 3,
      targetCellId: null,
      nomenclature: { id: 'nom-1', name: 'Bearing', unit: 'pcs' },
    }],
  };
  stockByKey = new Map([['source-warehouse:nom-1', { id: 'source-stock', quantity: 10, cellId: null, nomenclature: { name: 'Bearing', unit: 'pcs' } }]]);
  locationStockItem = {
    id: 'location-stock',
    warehouseId: 'source-warehouse',
    warehouse: { id: 'source-warehouse', name: 'Source', responsibleUserId: 'operator-id' },
  };
  cellsById = new Map([
    ['source-cell', { id: 'source-cell', zone: { warehouseId: 'source-warehouse' } }],
    ['foreign-cell', { id: 'foreign-cell', zone: { warehouseId: 'other-warehouse' } }],
  ]);
  stockUpdates = [];
  stockCreates = [];
  transferItemUpdates = [];
  transferUpdates = [];
  operationCreates = [];
  notificationCreates = [];
  auditEvents = [];
  transactionCalls = 0;
  transactionFailure = null;
}

function context(id = 'transfer-1'): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function request(method: string, body?: unknown) {
  return makeRequest({ method, body, url: 'http://localhost:3000/api/wms/test' });
}

function responseBody(response: Response) {
  return response.json() as Promise<Record<string, any>>;
}

test('covers WMS transfer lifecycle, stock invariants, and location ownership', async () => {
  resetState();

  // Dispatch authentication and warehouse ownership gates.
  let response = await handlers.dispatch(request('POST'), context());
  assert.equal(response.status, 401);

  currentUser = otherOperator;
  response = await handlers.dispatch(request('POST'), context());
  assert.equal(response.status, 403);
  assert.equal(transactionCalls, 0);

  currentUser = operator;
  response = await handlers.dispatch(request('POST'), context());
  assert.equal(response.status, 403);
  assert.equal(transactionCalls, 0);

  // Dispatch must reject insufficient stock without an update mutation.
  transfer.sourceWarehouse.responsibleUserId = 'operator-id';
  stockByKey.set('source-warehouse:nom-1', { id: 'source-stock', quantity: 2, cellId: null });
  response = await handlers.dispatch(request('POST'), context());
  assert.equal(response.status, 500);
  assert.equal(stockUpdates.length, 0);
  assert.equal(transferUpdates.length, 0);

  // Successful dispatch atomically decrements stock and changes status.
  resetState();
  currentUser = operator;
  transfer.sourceWarehouse.responsibleUserId = 'operator-id';
  response = await handlers.dispatch(request('POST'), context());
  let body = await responseBody(response);
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(transactionCalls, 1);
  assert.equal(stockUpdates[0].data.quantity, 7);
  assert.equal(transferUpdates[0].data.status, StockTransferStatus.IN_TRANSIT);
  assert.equal(auditEvents[0].changes.action, 'DISPATCH_APPROVED');
  assert.equal(notificationCreates.length, 1);

  // A repeated dispatch is rejected by the status transition guard.
  transfer.status = StockTransferStatus.IN_TRANSIT;
  response = await handlers.dispatch(request('POST'), context());
  assert.equal(response.status, 400);

  // Receive credits the destination, assigns the requested cell, and creates
  // one transfer operation inside the same transaction.
  resetState();
  currentUser = { ...operator, userId: 'receiver-id' };
  transfer.status = StockTransferStatus.IN_TRANSIT;
  stockByKey = new Map([['target-warehouse:nom-1', { id: 'target-stock', quantity: 4, cellId: null }]]);
  response = await handlers.receive(request('POST', {
    cellAllocations: [{ itemId: 'transfer-item-1', targetCellId: 'source-cell' }],
  }), context());
  body = await responseBody(response);
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(stockUpdates[0].data.quantity, 7);
  assert.equal(stockUpdates[0].data.cellId, 'source-cell');
  assert.equal(transferItemUpdates[0].data.targetCellId, 'source-cell');
  assert.equal(operationCreates.length, 1);
  assert.equal(operationCreates[0].data.type, OperationType.TRANSFER);
  assert.equal(transferUpdates[0].data.status, StockTransferStatus.COMPLETED);
  assert.equal(auditEvents[0].changes.action, 'RECEIPT_CONFIRMED');

  // Receiving an already completed transfer cannot duplicate the stock.
  transfer.status = StockTransferStatus.COMPLETED;
  response = await handlers.receive(request('POST', undefined), context());
  assert.equal(response.status, 400);
  assert.equal(stockUpdates.length, 1);

  // Rejecting an in-transit transfer restores the source stock and records the reason.
  resetState();
  currentUser = { ...operator, userId: 'receiver-id' };
  transfer.status = StockTransferStatus.IN_TRANSIT;
  transfer.dispatchedById = 'sender-id';
  stockByKey = new Map([['source-warehouse:nom-1', { id: 'source-stock', quantity: 7 }]]);
  response = await handlers.reject(request('POST', { reason: 'Damaged packaging' }), context());
  body = await responseBody(response);
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(stockUpdates[0].data.quantity, 10);
  assert.equal(transferUpdates[0].data.status, StockTransferStatus.REJECTED);
  assert.equal(transferUpdates[0].data.rejectionReason, 'Damaged packaging');
  assert.equal(auditEvents[0].changes.previousStatus, StockTransferStatus.IN_TRANSIT);

  // Rejection requires a meaningful reason and only valid statuses.
  resetState();
  currentUser = operator;
  transfer.sourceWarehouse.responsibleUserId = 'operator-id';
  response = await handlers.reject(request('POST', { reason: 'x' }), context());
  assert.equal(response.status, 400);
  assert.equal(transactionCalls, 0);

  transfer.status = StockTransferStatus.COMPLETED;
  response = await handlers.reject(request('POST', { reason: 'valid reason' }), context());
  assert.equal(response.status, 400);
  assert.equal(transactionCalls, 0);

  // Location updates require ownership plus zone permission.
  resetState();
  currentUser = operator;
  response = await handlers.location(request('PATCH', { cellId: 'foreign-cell' }), context('location-stock'));
  assert.equal(response.status, 400);
  assert.equal(stockUpdates.length, 0);

  currentUser = otherOperator;
  response = await handlers.location(request('PATCH', { cellId: 'source-cell' }), context('location-stock'));
  assert.equal(response.status, 403);
  assert.equal(stockUpdates.length, 0);
});

