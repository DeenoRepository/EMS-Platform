import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GenericRestProviderAdapter,
  GitLabProviderAdapter,
  JiraProviderAdapter,
  RedmineProviderAdapter,
} from './index';
import type { SrmIntegration } from '@ems/database';

function integration(overrides: Partial<SrmIntegration> = {}): SrmIntegration {
  return {
    id: 'integration-1',
    name: 'Test integration',
    providerType: 'REST_GENERIC',
    baseUrl: 'https://srm.example.test/',
    authType: 'NONE',
    authConfig: {},
    queryConfig: {},
    isActive: true,
    isDefault: false,
    syncInterval: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SrmIntegration;
}

function jsonResponse(payload: unknown, status = 200, statusText = 'OK'): Response {
  return new Response(JSON.stringify(payload), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  });
}

describe('SRM provider adapter contracts', () => {
  test('Jira adapter builds Basic auth, tests connection, and fetches issues with encoded JQL', async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return calls.length === 1
        ? jsonResponse({ displayName: 'Jira User' })
        : jsonResponse({ issues: [{ key: 'EMS-1' }] });
    };

    try {
      const adapter = new JiraProviderAdapter();
      const testResult = await adapter.testConnection(integration({
        providerType: 'JIRA',
        baseUrl: 'https://jira.example.test/',
        authType: 'BASIC',
        authConfig: { username: 'jira-user', apiToken: 'jira-secret' },
        queryConfig: {},
      }));
      const issues = await adapter.fetchIssues(integration({
        providerType: 'JIRA',
        baseUrl: 'https://jira.example.test/',
        authType: 'BASIC',
        authConfig: { username: 'jira-user', apiToken: 'jira-secret' },
        queryConfig: { projectKey: 'EMS', jql: 'project = EMS AND status = Open', maxResults: 10 },
      }));

      assert.equal(testResult.success, true);
      assert.match(testResult.message, /Jira User/);
      assert.deepEqual(issues, [{ key: 'EMS-1' }]);
      assert.equal(calls[0].url, 'https://jira.example.test/rest/api/2/myself');
      assert.match(String(new Headers(calls[0].init?.headers).get('Authorization')), /^Basic /);
      assert.match(calls[1].url, /jql=project%20%3D%20EMS%20AND%20status%20%3D%20Open/);
      assert.match(calls[1].url, /maxResults=10/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('GitLab adapter sends PRIVATE-TOKEN and validates missing project ID', async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return jsonResponse({ name: 'GitLab User', username: 'gitlab' });
    };

    try {
      const adapter = new GitLabProviderAdapter();
      const result = await adapter.testConnection(integration({
        providerType: 'GITLAB_ISSUES',
        baseUrl: 'https://gitlab.example.test',
        authType: 'BEARER',
        authConfig: { token: 'gitlab-secret' },
      }));
      assert.equal(result.success, true);
      assert.match(result.message, /GitLab User/);

      await assert.rejects(
        adapter.fetchIssues(integration({ providerType: 'GITLAB_ISSUES', queryConfig: {} })),
        /Project ID/,
      );
      assert.deepEqual(calls, ['https://gitlab.example.test/api/v4/user']);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('Redmine adapter maps current user and returns an empty issue list from a missing collection', async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({ user: { firstname: 'Red', lastname: 'Mine', login: 'redmine' } });
    };

    try {
      const adapter = new RedmineProviderAdapter();
      const result = await adapter.testConnection(integration({
        providerType: 'REDMINE',
        baseUrl: 'https://redmine.example.test/',
        authType: 'API_KEY',
        authConfig: { apiKey: 'redmine-secret' },
      }));
      assert.equal(result.success, true);
      assert.match(result.message, /Red Mine \(redmine\)/);
      assert.equal(calls[0].url, 'https://redmine.example.test/users/current.json');
      assert.equal(new Headers(calls[0].init?.headers).get('X-Redmine-API-Key'), 'redmine-secret');

      globalThis.fetch = async () => jsonResponse({});
      assert.deepEqual(await adapter.fetchIssues(integration({
        providerType: 'REDMINE',
        baseUrl: 'https://redmine.example.test',
        authType: 'API_KEY',
        authConfig: { apiKey: 'secret' },
        queryConfig: { projectId: 42, limit: 5 },
      })), []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('Generic REST adapter handles endpoint paths, POST bodies, and nested item extraction', async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({ data: { incidents: [{ id: 'INC-1' }] } });
    };

    try {
      const adapter = new GenericRestProviderAdapter();
      const result = await adapter.testConnection(integration({
        authType: 'BEARER',
        authConfig: { token: 'rest-secret' },
        queryConfig: { testEndpoint: 'health' },
      }));
      const issues = await adapter.fetchIssues(integration({
        baseUrl: 'https://rest.example.test/',
        authType: 'API_KEY',
        authConfig: { apiKey: 'rest-secret', headerName: 'X-Service-Key' },
        queryConfig: { endpoint: '/incidents', method: 'POST', body: { state: 'open' }, itemsPath: 'data.incidents' },
      }));

      assert.equal(result.success, true);
      assert.deepEqual(issues, [{ id: 'INC-1' }]);
      assert.equal(calls[0].url, 'https://srm.example.test/health');
      assert.equal(new Headers(calls[0].init?.headers).get('Authorization'), 'Bearer rest-secret');
      assert.equal(calls[1].url, 'https://rest.example.test/incidents');
      assert.equal(calls[1].init?.method, 'POST');
      assert.equal(calls[1].init?.body, JSON.stringify({ state: 'open' }));
      assert.equal(new Headers(calls[1].init?.headers).get('X-Service-Key'), 'rest-secret');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('returns safe failure results for non-2xx and transport errors', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => jsonResponse({}, 401, 'Unauthorized');
      const jira = await new JiraProviderAdapter().testConnection(integration({ providerType: 'JIRA' }));
      const rest = await new GenericRestProviderAdapter().testConnection(integration());
      assert.equal(jira.success, false);
      assert.equal(jira.statusCode, 401);
      assert.equal(rest.success, false);
      assert.equal(rest.statusCode, 401);

      globalThis.fetch = async () => { throw new Error('network unavailable'); };
      const gitlab = await new GitLabProviderAdapter().testConnection(integration({ providerType: 'GITLAB_ISSUES' }));
      assert.equal(gitlab.success, false);
      assert.match(gitlab.message, /network unavailable/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
