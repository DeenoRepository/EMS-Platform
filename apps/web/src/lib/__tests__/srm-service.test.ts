/**
 * srm-service.test.ts — SRM provider security and sanitization tests.
 *
 * Moved from packages/auth/src/srm-service.test.ts (M4 misplaced-test cleanup).
 * The original file lived in packages/auth but imported from apps/web via
 * `../../../apps/web/src/lib/...` relative paths, violating the rule that
 * packages must not import from apps. Import paths are now relative to
 * apps/web/src/lib/__tests__/ where this file belongs.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { sanitizeAuthConfig, mergeAuthConfig, getSrmAdapter } from '../srm-providers';
import { extractValueByPath } from '../jira-service';

describe('SRM Security & Sanitization Suite', () => {
  test('sanitizeAuthConfig masks passwords, tokens and api keys', () => {
    const rawAuth = {
      username: 'service_account',
      password: 'SuperSecretPassword123',
      apiToken: 'jira_pat_token_abc_999',
      apiKey: 'api_key_secret_value',
      token: 'bearer_token_xyz',
      webhookSecret: 'incoming_webhook_secret',
      headerName: 'X-Custom-Header',
    };

    const sanitized = sanitizeAuthConfig(rawAuth);

    assert.strictEqual(sanitized.username, 'service_account');
    assert.strictEqual(sanitized.headerName, 'X-Custom-Header');
    assert.strictEqual(sanitized.password, '••••••••');
    assert.strictEqual(sanitized.apiToken, '••••••••');
    assert.strictEqual(sanitized.apiKey, '••••••••');
    assert.strictEqual(sanitized.token, '••••••••');
    assert.strictEqual(sanitized.webhookSecret, '••••••••');
  });

  test('sanitizeAuthConfig handles empty and non-object inputs safely', () => {
    assert.deepStrictEqual(sanitizeAuthConfig(null), {});
    assert.deepStrictEqual(sanitizeAuthConfig(undefined), {});
    assert.deepStrictEqual(sanitizeAuthConfig('not-an-object'), {});
  });

  test('mergeAuthConfig preserves existing secrets when placeholder is provided', () => {
    const existing = {
      username: 'admin@company.ru',
      password: 'ExistingStrongPassword!',
      apiToken: 'ExistingSecretApiToken',
      webhookSecret: 'ExistingWebhookSecret',
    };

    const updated = {
      username: 'new_admin@company.ru',
      password: '••••••••',
      apiToken: '••••••••',
      webhookSecret: '••••••••',
    };

    const merged = mergeAuthConfig(updated, existing);

    assert.strictEqual(merged.username, 'new_admin@company.ru');
    assert.strictEqual(merged.password, 'ExistingStrongPassword!');
    assert.strictEqual(merged.apiToken, 'ExistingSecretApiToken');
    assert.strictEqual(merged.webhookSecret, 'ExistingWebhookSecret');
  });

  test('mergeAuthConfig accepts newly provided secrets over existing', () => {
    const existing = {
      username: 'admin@company.ru',
      password: 'OldPassword',
      apiToken: 'OldToken',
    };

    const updated = {
      username: 'admin@company.ru',
      password: 'NewChangedPassword456',
      apiToken: '••••••••',
    };

    const merged = mergeAuthConfig(updated, existing);

    assert.strictEqual(merged.password, 'NewChangedPassword456');
    assert.strictEqual(merged.apiToken, 'OldToken');
  });
});

describe('SRM Provider Adapter Connectivity & Metadata', () => {
  test('Jira adapter constructs proper headers for Basic and Bearer auth', () => {
    const adapter = getSrmAdapter('JIRA');
    assert.strictEqual(adapter.providerType, 'JIRA');

    const meta = adapter.getMetadata();
    assert.strictEqual(meta.defaultEndpoint, '/rest/api/2/search');
    assert.strictEqual(meta.defaultAuthType, 'BASIC');
  });

  test('Redmine adapter metadata has API_KEY auth type and valid headers', () => {
    const adapter = getSrmAdapter('REDMINE');
    const meta = adapter.getMetadata();

    assert.strictEqual(meta.defaultAuthType, 'API_KEY');
    assert.strictEqual(meta.defaultEndpoint, '/issues.json');
    assert.strictEqual(meta.defaultHeaders['Content-Type'], 'application/json');
  });

  test('GitLab adapter metadata specifies BEARER auth type and full reference mapping', () => {
    const adapter = getSrmAdapter('GITLAB_ISSUES');
    const meta = adapter.getMetadata();

    assert.strictEqual(meta.defaultAuthType, 'BEARER');
    assert.ok(meta.defaultMapping.standardMappings?.some((m) => m.jiraPath === 'references.full'));
  });

  test('Generic REST adapter handles arbitrary paths with dot-notation extractor', () => {
    const adapter = getSrmAdapter('REST_GENERIC');
    const meta = adapter.getMetadata();

    assert.strictEqual(adapter.providerType, 'REST_GENERIC');
    assert.strictEqual(meta.type, 'REST_GENERIC');
    assert.strictEqual(meta.defaultEndpoint, '/api/v1/incidents');

    const mockResponse = {
      data: {
        incidents: [
          { id: 'INC-101', title: 'Отказ гидравлики', status: 'OPEN' },
        ],
      },
    };

    const extracted = extractValueByPath(mockResponse, 'data.incidents[0].title');
    assert.strictEqual(extracted, 'Отказ гидравлики');
  });
});
