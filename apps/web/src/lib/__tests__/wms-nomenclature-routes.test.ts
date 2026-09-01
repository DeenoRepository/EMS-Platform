import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

let currentUser: JwtUserPayload | null = null;
let nomenclatureItems: any[] = [];
let existingByArticle: any = null;
let createdItems: any[] = [];
let auditEvents: any[] = [];

const manager: JwtUserPayload = {
  userId: 'wms-manager', ldapLogin: 'wms.manager', displayName: 'WMS Manager', roles: ['storekeeper'],
  permissions: [PERMISSIONS.WMS_STOCK_VIEW, PERMISSIONS.WMS_NOMENCLATURE_MANAGE],
};
const operator: JwtUserPayload = {
  userId: 'wms-operator', ldapLogin: 'wms.operator', displayName: 'WMS Operator', roles: ['storekeeper'],
  permissions: [PERMISSIONS.WMS_OPERATIONS_CREATE],
};
const viewer: JwtUserPayload = {
  userId: 'viewer', ldapLogin: 'viewer', displayName: 'Viewer', roles: ['viewer'], permissions: [],
};

function hasPermission(user: JwtUserPayload | null, permission: string): boolean {
  return Boolean(user && (user.roles.includes('admin') || user.permissions.includes(permission)));
}

const prismaMock = {
  nomenclature: {
    findMany: async () => nomenclatureItems,
    findUnique: async () => existingByArticle,
    create: async (args: unknown) => {
      createdItems.push(args);
      return { id: 'nom-created', ...(args as any).data };
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
    unauthorizedResponse: () => Response.json({ success: false }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false }, { status: 403 }),
  },
});
mock.module('@/lib/logger', { namedExports: { logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } } });

interface RouteContext { params: Promise<{ id: string }> }
type RequestHandler = (request: Request) => Promise<Response>;
type IdHandler = (request: Request, context: RouteContext) => Promise<Response>;
const handlers: { list?: RequestHandler; create?: RequestHandler; detail?: IdHandler } = {};

before(async () => {
  const list = await import('@/app/api/wms/nomenclature/route');
  const detail = await import('@/app/api/wms/nomenclature/[id]/route');
  handlers.list = list.GET as unknown as RequestHandler;
  handlers.create = list.POST as unknown as RequestHandler;
  handlers.detail = detail.GET as unknown as IdHandler;
});

beforeEach(() => {
  currentUser = null;
  nomenclatureItems = [{
    id: 'nom-1', name: 'Bearing', article: 'BR-1', minStock: 10,
    stockItems: [{ quantity: 4 }, { quantity: 3 }], category: { id: 'cat-1', name: 'Parts' },
  }];
  existingByArticle = null;
  createdItems = [];
  auditEvents = [];
});

function request(method: string, body?: unknown, searchParams?: Record<string, string>) {
  return makeRequest({ method, body, searchParams, url: 'http://localhost:3000/api/wms/nomenclature-test' });
}
function context(id: string): RouteContext { return { params: Promise.resolve({ id }) }; }

describe('O4 WMS nomenclature route contracts', { concurrency: false }, () => {
  test('protects list and detail reads with authentication and stock permission', async () => {
    assert.equal((await handlers.list!(request('GET'))).status, 401);
    currentUser = viewer;
    assert.equal((await handlers.list!(request('GET'))).status, 403);
    assert.equal((await handlers.detail!(request('GET'), context('nom-1'))).status, 403);

    currentUser = manager;
    const response = await handlers.list!(request('GET', undefined, { search: ' Bearing ', categoryId: 'cat-1', limit: '500' }));
    const body = await response.json() as { success: boolean; data: any[] };
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data[0].totalStock, 7);
    assert.equal(body.data[0].isLowStock, true);
  });

  test('normalizes nomenclature creation and rejects missing names and duplicate articles', async () => {
    currentUser = operator;
    const created = await handlers.create!(request('POST', {
      name: '  Bearing  ', article: ' BR-2 ', unit: ' pcs ', description: '  Spare part ', minStock: '5',
    }));
    assert.equal(created.status, 200);
    assert.equal(createdItems[0].data.name, 'Bearing');
    assert.equal(createdItems[0].data.article, 'BR-2');
    assert.equal(createdItems[0].data.unit, 'pcs');
    assert.equal(createdItems[0].data.minStock, 5);
    assert.equal(auditEvents[0].entityType, 'Nomenclature');

    const missing = await handlers.create!(request('POST', { article: 'BR-3' }));
    assert.equal(missing.status, 400);

    existingByArticle = { id: 'nom-existing', name: 'Existing bearing' };
    const duplicate = await handlers.create!(request('POST', { name: 'Other', article: 'BR-2' }));
    assert.equal(duplicate.status, 400);
    assert.equal(createdItems.length, 1);
  });
});
