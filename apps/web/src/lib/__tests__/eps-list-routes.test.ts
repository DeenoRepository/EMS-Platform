import { beforeEach, describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

const user = { userId: 'user-1', roles: ['engineer'], permissions: ['eps.approvals.view', 'eps.documents.view', 'eps.history.view'] };
const calls: Array<{ model: string; args: Record<string, unknown> }> = [];

mock.module('@ems/shared', { namedExports: {
  PERMISSIONS: {
    EPS_APPROVALS_VIEW: 'eps.approvals.view',
    EPS_APPROVALS_CREATE: 'eps.approvals.create',
    EPS_APPROVALS_MANAGE: 'eps.approvals.manage',
    EPS_DOCUMENTS_VIEW: 'eps.documents.view',
    EPS_DOCUMENTS_UPLOAD: 'eps.documents.upload',
    EPS_HISTORY_VIEW: 'eps.history.view',
  },
} });
mock.module('@/lib/auth-guard', { namedExports: {
  getCurrentUser: async () => user,
  unauthorizedResponse: () => new Response(null, { status: 401 }),
  forbiddenResponse: () => new Response(null, { status: 403 }),
} });
mock.module('@ems/auth', { namedExports: { hasPermission: () => true } });
mock.module('@ems/database', { namedExports: {
  ApprovalStatus: { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED' },
  ApprovalType: { EQUIPMENT_CREATE: 'EQUIPMENT_CREATE' },
  AuditAction: { CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE' },
  DocumentType: { SCHEMA: 'SCHEMA', MANUAL: 'MANUAL', CERTIFICATE: 'CERTIFICATE', PASSPORT: 'PASSPORT', ACT: 'ACT', OTHER: 'OTHER' },
  prisma: {
    equipmentApproval: {
      findMany: async (args: Record<string, unknown>) => { calls.push({ model: 'equipmentApproval.findMany', args }); return []; },
      count: async (args: Record<string, unknown>) => { calls.push({ model: 'equipmentApproval.count', args }); return 0; },
    },
    document: {
      findMany: async (args: Record<string, unknown>) => { calls.push({ model: 'document.findMany', args }); return []; },
      count: async (args: Record<string, unknown>) => { calls.push({ model: 'document.count', args }); return 0; },
    },
    auditLog: {
      findMany: async (args: Record<string, unknown>) => { calls.push({ model: 'auditLog.findMany', args }); return []; },
      count: async (args: Record<string, unknown>) => { calls.push({ model: 'auditLog.count', args }); return 0; },
    },
    equipment: {
      findMany: async (args: Record<string, unknown>) => { calls.push({ model: 'equipment.findMany', args }); return []; },
    },
  },
} });

function request(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe('EPS list route query contracts', () => {
  beforeEach(() => calls.length = 0);

  test('approvals applies filters, server sorting, and pagination', async () => {
    const { GET } = await import('../../app/api/eps/approvals/route');
    const response = await GET(request('/api/eps/approvals?search=pump&status=PENDING&scope=my_requests&sortBy=requester&sortDirection=asc&page=2&pageSize=10') as never);
    assert.equal(response.status, 200);
    const query = calls.find((call) => call.model === 'equipmentApproval.findMany')?.args;
    assert.deepEqual(query?.where, {
      requesterId: 'user-1',
      status: 'PENDING',
      OR: [
        { title: { contains: 'pump', mode: 'insensitive' } },
        { description: { contains: 'pump', mode: 'insensitive' } },
        { equipment: { OR: [
          { name: { contains: 'pump', mode: 'insensitive' } },
          { inventoryNumber: { contains: 'pump', mode: 'insensitive' } },
          { serialNumber: { contains: 'pump', mode: 'insensitive' } },
          { manufacturer: { contains: 'pump', mode: 'insensitive' } },
        ] } },
      ],
    });
    assert.deepEqual(query?.orderBy, { requester: { displayName: 'asc' } });
    assert.equal(query?.skip, 10);
    assert.equal(query?.take, 10);
  });

  test('documents keeps soft-delete scope and applies relation sorting', async () => {
    const { GET } = await import('../../app/api/eps/documents/route');
    const response = await GET(request('/api/eps/documents?equipmentId=equipment-1&sortBy=equipment&sortDirection=asc&page=3&pageSize=20') as never);
    assert.equal(response.status, 200);
    const query = calls.find((call) => call.model === 'document.findMany')?.args;
    assert.deepEqual(query?.where, { deletedAt: null, equipment: { deletedAt: null }, equipmentId: 'equipment-1' });
    assert.deepEqual(query?.orderBy, { equipment: { name: 'asc' } });
    assert.equal(query?.skip, 40);
    assert.equal(query?.take, 20);
  });

  test('history applies date filters and server sorting', async () => {
    const { GET } = await import('../../app/api/eps/history/route');
    const response = await GET(request('/api/eps/history?action=UPDATE&equipmentId=equipment-1&startDate=2026-09-01&endDate=2026-09-10&sortBy=user&sortDirection=asc&page=2&pageSize=15') as never);
    assert.equal(response.status, 200);
    const query = calls.find((call) => call.model === 'auditLog.findMany')?.args;
    assert.deepEqual(query?.where, {
      entityType: { in: ['Equipment', 'EquipmentDocument', 'EquipmentApproval', 'Photo', 'CustomField', 'EquipmentCustomSection'] },
      action: 'UPDATE',
      entityId: 'equipment-1',
      createdAt: { gte: new Date('2026-09-01'), lte: new Date('2026-09-10T23:59:59.999') },
    });
    assert.deepEqual(query?.orderBy, { user: { displayName: 'asc' } });
    assert.equal(query?.skip, 15);
    assert.equal(query?.take, 15);
  });
});
