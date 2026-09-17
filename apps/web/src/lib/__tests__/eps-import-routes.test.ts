import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';

const permissions = {
  EPS_EQUIPMENT_VIEW: 'eps.equipment.view',
  EPS_EQUIPMENT_CREATE: 'eps.equipment.create',
  EPS_IMPORT_EXECUTE: 'eps.import.execute',
  EPS_APPROVALS_MANAGE: 'eps.approvals.manage',
};
const user = { userId: 'user-1', roles: ['engineer'], permissions: Object.values(permissions) };
const calls: Array<{ operation: string; data?: Record<string, unknown> }> = [];
let rateLimitResponse: Response | null = null;
let existingEquipment: Record<string, unknown> | null = null;

mock.module('@ems/shared', { namedExports: { PERMISSIONS: permissions } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => user,
    unauthorizedResponse: () => new Response(null, { status: 401 }),
    forbiddenResponse: () => new Response(null, { status: 403 }),
  },
});
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => rateLimitResponse } });
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (_currentUser: typeof user, permission: string) => permission !== permissions.EPS_APPROVALS_MANAGE,
    logAuditEvent: async () => undefined,
  },
});
mock.module('@ems/database', {
  namedExports: {
    EquipmentStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT' },
    FieldType: { TEXT: 'TEXT' },
    prisma: {
      customFieldDefinition: { findMany: async () => [] },
      customSection: { findMany: async () => [] },
      tag: { findMany: async () => [] },
      equipment: {
        findMany: async () => existingEquipment ? [existingEquipment] : [],
        findUnique: async () => existingEquipment,
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          calls.push({ operation: 'equipment.create', data });
          return { id: 'new-equipment', ...data };
        },
        update: async ({ data }: { data: Record<string, unknown> }) => {
          calls.push({ operation: 'equipment.update', data });
          return { id: 'existing-equipment', ...data };
        },
      },
      equipmentApproval: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          calls.push({ operation: 'equipmentApproval.create', data });
          return { id: 'approval-1', ...data };
        },
      },
      equipmentTag: {
        upsert: async () => calls.push({ operation: 'equipmentTag.upsert' }),
        createMany: async () => calls.push({ operation: 'equipmentTag.createMany' }),
      },
    },
  },
});

function analyzeRequest(file: File): Request {
  const formData = new FormData();
  formData.set('file', file);
  return new Request('http://localhost/api/eps/import/analyze', { method: 'POST', body: formData });
}

function executeRequest(body: unknown): Request {
  return new Request('http://localhost/api/eps/import/execute', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('EPS import production handlers', () => {
  beforeEach(() => {
    calls.length = 0;
    rateLimitResponse = null;
    existingEquipment = null;
  });

  test('analyze applies rate limit before reading multipart input', async () => {
    rateLimitResponse = new Response(null, { status: 429 });
    const { POST } = await import('../../app/api/eps/import/analyze/route');

    const response = await POST(new Request('http://localhost/api/eps/import/analyze', { method: 'POST' }) as never);

    assert.equal(response.status, 429);
    assert.deepEqual(calls, []);
  });

  test('analyze rejects oversized files before XLSX parsing', async () => {
    const { POST } = await import('../../app/api/eps/import/analyze/route');
    const response = await POST(analyzeRequest(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.xlsx')) as never);

    assert.equal(response.status, 413);
    assert.match((await response.json()).error, /10 МБ/);
  });

  test('ordinary import creates DRAFT and commissioning approval for ACTIVE input', async () => {
    const { POST } = await import('../../app/api/eps/import/execute/route');
    const response = await POST(executeRequest({
      rows: [{ name: 'Pump', inventory: 'INV-1', status: 'ACTIVE' }],
      columnMapping: { name: 'name', inventory: 'inventoryNumber', status: 'status' },
    }) as never);

    assert.equal(response.status, 200);
    const create = calls.find((call) => call.operation === 'equipment.create');
    const approval = calls.find((call) => call.operation === 'equipmentApproval.create');
    assert.equal(create?.data?.status, 'DRAFT');
    assert.equal(create?.data?.inventoryNumber, 'INV-1');
    assert.equal(approval?.data?.type, 'COMMISSIONING');
    assert.equal((approval?.data?.proposedData as Record<string, unknown>).targetStatus, 'ACTIVE');
  });

  test('ordinary UPSERT creates approval with the new inventory number without updating directly', async () => {
    existingEquipment = {
      id: 'existing-equipment',
      name: 'Old pump',
      inventoryNumber: 'OLD-1',
      serialNumber: null,
      manufacturer: null,
      model: null,
      location: null,
      status: 'ACTIVE',
      customFields: {},
    };
    const { POST } = await import('../../app/api/eps/import/execute/route');
    const response = await POST(executeRequest({
      rows: [{ name: 'Updated pump', inventory: 'NEW-1' }],
      columnMapping: { name: 'name', inventory: 'inventoryNumber' },
    }) as never);

    assert.equal(response.status, 200);
    assert.equal(calls.some((call) => call.operation === 'equipment.update'), false);
    const approval = calls.find((call) => call.operation === 'equipmentApproval.create');
    assert.equal((approval?.data?.proposedData as Record<string, unknown>).inventoryNumber, 'NEW-1');
  });
});
