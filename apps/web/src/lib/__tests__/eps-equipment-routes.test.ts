/**
 * N5 Wave 1: executable tests for EPS equipment collection/detail routes.
 *
 * Covers every exported handler with anonymous, forbidden, and authorized
 * requests. The detail PATCH suite also verifies validation and transaction
 * failure behavior without opening a PostgreSQL connection.
 */
import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makePrismaMock, makeRequest } from './helpers/route-harness';

const prismaMock = makePrismaMock();
let currentUser: JwtUserPayload | null = null;
let auditCalls = 0;
let approvalCalls = 0;

const authorizedUser: JwtUserPayload = {
  userId: 'equipment-editor-id',
  ldapLogin: 'equipment.editor',
  displayName: 'Equipment Editor',
  roles: ['engineer'],
  permissions: [
    PERMISSIONS.EPS_EQUIPMENT_VIEW,
    PERMISSIONS.EPS_EQUIPMENT_CREATE,
    PERMISSIONS.EPS_EQUIPMENT_EDIT,
    PERMISSIONS.EPS_EQUIPMENT_DELETE,
    PERMISSIONS.EPS_APPROVALS_MANAGE,
  ],
};

const forbiddenUser: JwtUserPayload = {
  userId: 'forbidden-id',
  ldapLogin: 'forbidden.user',
  displayName: 'Forbidden User',
  roles: ['viewer'],
  permissions: [],
};

mock.module('@ems/database', {
  namedExports: {
    prisma: prismaMock,
    EquipmentStatus: {
      DRAFT: 'DRAFT',
      PENDING_APPROVAL: 'PENDING_APPROVAL',
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
      DECOMMISSIONED: 'DECOMMISSIONED',
    },
  },
});

mock.module('@/lib/rate-limit', {
  namedExports: { enforceRateLimit: async () => null },
});

mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    unauthorizedResponse: () =>
      new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
    forbiddenResponse: () =>
      new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 }),
    isAdminUser: () => false,
  },
});

mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, publicError: string) =>
      new Response(JSON.stringify({ success: false, error: publicError }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
  },
});

mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: JwtUserPayload, permission: string) =>
      user.permissions.includes(permission),
    logAuditEvent: async () => {
      auditCalls += 1;
    },
  },
});

let collectionGET: (request: Request) => Promise<Response>;
let collectionPOST: (request: Request) => Promise<Response>;
let detailGET: (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;
let detailPATCH: typeof detailGET;
let detailDELETE: typeof detailGET;

before(async () => {
  const collectionRoute = await import('@/app/api/eps/equipment/route');
  collectionGET = collectionRoute.GET as unknown as typeof collectionGET;
  collectionPOST = collectionRoute.POST as unknown as typeof collectionPOST;

  const detailRoute = await import('@/app/api/eps/equipment/[id]/route');
  detailGET = detailRoute.GET as unknown as typeof detailGET;
  detailPATCH = detailRoute.PATCH as unknown as typeof detailPATCH;
  detailDELETE = detailRoute.DELETE as unknown as typeof detailDELETE;
});

const detailContext = { params: Promise.resolve({ id: 'equipment-1' }) };

function equipmentFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'equipment-1',
    name: 'Pump A',
    inventoryNumber: 'INV-001',
    serialNumber: 'SN-001',
    manufacturer: 'Factory',
    model: 'P-1',
    location: 'Workshop',
    status: 'DRAFT',
    commissionDate: null,
    customFields: {},
    createdById: authorizedUser.userId,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    tags: [],
    photos: [],
    _count: { documents: 0, photos: 0, maintenancePlans: 0, spareParts: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  currentUser = null;
  auditCalls = 0;
  approvalCalls = 0;

  prismaMock.equipment.count = async () => 0;
  prismaMock.equipment.findMany = async () => [];
  prismaMock.equipment.groupBy = async () => [];
  prismaMock.equipment.findUnique = async () => null;
  prismaMock.equipment.create = async () => equipmentFixture();
  prismaMock.equipment.update = async () => equipmentFixture({ name: 'Updated Pump' });
  prismaMock.equipment.delete = async () => ({ id: 'equipment-1' });
  prismaMock.jiraIssueCache.findMany = async () => [];
  prismaMock.equipmentTag.deleteMany = async () => ({ count: 0 });
  prismaMock.equipmentTag.createMany = async () => ({ count: 0 });
  prismaMock.equipmentApproval.create = async () => {
    approvalCalls += 1;
    return { id: 'approval-1' };
  };
  prismaMock.$transaction = async (callback: (transaction: typeof prismaMock) => Promise<unknown>) =>
    callback(prismaMock);
});

describe('GET /api/eps/equipment', () => {
  test('returns 401 for an anonymous request', async () => {
    const response = await collectionGET(makeRequest({ url: 'http://localhost/api/eps/equipment' }));
    assert.equal(response.status, 401);
  });

  test('returns 403 without EPS_EQUIPMENT_VIEW', async () => {
    currentUser = forbiddenUser;
    const response = await collectionGET(makeRequest({ url: 'http://localhost/api/eps/equipment' }));
    assert.equal(response.status, 403);
  });

  test('returns a paginated collection for an authorized user', async () => {
    currentUser = authorizedUser;
    prismaMock.equipment.count = async () => 1;
    prismaMock.equipment.findMany = async () => [equipmentFixture()];
    prismaMock.equipment.groupBy = async () => [{ status: 'DRAFT', _count: { status: 1 } }];

    const response = await collectionGET(makeRequest({ url: 'http://localhost/api/eps/equipment' }));
    const body = (await response.json()) as { success: boolean; data: { total: number; items: unknown[] } };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.total, 1);
    assert.equal(body.data.items.length, 1);
  });
});

describe('POST /api/eps/equipment', () => {
  const validBody = { name: 'Pump A', asDraft: true };

  test('returns 401 for an anonymous request', async () => {
    const response = await collectionPOST(makeRequest({ method: 'POST', body: validBody }));
    assert.equal(response.status, 401);
  });

  test('returns 403 without EPS_EQUIPMENT_CREATE', async () => {
    currentUser = forbiddenUser;
    const response = await collectionPOST(makeRequest({ method: 'POST', body: validBody }));
    assert.equal(response.status, 403);
  });

  test('returns 400 when required name is missing', async () => {
    currentUser = authorizedUser;
    const response = await collectionPOST(makeRequest({ method: 'POST', body: { asDraft: true } }));

    assert.equal(response.status, 400);
    assert.equal(auditCalls, 0);
  });

  test('creates a draft and returns its response shape', async () => {
    currentUser = authorizedUser;
    const response = await collectionPOST(makeRequest({ method: 'POST', body: validBody }));
    const body = (await response.json()) as { success: boolean; data: { id: string; approval: unknown } };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.id, 'equipment-1');
    assert.equal(body.data.approval, null);
    assert.equal(auditCalls, 1);
  });
});

describe('GET /api/eps/equipment/[id]', () => {
  test('returns 401 for an anonymous request', async () => {
    const response = await detailGET(makeRequest(), detailContext);
    assert.equal(response.status, 401);
  });

  test('returns 403 without EPS_EQUIPMENT_VIEW', async () => {
    currentUser = forbiddenUser;
    const response = await detailGET(makeRequest(), detailContext);
    assert.equal(response.status, 403);
  });

  test('returns equipment passport data for an authorized user', async () => {
    currentUser = authorizedUser;
    prismaMock.equipment.findUnique = async () => equipmentFixture();

    const response = await detailGET(makeRequest(), detailContext);
    const body = (await response.json()) as { success: boolean; data: { id: string; jiraIssues: unknown[] } };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.id, 'equipment-1');
    assert.deepEqual(body.data.jiraIssues, []);
  });
});

describe('PATCH /api/eps/equipment/[id]', () => {
  test('returns 401 for an anonymous request', async () => {
    const response = await detailPATCH(makeRequest({ method: 'PATCH', body: {} }), detailContext);
    assert.equal(response.status, 401);
  });

  test('returns 403 without EPS_EQUIPMENT_EDIT', async () => {
    currentUser = forbiddenUser;
    const response = await detailPATCH(makeRequest({ method: 'PATCH', body: {} }), detailContext);
    assert.equal(response.status, 403);
  });

  test('returns 400 for an invalid status', async () => {
    currentUser = authorizedUser;
    const response = await detailPATCH(
      makeRequest({ method: 'PATCH', body: { status: 'NOT_A_STATUS' } }),
      detailContext,
    );

    assert.equal(response.status, 400);
    assert.equal(auditCalls, 0);
  });

  test('updates a draft transactionally for an authorized editor', async () => {
    currentUser = authorizedUser;
    prismaMock.equipment.findUnique = async () => equipmentFixture();

    const response = await detailPATCH(
      makeRequest({ method: 'PATCH', body: { name: 'Updated Pump', tagIds: ['tag-1'] } }),
      detailContext,
    );
    const body = (await response.json()) as { success: boolean; data: { name: string } };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.name, 'Updated Pump');
    assert.equal(auditCalls, 1);
  });

  test('returns sanitized 500 and exposes no post-transaction side effects when transaction rejects', async () => {
    currentUser = authorizedUser;
    prismaMock.equipment.findUnique = async () => equipmentFixture();
    let stagedTagDeletes = 0;
    let committedTagDeletes = 0;

    prismaMock.$transaction = async (callback: (transaction: typeof prismaMock) => Promise<unknown>) => {
      const transaction = {
        ...prismaMock,
        equipmentTag: {
          ...prismaMock.equipmentTag,
          deleteMany: async () => {
            stagedTagDeletes += 1;
            return { count: 1 };
          },
        },
        equipment: {
          ...prismaMock.equipment,
          update: async () => {
            throw new Error('transaction step failed');
          },
        },
      };

      try {
        const result = await callback(transaction);
        committedTagDeletes = stagedTagDeletes;
        return result;
      } catch (error) {
        stagedTagDeletes = 0;
        throw error;
      }
    };

    const response = await detailPATCH(
      makeRequest({ method: 'PATCH', body: { name: 'Broken Update', tagIds: [] } }),
      detailContext,
    );
    const body = (await response.json()) as { success: boolean; error: string };

    assert.equal(response.status, 500);
    assert.equal(body.success, false);
    assert.equal(body.error, 'Ошибка обновления оборудования');
    assert.equal(stagedTagDeletes, 0);
    assert.equal(committedTagDeletes, 0);
    assert.equal(auditCalls, 0);
    assert.equal(approvalCalls, 0);
  });
});

describe('DELETE /api/eps/equipment/[id]', () => {
  test('returns 401 for an anonymous request', async () => {
    const response = await detailDELETE(makeRequest({ method: 'DELETE' }), detailContext);
    assert.equal(response.status, 401);
  });

  test('returns 403 without EPS_EQUIPMENT_DELETE', async () => {
    currentUser = forbiddenUser;
    const response = await detailDELETE(makeRequest({ method: 'DELETE' }), detailContext);
    assert.equal(response.status, 403);
  });

  test('deletes existing equipment for an authorized user', async () => {
    currentUser = authorizedUser;
    prismaMock.equipment.findUnique = async () => equipmentFixture();

    const response = await detailDELETE(makeRequest({ method: 'DELETE' }), detailContext);
    const body = (await response.json()) as { success: boolean; message: string };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.message.length > 0);
    assert.equal(auditCalls, 1);
  });

  test('never opens a real database connection', () => {
    assert.equal(prismaMock._connectionAttempts(), 0);
  });
});
