/**
 * Executable fail-closed tests for POST /api/srm/webhooks/[id].
 *
 * The handler itself is imported and invoked. Prisma, provider mapping, and
 * notifications are mocked so no database or external SRM system is used.
 */
import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRequest } from './helpers/route-harness';

interface IntegrationFixture {
  id: string;
  isActive: boolean;
  authConfig: { secret?: string; allowUnsigned?: boolean };
  mappingConfig: Record<string, unknown>;
}

let integration: IntegrationFixture;
let upsertCalls = 0;

const prismaMock = {
  srmIntegration: {
    findUnique: async () => integration,
    update: async () => integration,
  },
  equipment: {
    findMany: async () => [],
  },
  jiraIssueCache: {
    upsert: async () => {
      upsertCalls += 1;
      return { issueKey: 'TEST-1', status: 'OPEN', equipmentId: null };
    },
  },
};

mock.module('@ems/database', {
  namedExports: {
    prisma: prismaMock,
    Prisma: {},
  },
});

mock.module('@/lib/rate-limit', {
  namedExports: { enforceRateLimit: async () => null },
});

mock.module('@/lib/logger', {
  namedExports: {
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  },
});

mock.module('@/lib/safe-error', {
  namedExports: {
    toSafeErrorDetails: (error: unknown, publicError: string) => ({
      publicError,
      logMessage: error instanceof Error ? error.message : String(error),
      correlationId: 'test-correlation-id',
    }),
  },
});

mock.module('@/lib/srm-providers', {
  namedExports: {
    getSrmWebhookAuthPolicy: (authConfig: IntegrationFixture['authConfig']) => ({
      secret: authConfig.secret?.trim() || null,
      allowUnsigned: authConfig.allowUnsigned === true,
    }),
    extractIssueFromWebhookPayload: () => ({ key: 'TEST-1', summary: 'Test issue' }),
  },
});

mock.module('@/lib/jira-service', {
  namedExports: {
    getJiraFieldMapping: async () => ({}),
    applyJiraFieldMapping: async () => ({
      issueKey: 'TEST-1',
      summary: 'Test issue',
      status: 'OPEN',
      priority: null,
      issueType: null,
      assignee: null,
      reporter: null,
      createdDate: null,
      resolvedDate: null,
      equipmentId: null,
    }),
    notifySrmIncident: async () => {},
  },
});

let webhookPOST: (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

before(async () => {
  const routeModule = await import('@/app/api/srm/webhooks/[id]/route');
  webhookPOST = routeModule.POST as unknown as typeof webhookPOST;
});

beforeEach(() => {
  integration = {
    id: 'integration-1',
    isActive: true,
    authConfig: { secret: 'expected-secret' },
    mappingConfig: {},
  };
  upsertCalls = 0;
});

function invoke(headers?: Record<string, string>, searchParams?: Record<string, string>) {
  return webhookPOST(
    makeRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/srm/webhooks/integration-1',
      headers,
      searchParams,
      body: { issue: { key: 'TEST-1' } },
    }),
    { params: Promise.resolve({ id: 'integration-1' }) },
  );
}

describe('POST /api/srm/webhooks/[id] fail-closed authentication', () => {
  test('returns 401 when a configured secret is absent', async () => {
    const response = await invoke();

    assert.equal(response.status, 401);
    assert.equal(upsertCalls, 0);
  });

  test('returns 401 when a configured secret is wrong', async () => {
    const response = await invoke({ 'x-webhook-secret': 'wrong-secret' });

    assert.equal(response.status, 401);
    assert.equal(upsertCalls, 0);
  });

  test('returns 200 when the configured secret is correct', async () => {
    const response = await invoke({ 'x-webhook-secret': 'expected-secret' });
    const body = (await response.json()) as { success: boolean; data: { issueKey: string } };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.issueKey, 'TEST-1');
    assert.equal(upsertCalls, 1);
  });

  test('accepts a correct token query parameter', async () => {
    const response = await invoke(undefined, { token: 'expected-secret' });

    assert.equal(response.status, 200);
    assert.equal(upsertCalls, 1);
  });

  test('returns 401 for an active integration with no secure auth policy', async () => {
    integration.authConfig = {};
    const response = await invoke();

    assert.equal(response.status, 401);
    assert.equal(upsertCalls, 0);
  });

  test('allows unsigned delivery only when explicitly enabled', async () => {
    integration.authConfig = { allowUnsigned: true };
    const response = await invoke();

    assert.equal(response.status, 200);
    assert.equal(upsertCalls, 1);
  });
});
