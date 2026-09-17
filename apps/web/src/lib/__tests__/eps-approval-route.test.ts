import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const permissions = {
  EPS_APPROVALS_VIEW: 'eps.approvals.view',
  EPS_APPROVALS_CREATE: 'eps.approvals.create',
  EPS_APPROVALS_MANAGE: 'eps.approvals.manage',
  EPS_EQUIPMENT_EDIT: 'eps.equipment.edit',
};

let currentUser = { userId: 'reviewer-1', roles: ['engineer'], permissions: [permissions.EPS_APPROVALS_MANAGE] };
let canManage = true;
const events: string[] = [];

const approval = {
  id: 'approval-1', equipmentId: 'equipment-1', type: 'EQUIPMENT_UPDATE', status: 'PENDING',
  title: 'Изменение оборудования', requesterId: 'requester-1', reviewerId: null, reviewedAt: null,
  resolutionComment: null, proposedData: { name: 'Новый насос', tagIds: ['tag-1'] },
  equipment: {
    id: 'equipment-1', name: 'Старый насос', inventoryNumber: 'INV-1', serialNumber: null,
    manufacturer: null, model: null, location: null, status: 'DRAFT', commissionDate: null, customFields: {},
  },
};

const updatedApproval = {
  ...approval, status: 'APPROVED', reviewerId: 'reviewer-1', reviewedAt: new Date(), resolutionComment: 'Принято',
  equipment: { id: 'equipment-1', name: 'Новый насос', inventoryNumber: 'INV-1', status: 'DRAFT' },
  requester: { id: 'requester-1', displayName: 'Автор', ldapLogin: 'requester' },
  reviewer: { id: 'reviewer-1', displayName: 'Проверяющий', ldapLogin: 'reviewer' },
};

mock.module('@ems/shared', { namedExports: { PERMISSIONS: permissions } });
mock.module('@/lib/auth-guard', { namedExports: {
  getCurrentUser: async () => currentUser,
  unauthorizedResponse: () => new Response(null, { status: 401 }),
  forbiddenResponse: () => new Response(null, { status: 403 }),
} });
mock.module('@ems/auth', { namedExports: {
  hasPermission: () => canManage,
  logAuditEvent: async ({ entityType }: { entityType: string }) => events.push(`audit:${entityType}`),
} });
mock.module('@ems/database', { namedExports: {
  ApprovalStatus: { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED' },
  EquipmentStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT', DECOMMISSIONED: 'DECOMMISSIONED' },
  prisma: {
    equipmentApproval: { findUnique: async () => approval },
    notification: { create: async () => events.push('notification') },
    $transaction: async (callback: (client: any) => unknown) => {
      const result = await callback({
        equipmentApproval: {
          findUnique: async () => events.includes('approval.updateMany') ? updatedApproval : approval,
          updateMany: async () => { events.push('approval.updateMany'); return { count: 1 }; },
        },
        equipment: { update: async () => events.push('equipment.update') },
        equipmentTag: {
          deleteMany: async () => events.push('tags.deleteMany'),
          createMany: async () => events.push('tags.createMany'),
        },
      });
      events.push('commit');
      return result;
    },
  },
} });

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/eps/approvals/approval-1', {
    method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
}

describe('PATCH /api/eps/approvals/[id]', () => {
  beforeEach(() => {
    currentUser = { userId: 'reviewer-1', roles: ['engineer'], permissions: [permissions.EPS_APPROVALS_MANAGE] };
    canManage = true;
    events.length = 0;
  });

  test('performs writes in one transaction and notifies after commit', async () => {
    const { PATCH } = await import('../../app/api/eps/approvals/[id]/route');
    const response = await PATCH(makeRequest({ status: 'APPROVED', resolutionComment: 'Принято' }) as never, { params: { id: 'approval-1' } });
    assert.equal(response.status, 200);
    assert.ok(events.indexOf('tags.deleteMany') < events.indexOf('approval.updateMany'));
    assert.ok(events.indexOf('commit') < events.indexOf('notification'));
  });

  test('rejects self-approval before transaction', async () => {
    currentUser = { userId: 'requester-1', roles: ['engineer'], permissions: [permissions.EPS_APPROVALS_MANAGE] };
    const { PATCH } = await import('../../app/api/eps/approvals/[id]/route');
    const response = await PATCH(makeRequest({ status: 'REJECTED', resolutionComment: 'Нельзя' }) as never, { params: { id: 'approval-1' } });
    assert.equal(response.status, 403);
    assert.deepEqual(events, []);
  });

  test('does not let equipment edit permission decide an approval', async () => {
    canManage = false;
    currentUser = { userId: 'reviewer-1', roles: ['engineer'], permissions: [permissions.EPS_EQUIPMENT_EDIT] };
    const { PATCH } = await import('../../app/api/eps/approvals/[id]/route');
    const response = await PATCH(makeRequest({ status: 'REJECTED', resolutionComment: 'Нет' }) as never, { params: { id: 'approval-1' } });
    assert.equal(response.status, 403);
    assert.deepEqual(events, []);
  });
});
