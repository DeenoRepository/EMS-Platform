import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

const findManyArgs: unknown[] = [];
const countArgs: unknown[] = [];
mock.module('@/lib/auth-guard', { namedExports: {
  getCurrentUser: async () => ({ userId: 'user-1', roles: [], permissions: ['eps.reports.view'] }),
  unauthorizedResponse: () => new Response(null, { status: 401 }), forbiddenResponse: () => new Response(null, { status: 403 }),
} });
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@ems/auth', { namedExports: { hasPermission: (_user: unknown, permission: string) => permission === 'eps.reports.view' } });
mock.module('@ems/database', { namedExports: {
  EquipmentStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT' },
  prisma: {
    customSection: { findMany: async () => [] }, customFieldDefinition: { findMany: async () => [] },
    equipment: {
      findMany: async (args: unknown) => { findManyArgs.push(args); return []; },
      count: async (args: unknown) => { countArgs.push(args); return 27; },
    },
    jiraIssueCache: { groupBy: async () => [] },
  },
} });

describe('EPS report production handler', () => {
  test('preserves equipment visibility while searching', async () => {
    const { POST } = await import('../../app/api/eps/reports/generate/route');
    const response = await POST(new Request('http://localhost/api/eps/reports/generate', {
      method: 'POST', body: JSON.stringify({ filters: { search: 'pump' } }), headers: { 'content-type': 'application/json' },
    }) as never);
    assert.equal(response.status, 200);
    const where = (findManyArgs[0] as { where: Record<string, unknown> }).where;
    assert.equal(where.deletedAt, null);
    const clauses = (where.AND as Array<Record<string, unknown>> | undefined) || [where];
    const visibilityClause = clauses.find((clause) =>
      Array.isArray(clause.OR) && clause.OR.some((item) => 'status' in item),
    );
    assert.deepEqual(visibilityClause?.OR, [
      { status: { not: 'DRAFT' } },
      { status: 'DRAFT', createdById: 'user-1' },
    ]);
  });

  test('applies server sorting and pagination with metadata', async () => {
    const { POST } = await import('../../app/api/eps/reports/generate/route');
    const response = await POST(new Request('http://localhost/api/eps/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        page: 2,
        limit: 10,
        sort: { field: 'name', order: 'asc' },
      }),
      headers: { 'content-type': 'application/json' },
    }) as never);

    assert.equal(response.status, 200);
    const query = findManyArgs.at(-1) as {
      orderBy: Record<string, string>;
      skip: number;
      take: number;
    };
    assert.deepEqual(query.orderBy, { name: 'asc' });
    assert.equal(query.skip, 10);
    assert.equal(query.take, 10);
    assert.deepEqual(countArgs.at(-1), { where: (query as unknown as { where: unknown }).where });

    const json = await response.json();
    assert.equal(json.data.total, 27);
    assert.equal(json.data.page, 2);
    assert.equal(json.data.pageSize, 10);
    assert.equal(json.data.totalPages, 3);
  });
});
