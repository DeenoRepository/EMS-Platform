import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

let currentUser: JwtUserPayload | null = null;
let warehouses: any[] = [];
let warehouseById: any = null;
let zones: any[] = [];
let zoneById: any = null;
let cells: any[] = [];
let cellByCode: any = null;
let createdWarehouses: any[] = [];
let createdZones: any[] = [];
let updatedWarehouses: any[] = [];
let updatedZones: any[] = [];
let upsertedCells: any[] = [];
let deletedCells: any[] = [];
let deletedZones: any[] = [];
let auditEvents: any[] = [];

const manager: JwtUserPayload = {
  userId: 'warehouse-manager',
  ldapLogin: 'warehouse.manager',
  displayName: 'Warehouse Manager',
  roles: ['storekeeper'],
  permissions: [
    PERMISSIONS.WMS_STOCK_VIEW,
    PERMISSIONS.WMS_WAREHOUSES_MANAGE,
    PERMISSIONS.WMS_ZONES_MANAGE,
  ],
};

const responsible: JwtUserPayload = {
  userId: 'responsible-user',
  ldapLogin: 'responsible',
  displayName: 'Responsible User',
  roles: ['storekeeper'],
  permissions: [PERMISSIONS.WMS_STOCK_VIEW, PERMISSIONS.WMS_ZONES_MANAGE],
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

const prismaMock = {
  warehouse: {
    findMany: async () => warehouses,
    findUnique: async (args: any) => {
      if (args?.where?.code) return warehouses.find((warehouse) => warehouse.code === args.where.code) ?? null;
      return warehouseById;
    },
    create: async (args: any) => {
      const created = { id: `warehouse-${createdWarehouses.length + 1}`, ...args.data };
      createdWarehouses.push(args);
      return created;
    },
    update: async (args: any) => {
      updatedWarehouses.push(args);
      return { ...warehouseById, ...args.data };
    },
  },
  storageZone: {
    findMany: async () => zones,
    findUnique: async (args: any) => {
      if (args?.where?.warehouseId_code) return zoneById?.code === args.where.warehouseId_code.code ? zoneById : null;
      return zoneById;
    },
    create: async (args: any) => {
      const created = { id: `zone-${createdZones.length + 1}`, ...args.data, cells: [] };
      createdZones.push(args);
      return created;
    },
    update: async (args: any) => {
      updatedZones.push(args);
      return { ...zoneById, ...args.data };
    },
    delete: async (args: any) => {
      deletedZones.push(args);
      return { id: args.where.id };
    },
  },
  storageCell: {
    findMany: async () => cells,
    findUnique: async (args: any) => {
      if (args?.where?.zoneId_code) return cellByCode;
      return cells.find((cell) => cell.id === args?.where?.id) ?? null;
    },
    create: async (args: any) => {
      const created = { id: `cell-${upsertedCells.length + 1}`, ...args.data };
      upsertedCells.push({ kind: 'create', ...args });
      return created;
    },
    upsert: async (args: any) => {
      const created = { id: `cell-${upsertedCells.length + 1}`, ...args.create };
      upsertedCells.push({ kind: 'upsert', ...args });
      return created;
    },
    delete: async (args: any) => {
      deletedCells.push(args);
      return { id: args.where.id };
    },
  },
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock } });
mock.module('@ems/shared', { namedExports: { PERMISSIONS } });
mock.module('@ems/auth', {
  namedExports: {
    hasPermission,
    logAuditEvent: async (event: unknown) => { auditEvents.push(event); },
  },
});
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    isAdminUser: (user: JwtUserPayload) => user.roles.includes('admin') || user.roles.includes('administrator'),
    unauthorizedResponse: () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    forbiddenResponse: (message = 'Forbidden') => Response.json({ success: false, error: message }, { status: 403 }),
  },
});
mock.module('@/lib/logger', {
  namedExports: { logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } },
});

interface RouteContext { params: Promise<{ id: string }> }
type IdHandler = (request: Request, context: RouteContext) => Promise<Response>;
type RequestHandler = (request: Request) => Promise<Response>;
const handlers: {
  warehousesGET?: RequestHandler;
  warehousesPOST?: RequestHandler;
  warehousePATCH?: IdHandler;
  zonesGET?: IdHandler;
  zonesPOST?: IdHandler;
  zonePATCH?: IdHandler;
  zoneDELETE?: IdHandler;
  cellsGET?: IdHandler;
  cellsPOST?: IdHandler;
  cellsDELETE?: IdHandler;
} = {};

before(async () => {
  const warehousesRoute = await import('@/app/api/wms/warehouses/route');
  const warehouseRoute = await import('@/app/api/wms/warehouses/[id]/route');
  const zonesRoute = await import('@/app/api/wms/warehouses/[id]/zones/route');
  const zoneRoute = await import('@/app/api/wms/zones/[id]/route');
  const cellsRoute = await import('@/app/api/wms/zones/[id]/cells/route');

  handlers.warehousesGET = warehousesRoute.GET as unknown as RequestHandler;
  handlers.warehousesPOST = warehousesRoute.POST as unknown as RequestHandler;
  handlers.warehousePATCH = warehouseRoute.PATCH as unknown as IdHandler;
  handlers.zonesGET = zonesRoute.GET as unknown as IdHandler;
  handlers.zonesPOST = zonesRoute.POST as unknown as IdHandler;
  handlers.zonePATCH = zoneRoute.PATCH as unknown as IdHandler;
  handlers.zoneDELETE = zoneRoute.DELETE as unknown as IdHandler;
  handlers.cellsGET = cellsRoute.GET as unknown as IdHandler;
  handlers.cellsPOST = cellsRoute.POST as unknown as IdHandler;
  handlers.cellsDELETE = cellsRoute.DELETE as unknown as IdHandler;
});

beforeEach(() => {
  currentUser = null;
  warehouses = [];
  warehouseById = {
    id: 'warehouse-1',
    code: 'MAIN',
    name: 'Main warehouse',
    responsibleUserId: 'responsible-user',
  };
  zones = [];
  zoneById = {
    id: 'zone-1',
    code: 'A',
    name: 'Zone A',
    warehouseId: 'warehouse-1',
    warehouse: { name: 'Main warehouse', responsibleUserId: 'responsible-user' },
  };
  cells = [];
  cellByCode = null;
  createdWarehouses = [];
  createdZones = [];
  updatedWarehouses = [];
  updatedZones = [];
  upsertedCells = [];
  deletedCells = [];
  deletedZones = [];
  auditEvents = [];
});

function request(method: string, body?: unknown, searchParams?: Record<string, string>) {
  return makeRequest({ method, body, searchParams, url: 'http://localhost:3000/api/wms/topology-test' });
}

function context(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

describe('O2 WMS warehouse topology contracts', { concurrency: false }, () => {
  test('protects warehouse reads and management writes with RBAC', async () => {
    assert.equal((await handlers.warehousesGET!(request('GET'))).status, 401);
    currentUser = viewer;
    assert.equal((await handlers.warehousesGET!(request('GET'))).status, 403);
    assert.equal((await handlers.warehousesPOST!(request('POST', { name: 'New', code: 'NEW' }))).status, 403);

    currentUser = manager;
    const response = await handlers.warehousesPOST!(request('POST', { name: '  New warehouse  ', code: ' wh-01 ', location: '  Shop  ' }));
    const body = await response.json() as { success: boolean; data: any };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.name, 'New warehouse');
    assert.equal(body.data.code, 'WH-01');
    assert.equal(body.data.location, 'Shop');
    assert.equal(createdWarehouses.length, 1);
    assert.equal(auditEvents[0].entityType, 'Warehouse');
  });

  test('rejects duplicate warehouse codes and scopes forManage queries to the responsible user', async () => {
    currentUser = manager;
    warehouses = [{ id: 'existing', code: 'WH-01', name: 'Existing' }];
    const duplicate = await handlers.warehousesPOST!(request('POST', { name: 'Another', code: ' wh-01 ' }));
    assert.equal(duplicate.status, 400);
    assert.equal(createdWarehouses.length, 0);

    currentUser = responsible;
    warehouses = [{ id: 'mine', responsibleUserId: responsible.userId }];
    const response = await handlers.warehousesGET!(request('GET', undefined, { forManage: 'true' }));
    const body = await response.json() as { data: any[] };
    assert.equal(response.status, 200);
    assert.deepEqual(body.data, warehouses);
  });

  test('updates an existing warehouse with normalized fields', async () => {
    currentUser = manager;
    const response = await handlers.warehousePATCH!(request('PATCH', {
      name: '  Updated  ', code: ' upd-1 ', responsibleUserId: '  user-1  ', isActive: false,
    }), context('warehouse-1'));

    assert.equal(response.status, 200);
    assert.equal(updatedWarehouses[0].data.name, 'Updated');
    assert.equal(updatedWarehouses[0].data.code, 'UPD-1');
    assert.equal(updatedWarehouses[0].data.responsibleUserId, 'user-1');
    assert.equal(updatedWarehouses[0].data.isActive, false);
  });

  test('creates zones only for an authorized warehouse manager and normalizes duplicate checks', async () => {
    currentUser = viewer;
    assert.equal((await handlers.zonesPOST!(request('POST', { name: 'Zone', code: 'a' }), context('warehouse-1'))).status, 403);

    currentUser = responsible;
    const created = await handlers.zonesPOST!(request('POST', { name: '  Zone B ', code: ' b ', description: '  Parts  ' }), context('warehouse-1'));
    assert.equal(created.status, 200);
    assert.equal(createdZones[0].data.name, 'Zone B');
    assert.equal(createdZones[0].data.code, 'B');
    assert.equal(createdZones[0].data.description, 'Parts');

    zoneById = { ...zoneById, code: 'B' };
    const duplicate = await handlers.zonesPOST!(request('POST', { name: 'Other', code: ' b ' }), context('warehouse-1'));
    assert.equal(duplicate.status, 400);
  });

  test('requires warehouse management permission to update and delete a zone', async () => {
    currentUser = viewer;
    assert.equal((await handlers.zonePATCH!(request('PATCH', { name: 'Changed' }), context('zone-1'))).status, 403);
    assert.equal((await handlers.zoneDELETE!(request('DELETE'), context('zone-1'))).status, 403);

    currentUser = manager;
    const updated = await handlers.zonePATCH!(request('PATCH', { name: '  Changed ', code: ' c-1 ' }), context('zone-1'));
    assert.equal(updated.status, 200);
    assert.equal(updatedZones[0].data.name, 'Changed');
    assert.equal(updatedZones[0].data.code, 'C-1');

    const deleted = await handlers.zoneDELETE!(request('DELETE'), context('zone-1'));
    assert.equal(deleted.status, 200);
    assert.equal(deletedZones.length, 1);
  });

  test('creates single and bulk cells with normalized codes and rejects duplicates', async () => {
    currentUser = manager;
    const single = await handlers.cellsPOST!(request('POST', { code: ' a-01 ', name: ' Shelf 1 ' }), context('zone-1'));
    assert.equal(single.status, 200);
    assert.equal(upsertedCells[0].data.code, 'A-01');
    assert.equal(upsertedCells[0].data.name, 'Shelf 1');

    cellByCode = { id: 'cell-existing', code: 'A-02' };
    const duplicate = await handlers.cellsPOST!(request('POST', { code: 'a-02' }), context('zone-1'));
    assert.equal(duplicate.status, 400);

    cellByCode = null;
    const bulk = await handlers.cellsPOST!(request('POST', {
      bulkCodes: ['b-01', { code: ' b-02 ', name: ' Shelf 2 ' }, { name: 'missing code' }],
    }), context('zone-1'));
    const bulkBody = await bulk.json() as { success: boolean; count: number };
    assert.equal(bulk.status, 200);
    assert.equal(bulkBody.count, 2);
    assert.equal(upsertedCells.length, 3);
  });

  test('lists and deletes cells with zone-scoped ownership', async () => {
    cells = [{ id: 'cell-1', code: 'A-01' }];
    currentUser = viewer;
    assert.equal((await handlers.cellsGET!(request('GET'), context('zone-1'))).status, 403);
    assert.equal((await handlers.cellsDELETE!(request('DELETE', undefined, { cellId: 'cell-1' }), context('zone-1'))).status, 403);

    currentUser = manager;
    const listed = await handlers.cellsGET!(request('GET'), context('zone-1'));
    assert.equal(listed.status, 200);
    assert.deepEqual((await listed.json()).data, cells);

    const deleted = await handlers.cellsDELETE!(request('DELETE', undefined, { cellId: 'cell-1' }), context('zone-1'));
    assert.equal(deleted.status, 200);
    assert.deepEqual(deletedCells[0].where, { id: 'cell-1', zoneId: 'zone-1' });
  });
});
