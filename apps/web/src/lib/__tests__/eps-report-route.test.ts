import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

const findManyArgs: unknown[] = [];
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
    equipment: { findMany: async (args: unknown) => { findManyArgs.push(args); return []; } },
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
});
