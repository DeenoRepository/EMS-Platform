import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEquipmentOrderBy,
  countActiveEquipmentFilters,
  parseEquipmentFilters,
  serializeEquipmentFilters,
} from '../eps-equipment-filters';

const equipmentFindManyArgs: unknown[] = [];
const equipmentCountArgs: unknown[] = [];

mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => ({ userId: 'user-1', roles: [], permissions: ['eps.equipment.view'] }),
    unauthorizedResponse: () => new Response(null, { status: 401 }),
    forbiddenResponse: () => new Response(null, { status: 403 }),
  },
});
mock.module('@ems/auth', { namedExports: { hasPermission: () => true } });
mock.module('@ems/database', {
  namedExports: {
    EquipmentStatus: {
      ACTIVE: 'ACTIVE',
      UNDER_REPAIR: 'UNDER_REPAIR',
      DECOMMISSIONED: 'DECOMMISSIONED',
      IN_STORAGE: 'IN_STORAGE',
      INACTIVE: 'INACTIVE',
      DRAFT: 'DRAFT',
    },
    prisma: {
      equipment: {
        count: async (args: unknown) => { equipmentCountArgs.push(args); return 2; },
        findMany: async (args: unknown) => { equipmentFindManyArgs.push(args); return []; },
        groupBy: async () => [],
      },
    },
  },
});

describe('EPS equipment filter contract', () => {
  test('round-trips multi-value filters and pagination', () => {
    const filters = parseEquipmentFilters(new URLSearchParams(
      'search=pump&status=ACTIVE,UNDER_REPAIR,ACTIVE&tagId=t1,t2&sortBy=name&sortDirection=asc&page=2&pageSize=50',
    ));
    const serialized = serializeEquipmentFilters(filters);

    assert.deepEqual(filters.statuses, ['ACTIVE', 'UNDER_REPAIR']);
    assert.deepEqual(filters.tagIds, ['t1', 't2']);
    assert.equal(serialized.get('page'), '2');
    assert.equal(serialized.get('sortBy'), 'name');
  });

  test('counts only active filters and whitelists ordering fields', () => {
    const filters = parseEquipmentFilters(new URLSearchParams('status=ACTIVE&tagId=t1&location=shop'));
    assert.equal(countActiveEquipmentFilters(filters), 3);
    assert.deepEqual(buildEquipmentOrderBy(filters), { updatedAt: 'desc' });
  });

  test('GET equipment applies server filters and rejects unknown status', async () => {
    const { GET } = await import('../../app/api/eps/equipment/route');
    const response = await GET(new Request(
      'http://localhost/api/eps/equipment?status=ACTIVE,UNDER_REPAIR&tagId=t1,t2&sortBy=name&sortDirection=asc&page=2&pageSize=10',
    ) as never);

    assert.equal(response.status, 200);
    assert.deepEqual((equipmentFindManyArgs[0] as { orderBy: unknown }).orderBy, { name: 'asc' });
    assert.equal((equipmentFindManyArgs[0] as { skip: number }).skip, 10);
    assert.equal((equipmentFindManyArgs[0] as { take: number }).take, 10);
    assert.deepEqual((equipmentFindManyArgs[0] as { where: { status: unknown } }).where.status, { in: ['ACTIVE', 'UNDER_REPAIR'] });

    const invalidResponse = await GET(new Request(
      'http://localhost/api/eps/equipment?status=UNKNOWN',
    ) as never);
    assert.equal(invalidResponse.status, 400);
    assert.equal(equipmentCountArgs.length, 1);
  });
});
