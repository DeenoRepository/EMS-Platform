import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';

const permissions = {
  EPS_EQUIPMENT_CREATE: 'eps.equipment.create',
  EPS_EQUIPMENT_EDIT: 'eps.equipment.edit',
  EPS_APPROVALS_MANAGE: 'eps.approvals.manage',
};
const user = { userId: 'user-1', roles: ['engineer'], permissions: Object.values(permissions) };
const calls: string[] = [];
let approvalError: Error | null = null;

mock.module('@ems/shared', { namedExports: { PERMISSIONS: permissions } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => user,
    unauthorizedResponse: () => new Response(null, { status: 401 }),
    forbiddenResponse: () => new Response(null, { status: 403 }),
  },
});
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (_user: typeof user, permission: string) => permission !== permissions.EPS_APPROVALS_MANAGE,
    logAuditEvent: async () => calls.push('audit'),
  },
});
mock.module('@/lib/eps-state-machine', {
  namedExports: {
    equipmentVisibilityWhere: () => ({ deletedAt: null }),
    canTransitionEquipmentStatus: () => true,
  },
});

const equipment = {
  id: 'equipment-1',
  name: 'Pump',
  inventoryNumber: 'INV-1',
  serialNumber: null,
  manufacturer: null,
  model: null,
  location: null,
  status: 'DRAFT',
  commissionDate: null,
  customFields: {},
  createdById: user.userId,
  tags: [],
};

const prisma: any = {
  equipment: {
    findUnique: async () => null,
    findFirst: async () => equipment,
    create: async () => equipment,
    update: async () => equipment,
  },
  equipmentApproval: {
    create: async () => {
      calls.push('approval.create');
      if (approvalError) throw approvalError;
      return { id: 'approval-1' };
    },
  },
  equipmentTag: {
    deleteMany: async () => calls.push('tag.deleteMany'),
    createMany: async () => calls.push('tag.createMany'),
  },
  $transaction: async <T>(callback: (tx: typeof prisma) => Promise<T>) => {
    calls.push('transaction.begin');
    try {
      const result = await callback(prisma);
      calls.push('transaction.commit');
      return result;
    } catch (error) {
      calls.push('transaction.rollback');
      throw error;
    }
  },
};

mock.module('@ems/database', {
  namedExports: {
    prisma,
    EquipmentStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT' },
  },
});

function request(method: string, body: unknown): Request {
  return new Request('http://localhost/api/eps/equipment', {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('EPS equipment transactional handlers', () => {
  beforeEach(() => {
    calls.length = 0;
    approvalError = null;
  });

  test('POST creates equipment and commissioning approval in one transaction', async () => {
    prisma.equipment.create = async () => {
      calls.push('equipment.create');
      return { ...equipment, status: 'DRAFT' };
    };
    const { POST } = await import('../../app/api/eps/equipment/route');
    const response = await POST(request('POST', { name: 'Pump', submitForApproval: true }) as never);

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ['transaction.begin', 'equipment.create', 'approval.create', 'transaction.commit', 'audit']);
  });

  test('POST rolls back equipment when commissioning approval fails', async () => {
    approvalError = new Error('approval failed');
    const { POST } = await import('../../app/api/eps/equipment/route');
    const response = await POST(request('POST', { name: 'Pump', submitForApproval: true }) as never);

    assert.equal(response.status, 500);
    assert.deepEqual(calls, ['transaction.begin', 'equipment.create', 'approval.create', 'transaction.rollback']);
  });

  test('PATCH draft update and commissioning approval share one transaction', async () => {
    prisma.equipment.update = async () => {
      calls.push('equipment.update');
      return { ...equipment, name: 'Updated pump' };
    };
    const { PATCH } = await import('../../app/api/eps/equipment/[id]/route');
    const response = await PATCH(
      request('PATCH', { name: 'Updated pump', submitForApproval: true }) as never,
      { params: { id: equipment.id } },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ['transaction.begin', 'equipment.update', 'approval.create', 'transaction.commit']);
  });

  test('PATCH rolls back draft update when commissioning approval fails', async () => {
    approvalError = new Error('approval failed');
    const { PATCH } = await import('../../app/api/eps/equipment/[id]/route');
    const response = await PATCH(
      request('PATCH', { name: 'Updated pump', submitForApproval: true }) as never,
      { params: { id: equipment.id } },
    );

    assert.equal(response.status, 500);
    assert.deepEqual(calls, ['transaction.begin', 'equipment.update', 'approval.create', 'transaction.rollback']);
  });
});
