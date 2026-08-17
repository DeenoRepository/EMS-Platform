import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getSrmAdapter, getAvailableSrmProviders } from '../../../apps/web/src/lib/srm-providers';

describe('SRM Provider Adapter Architecture', () => {
  test('Factory returns appropriate adapters for provider types', () => {
    const jiraAdapter = getSrmAdapter('JIRA');
    assert.strictEqual(jiraAdapter.providerType, 'JIRA');

    const redmineAdapter = getSrmAdapter('REDMINE');
    assert.strictEqual(redmineAdapter.providerType, 'REDMINE');

    const gitlabAdapter = getSrmAdapter('GITLAB_ISSUES');
    assert.strictEqual(gitlabAdapter.providerType, 'GITLAB_ISSUES');

    const genericAdapter = getSrmAdapter('REST_GENERIC');
    assert.strictEqual(genericAdapter.providerType, 'REST_GENERIC');
  });

  test('Available providers list contains full metadata for supported systems', () => {
    const providers = getAvailableSrmProviders();
    assert.ok(providers.length >= 4);

    const types = providers.map((p) => p.type);
    assert.ok(types.includes('JIRA'));
    assert.ok(types.includes('REDMINE'));
    assert.ok(types.includes('GITLAB_ISSUES'));
    assert.ok(types.includes('REST_GENERIC'));
  });

  test('Redmine adapter metadata has default endpoint and mappings', () => {
    const redmine = getSrmAdapter('REDMINE').getMetadata();
    assert.strictEqual(redmine.defaultEndpoint, '/issues.json');
    assert.strictEqual(redmine.defaultAuthType, 'API_KEY');
    assert.ok(redmine.defaultMapping.standardMappings?.some((m) => m.srmField === 'summary'));
  });

  test('Generic REST adapter handles fallback gracefully', () => {
    const custom = getSrmAdapter('CUSTOM_WEBHOOK');
    assert.ok(custom !== null);
    assert.strictEqual(custom.providerType, 'REST_GENERIC');
  });
});
