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
const equipmentGroupByArgs: unknown[] = [];

mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => ({ userId: 'user-1', roles: [], permissions: ['eps.equipment.view'] }),
    unauthorizedResponse: () => new Response(null, { status: 401 }),
    forbiddenResponse: () => new Response(null, { status: 403 }),
  },
});
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (_user: unknown, permission: string) => permission !== 'eps.approvals.manage',
  },
});
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
        groupBy: async (args: unknown) => {
          equipmentGroupByArgs.push(args);
          const by = (args as { by?: string[] }).by;
          if (by?.[0] === 'manufacturer') return [{ manufacturer: 'Acme', _count: { _all: 3 } }];
          if (by?.[0] === 'location') return [{ location: 'Workshop', _count: { _all: 2 } }];
          return [];
        },
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
    const listWhere = (equipmentFindManyArgs[0] as { where: Record<string, unknown> }).where;
    assert.deepEqual(listWhere.manufacturer, undefined);
    assert.deepEqual(listWhere.location, undefined);
    assert.deepEqual((equipmentGroupByArgs[1] as { by: string[] }).by, ['manufacturer']);
    assert.deepEqual((equipmentGroupByArgs[2] as { by: string[] }).by, ['location']);
    assert.equal('skip' in (equipmentGroupByArgs[1] as object), false);
    assert.equal('take' in (equipmentGroupByArgs[2] as object), false);
    const responseBody = await response.json() as { data: { facets: unknown } };
    assert.deepEqual(responseBody.data.facets, {
      manufacturers: [{ value: 'Acme', count: 3 }],
      locations: [{ value: 'Workshop', count: 2 }],
    });

    const invalidResponse = await GET(new Request(
      'http://localhost/api/eps/equipment?status=UNKNOWN',
    ) as never);
    assert.equal(invalidResponse.status, 400);
    assert.equal(equipmentCountArgs.length, 1);
  });

  test('GET applies manufacturer and location predicates while preserving draft visibility and soft-delete scope', async () => {
    equipmentFindManyArgs.length = 0;
    equipmentGroupByArgs.length = 0;

    const { GET } = await import('../../app/api/eps/equipment/route');
    const response = await GET(new Request(
      'http://localhost/api/eps/equipment?manufacturer=Acme&location=Workshop',
    ) as never);

    assert.equal(response.status, 200);
    const where = (equipmentFindManyArgs[0] as { where: Record<string, unknown> }).where;
    assert.deepEqual(where.manufacturer, { contains: 'Acme', mode: 'insensitive' });
    assert.deepEqual(where.location, { contains: 'Workshop', mode: 'insensitive' });
    assert.equal(where.deletedAt, null);
    assert.deepEqual(where.OR, [
      { status: { not: 'DRAFT' } },
      { status: 'DRAFT', createdById: 'user-1' },
    ]);

    for (const args of equipmentGroupByArgs as Array<{ where: Record<string, unknown> }>) {
      assert.equal(args.where.deletedAt, null);
      assert.deepEqual(args.where.OR, where.OR);
      assert.equal('skip' in args, false);
      assert.equal('take' in args, false);
    }
  });

  test('does not add an unverified numeric customFields JSON range predicate', () => {
    const filters = parseEquipmentFilters(new URLSearchParams('search=45'));
    assert.equal('customFields' in filters, false);
  });
});
