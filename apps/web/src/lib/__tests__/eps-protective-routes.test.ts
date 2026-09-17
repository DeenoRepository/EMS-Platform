import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const permissions = {
  EPS_EQUIPMENT_VIEW: 'eps.equipment.view',
  EPS_CUSTOM_FIELDS_MANAGE: 'eps.custom-fields.manage',
  EPS_EQUIPMENT_CREATE: 'eps.equipment.create',
  EPS_IMPORT_EXECUTE: 'eps.import.execute',
};

const findManyCalls: unknown[] = [];
const writeCalls: string[] = [];

mock.module('@ems/shared', { namedExports: { PERMISSIONS: permissions } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => ({ userId: 'user-1', roles: ['engineer'], permissions: Object.values(permissions) }),
    unauthorizedResponse: () => new Response(null, { status: 401 }),
    forbiddenResponse: () => new Response(null, { status: 403 }),
  },
});
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: () => true,
    logAuditEvent: async () => undefined,
  },
});
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@ems/database', {
  namedExports: {
    prisma: {
      customSection: {
        findMany: async (args: unknown) => {
          findManyCalls.push(args);
          return [];
        },
      },
      customFieldDefinition: {
        findMany: async (args: unknown) => {
          findManyCalls.push(args);
          return [];
        },
        deleteMany: async () => writeCalls.push('customFieldDefinition.deleteMany'),
        updateMany: async () => writeCalls.push('customFieldDefinition.updateMany'),
        create: async () => writeCalls.push('customFieldDefinition.create'),
        update: async () => writeCalls.push('customFieldDefinition.update'),
      },
      equipment: {
        findMany: async () => [],
        deleteMany: async () => writeCalls.push('equipment.deleteMany'),
      },
    },
    FieldType: { TEXT: 'TEXT' },
    EquipmentStatus: { ACTIVE: 'ACTIVE' },
  },
});

function makeRequest(url: string, body?: unknown): Request {
  return new Request(url, {
    method: body === undefined ? 'GET' : 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
  });
}

describe('EPS protective production handlers', () => {
  beforeEach(() => {
    findManyCalls.length = 0;
    writeCalls.length = 0;
  });

  test('GET /api/eps/custom-sections only reads data', async () => {
    const { GET } = await import('../../app/api/eps/custom-sections/route');

    const response = await GET(makeRequest('http://localhost/api/eps/custom-sections') as never);

    assert.equal(response.status, 200);
    assert.deepEqual(writeCalls, []);
    assert.equal(findManyCalls.length, 2);
  });

  test('POST /api/eps/import/execute rejects FULL_REPLACE before database writes', async () => {
    const { POST } = await import('../../app/api/eps/import/execute/route');

    const response = await POST(
      makeRequest('http://localhost/api/eps/import/execute', {
        rows: [{ name: 'Pump' }],
        columnMapping: { name: 'name' },
        conflictStrategy: 'FULL_REPLACE',
        fullReplaceConfirmed: true,
      }) as never
    );

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /FULL_REPLACE/);
    assert.deepEqual(writeCalls, []);
  });
});
