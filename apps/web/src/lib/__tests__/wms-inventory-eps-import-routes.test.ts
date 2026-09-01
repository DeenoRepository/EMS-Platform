import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

const InventoryStatus = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

const EquipmentStatus = {
  ACTIVE: 'ACTIVE',
  UNDER_REPAIR: 'UNDER_REPAIR',
  IN_STORAGE: 'IN_STORAGE',
  DECOMMISSIONED: 'DECOMMISSIONED',
} as const;

const FieldType = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  DATE: 'DATE',
  BOOLEAN: 'BOOLEAN',
  SELECT: 'SELECT',
} as const;

const ApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

let currentUser: JwtUserPayload | null = null;
let currentInventory: any = null;
let refreshedInventoryItems: any[] = [];
let existingEquipmentByInventory = new Map<string, any>();
let existingEquipmentBySerial = new Map<string, any>();
let customSections: any[] = [];
let customFieldsByKey = new Map<string, any>();
let tagsByName = new Map<string, any>();
let inventoryItemUpdates: any[] = [];
let stockOperationCreates: any[] = [];
let stockUpserts: any[] = [];
let inventoryUpdates: any[] = [];
let equipmentCreates: any[] = [];
let equipmentUpdates: any[] = [];
let customFieldCreates: any[] = [];
let tagCreates: any[] = [];
let equipmentTagCreates: any[] = [];
let auditEvents: any[] = [];
let approval: any = null;
let approvalUpdates: any[] = [];
let approvalEquipmentUpdates: any[] = [];
let approvalNotifications: any[] = [];
let approvalTagDeletes: any[] = [];
let approvalTagCreates: any[] = [];
let transactionCalls = 0;

const authorizedUser: JwtUserPayload = {
  userId: 'inventory-manager',
  ldapLogin: 'inventory.manager',
  displayName: 'Inventory Manager',
  roles: ['storekeeper'],
  permissions: [
    PERMISSIONS.WMS_INVENTORY_MANAGE,
    PERMISSIONS.EPS_EQUIPMENT_CREATE,
    PERMISSIONS.EPS_IMPORT_EXECUTE,
  ],
};

const viewer: JwtUserPayload = {
  userId: 'viewer-id',
  ldapLogin: 'viewer',
  displayName: 'Viewer',
  roles: ['viewer'],
  permissions: [],
};

function hasPermission(user: JwtUserPayload | null, permission: string): boolean {
  return Boolean(user && (user.roles.includes('admin') || user.permissions.includes(permission)));
}

interface PrismaMock {
  $transaction: (callback: (tx: PrismaMock) => Promise<unknown>) => Promise<unknown>;
  inventory: { findUnique: (args: unknown) => Promise<any>; update: (args: unknown) => Promise<any> };
  inventoryItem: { update: (args: unknown) => Promise<any>; findMany: (args: unknown) => Promise<any[]> };
  stockOperation: { create: (args: unknown) => Promise<any> };
  stockItem: { upsert: (args: unknown) => Promise<any> };
  customSection: { findMany: () => Promise<any[]>; create: (args: unknown) => Promise<any> };
  customFieldDefinition: { findUnique: (args: any) => Promise<any>; create: (args: unknown) => Promise<any>; update: (args: unknown) => Promise<any> };
  tag: { findMany: () => Promise<any[]>; create: (args: unknown) => Promise<any> };
  equipment: {
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    create: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
  equipmentTag: {
    createMany: (args: unknown) => Promise<any>;
    upsert: (args: unknown) => Promise<any>;
    deleteMany: (args: unknown) => Promise<any>;
  };
  equipmentApproval: { findUnique: (args: unknown) => Promise<any>; update: (args: unknown) => Promise<any> };
  notification: { create: (args: unknown) => Promise<any> };
}

const prismaMock: PrismaMock = {
  $transaction: async (callback) => {
    transactionCalls += 1;
    return callback(prismaMock);
  },
  inventory: {
    findUnique: async () => currentInventory,
    update: async (args) => {
      inventoryUpdates.push(args);
      return { ...currentInventory, ...(args as any).data };
    },
  },
  inventoryItem: {
    update: async (args) => {
      inventoryItemUpdates.push(args);
      return { id: (args as any).where.id, ...(args as any).data };
    },
    findMany: async () => refreshedInventoryItems,
  },
  stockOperation: {
    create: async (args) => {
      stockOperationCreates.push(args);
      return { id: 'adjustment-1' };
    },
  },
  stockItem: {
    upsert: async (args) => {
      stockUpserts.push(args);
      return { id: 'stock-1' };
    },
  },
  customSection: {
    findMany: async () => customSections,
    create: async (args) => ({ id: 'section-created', ...(args as any).data }),
  },
  customFieldDefinition: {
    findUnique: async (args) => customFieldsByKey.get(args?.where?.key) ?? null,
    create: async (args) => {
      const created = { id: `field-${customFieldCreates.length + 1}`, ...(args as any).data };
      customFieldCreates.push(args);
      customFieldsByKey.set(created.key, created);
      return created;
    },
    update: async (args) => ({ id: (args as any).where.id, ...(args as any).data }),
  },
  tag: {
    findMany: async () => Array.from(tagsByName.values()),
    create: async (args) => {
      const created = { id: `tag-${tagCreates.length + 1}`, ...(args as any).data };
      tagCreates.push(args);
      tagsByName.set(created.name.toLowerCase(), created);
      return created;
    },
  },
  equipment: {
    findUnique: async (args) => existingEquipmentByInventory.get(args?.where?.inventoryNumber) ?? null,
    findFirst: async (args) => existingEquipmentBySerial.get(args?.where?.serialNumber) ?? null,
    create: async (args) => {
      const created = { id: `equipment-${equipmentCreates.length + 1}`, ...(args as any).data };
      equipmentCreates.push(args);
      return created;
    },
    update: async (args) => {
      equipmentUpdates.push(args);
      return { id: (args as any).where.id, ...(args as any).data };
    },
  },
  equipmentTag: {
    createMany: async (args) => {
      equipmentTagCreates.push(args);
      return { count: (args as any).data.length };
    },
    upsert: async (args) => {
      equipmentTagCreates.push(args);
      return { id: 'equipment-tag-1' };
    },
    deleteMany: async (args) => {
      approvalTagDeletes.push(args);
      return { count: 1 };
    },
  },
  equipmentApproval: {
    findUnique: async () => approval,
    update: async (args) => {
      approvalUpdates.push(args);
      return { ...approval, status: (args as any).data.status };
    },
  },
  notification: {
    create: async (args) => {
      approvalNotifications.push(args);
      return { id: 'approval-notification-1' };
    },
  },
};

mock.module('@ems/database', {
  namedExports: { prisma: prismaMock, InventoryStatus, EquipmentStatus, FieldType, ApprovalStatus },
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
  namedExports: { logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } },
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

type IdHandler = (request: Request, context: RouteContext) => Promise<Response>;
type RequestHandler = (request: Request) => Promise<Response>;
const handlers: {
  inventoryGET?: IdHandler;
  inventoryPATCH?: IdHandler;
  importPOST?: RequestHandler;
  approvalPATCH?: IdHandler;
} = {};

before(async () => {
  const inventory = await import('@/app/api/wms/inventories/[id]/route');
  const importExecute = await import('@/app/api/eps/import/execute/route');
  const approvalRoute = await import('@/app/api/eps/approvals/[id]/route');
  handlers.inventoryGET = inventory.GET as unknown as IdHandler;
  handlers.inventoryPATCH = inventory.PATCH as unknown as IdHandler;
  handlers.importPOST = importExecute.POST as unknown as RequestHandler;
  handlers.approvalPATCH = approvalRoute.PATCH as unknown as IdHandler;
});

beforeEach(() => {
  currentUser = null;
  currentInventory = {
    id: 'inventory-1',
    warehouseId: 'warehouse-1',
    status: InventoryStatus.DRAFT,
    warehouse: { id: 'warehouse-1', name: 'Main warehouse' },
    items: [
      { id: 'inventory-item-1', nomenclatureId: 'nom-1', expectedQty: 10, actualQty: null, diffQty: null, nomenclature: { id: 'nom-1', name: 'Bearing' } },
    ],
  };
  refreshedInventoryItems = [
    { id: 'inventory-item-1', nomenclatureId: 'nom-1', expectedQty: 10, actualQty: 8, diffQty: -2, nomenclature: { id: 'nom-1', name: 'Bearing' } },
  ];
  existingEquipmentByInventory = new Map();
  existingEquipmentBySerial = new Map();
  customSections = [];
  customFieldsByKey = new Map();
  tagsByName = new Map([['critical', { id: 'tag-existing', name: 'Critical' }]]);
  inventoryItemUpdates = [];
  stockOperationCreates = [];
  stockUpserts = [];
  inventoryUpdates = [];
  equipmentCreates = [];
  equipmentUpdates = [];
  customFieldCreates = [];
  tagCreates = [];
  equipmentTagCreates = [];
  auditEvents = [];
  approval = {
    id: 'approval-1',
    status: 'PENDING',
    requesterId: 'requester-1',
    reviewerId: null,
    equipmentId: 'equipment-1',
    title: 'Commission pump',
    type: 'COMMISSIONING',
    proposedData: { targetStatus: 'ACTIVE', name: ' Approved pump ' },
    equipment: {
      id: 'equipment-1', name: 'Draft pump', status: 'DRAFT', commissionDate: null, customFields: {},
    },
  };
  approvalUpdates = [];
  approvalEquipmentUpdates = [];
  approvalNotifications = [];
  approvalTagDeletes = [];
  approvalTagCreates = [];
  transactionCalls = 0;
});

function request(method: string, body?: unknown) {
  return makeRequest({ method, body, url: 'http://localhost:3000/api/o2-write-test' });
}

function context(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

describe('O2 EPS approval mutation contracts', { concurrency: false }, () => {
  const approver: JwtUserPayload = {
    ...authorizedUser,
    userId: 'reviewer-id',
    permissions: [PERMISSIONS.EPS_APPROVALS_MANAGE],
  };

  test('requires authentication and rejects an invalid status before persistence', async () => {
    assert.equal((await handlers.approvalPATCH!(request('PATCH', {}), context('approval-1'))).status, 401);

    currentUser = approver;
    const response = await handlers.approvalPATCH!(request('PATCH', { status: 'UNKNOWN' }), context('approval-1'));

    assert.equal(response.status, 400);
    assert.equal(approvalUpdates.length, 0);
    assert.equal(equipmentUpdates.length, 0);
  });

  test('allows only the requester to cancel a pending approval', async () => {
    currentUser = viewer;
    let response = await handlers.approvalPATCH!(request('PATCH', { status: 'CANCELLED' }), context('approval-1'));
    assert.equal(response.status, 403);
    assert.equal(approvalUpdates.length, 0);

    currentUser = { ...viewer, userId: 'requester-1' };
    response = await handlers.approvalPATCH!(request('PATCH', { status: 'CANCELLED' }), context('approval-1'));

    assert.equal(response.status, 200);
    assert.equal(approvalUpdates.length, 1);
    assert.equal(approvalUpdates[0].data.status, 'CANCELLED');
    assert.equal(equipmentUpdates.length, 0);
  });

  test('approves commissioning, updates equipment, records audit, and notifies requester', async () => {
    currentUser = approver;

    const response = await handlers.approvalPATCH!(request('PATCH', {
      status: 'APPROVED',
      resolutionComment: ' reviewed ',
    }), context('approval-1'));
    const body = await response.json() as { success: boolean; data: { status: string } };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'APPROVED');
    assert.equal(equipmentUpdates.length, 1);
    assert.equal(equipmentUpdates[0].data.status, 'ACTIVE');
    assert.equal(equipmentUpdates[0].data.name, 'Approved pump');
    assert.equal(approvalUpdates[0].data.status, 'APPROVED');
    assert.equal(approvalUpdates[0].data.resolutionComment, 'reviewed');
    assert.equal(approvalNotifications.length, 1);
    assert.equal(approvalNotifications[0].data.userId, 'requester-1');
    assert.equal(auditEvents.some((event) => event.entityType === 'Equipment'), true);
    assert.equal(auditEvents.some((event) => event.entityType === 'EquipmentApproval'), true);
  });

  test('rejects a second decision after the approval is no longer pending', async () => {
    currentUser = approver;
    approval.status = 'APPROVED';

    const response = await handlers.approvalPATCH!(request('PATCH', { status: 'REJECTED' }), context('approval-1'));

    assert.equal(response.status, 400);
    assert.equal(approvalUpdates.length, 0);
    assert.equal(equipmentUpdates.length, 0);
  });
});

describe('O2 WMS inventory mutation contracts', { concurrency: false }, () => {
  test('enforces authentication and inventory permission', async () => {
    assert.equal((await handlers.inventoryPATCH!(request('PATCH', {}), context('inventory-1'))).status, 401);
    currentUser = viewer;
    assert.equal((await handlers.inventoryPATCH!(request('PATCH', {}), context('inventory-1'))).status, 403);
    assert.equal(transactionCalls, 0);
  });

  test('rejects changes to a completed inventory before opening a transaction', async () => {
    currentUser = authorizedUser;
    currentInventory.status = InventoryStatus.COMPLETED;

    const response = await handlers.inventoryPATCH!(request('PATCH', { status: 'IN_PROGRESS' }), context('inventory-1'));

    assert.equal(response.status, 400);
    assert.equal(transactionCalls, 0);
    assert.equal(inventoryUpdates.length, 0);
  });

  test('saves draft item facts and computes the difference from expected quantity', async () => {
    currentUser = authorizedUser;

    const response = await handlers.inventoryPATCH!(request('PATCH', {
      status: 'IN_PROGRESS',
      comment: 'counted by team',
      items: [{ id: 'inventory-item-1', actualQty: 8, comment: 'two missing' }],
    }), context('inventory-1'));

    assert.equal(response.status, 200);
    assert.equal(transactionCalls, 1);
    assert.deepEqual(inventoryItemUpdates[0].data, {
      actualQty: 8,
      diffQty: -2,
      comment: 'two missing',
    });
    assert.equal(inventoryUpdates[0].data.status, 'IN_PROGRESS');
    assert.equal(stockOperationCreates.length, 0);
  });

  test('completion creates an adjustment, synchronizes stock to actual values, and closes the inventory', async () => {
    currentUser = authorizedUser;

    const response = await handlers.inventoryPATCH!(request('PATCH', {
      status: 'COMPLETED',
      items: [{ id: 'inventory-item-1', actualQty: 8 }],
    }), context('inventory-1'));
    const body = await response.json() as { success: boolean; message: string };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.match(body.message, /1/);
    assert.equal(transactionCalls, 1);
    assert.equal(stockOperationCreates.length, 1);
    assert.equal(stockOperationCreates[0].data.type, 'ADJUSTMENT');
    assert.equal(stockOperationCreates[0].data.items.create[0].quantity, 2);
    assert.equal(stockUpserts.length, 1);
    assert.equal(stockUpserts[0].update.quantity, 8);
    assert.equal(inventoryUpdates[0].data.status, InventoryStatus.COMPLETED);
    assert.equal(auditEvents[0].entityType, 'Inventory');
    assert.equal(auditEvents[0].changes.discrepanciesCount, 1);
  });
});

describe('O2 EPS import execute contracts', { concurrency: false }, () => {
  test('requires both equipment-create and import-execute permissions', async () => {
    assert.equal((await handlers.importPOST!(request('POST', { rows: [{ name: 'Pump' }] }))).status, 401);
    currentUser = viewer;
    assert.equal((await handlers.importPOST!(request('POST', { rows: [{ name: 'Pump' }] }))).status, 403);
  });

  test('rejects an empty import before touching lookup or persistence models', async () => {
    currentUser = authorizedUser;

    const response = await handlers.importPOST!(request('POST', { rows: [] }));

    assert.equal(response.status, 400);
    assert.equal(equipmentCreates.length, 0);
    assert.equal(equipmentUpdates.length, 0);
    assert.equal(auditEvents.length, 0);
  });

  test('creates valid rows, creates missing tags, and reports invalid rows without aborting the batch', async () => {
    currentUser = authorizedUser;

    const response = await handlers.importPOST!(request('POST', {
      rows: [
        { data: { Name: 'Pump A', Inventory: 'INV-1', Status: 'на складе', Tags: 'Critical, New' } },
        { data: { Inventory: 'INV-2' } },
      ],
      columnMapping: {
        Name: 'name', Inventory: 'inventoryNumber', Status: 'status', Tags: 'tags',
      },
    }));
    const body = await response.json() as { success: boolean; data: any };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.totalRows, 2);
    assert.equal(body.data.createdCount, 1);
    assert.equal(body.data.errorCount, 1);
    assert.equal(body.data.errors[0].row, 2);
    assert.equal(equipmentCreates.length, 1);
    assert.equal(equipmentCreates[0].data.status, EquipmentStatus.IN_STORAGE);
    assert.equal(equipmentCreates[0].data.createdById, authorizedUser.userId);
    assert.equal(tagCreates.length, 1);
    assert.equal(tagCreates[0].data.name, 'New');
    assert.equal(equipmentTagCreates.length, 1);
    assert.equal(auditEvents[0].entityType, 'EquipmentImport');
    assert.equal(auditEvents[0].changes.createdCount, 1);
  });

  test('skips an existing equipment under SKIP conflict strategy without updating it', async () => {
    currentUser = authorizedUser;
    existingEquipmentByInventory.set('INV-1', {
      id: 'equipment-existing',
      name: 'Existing pump',
      customFields: {},
    });

    const response = await handlers.importPOST!(request('POST', {
      rows: [{ data: { Name: 'Updated name', Inventory: 'INV-1' } }],
      columnMapping: { Name: 'name', Inventory: 'inventoryNumber' },
      conflictStrategy: 'SKIP',
    }));
    const body = await response.json() as { data: any };

    assert.equal(response.status, 200);
    assert.equal(body.data.skippedCount, 1);
    assert.equal(body.data.updatedCount, 0);
    assert.equal(equipmentUpdates.length, 0);
    assert.equal(equipmentCreates.length, 0);
  });
});
