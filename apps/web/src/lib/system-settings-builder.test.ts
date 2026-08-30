import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSystemSettings, buildSystemSettingsFromEnv } from './system-settings-builder';

const emptyEnv = {};

test('database settings override environment values and preserve legacy aliases', () => {
  const config = buildSystemSettings(
    [
      { key: 'APP_NAME', value: 'Configured EMS' },
      { key: 'LDAP_ENABLED', value: 'true' },
      { key: 'LDAP_URL', value: 'ldap://configured.example' },
      { key: 'LDAP_SEARCH_BASE', value: 'dc=configured,dc=local' },
      { key: 'SRM_PROVIDER_TYPE', value: 'REDMINE' },
      { key: 'SRM_PROVIDER_URL', value: 'https://redmine.example' },
      { key: 'SRM_PROJECT_KEY', value: 'OPS' },
      { key: 'SRM_API_KEY', value: 'secret' },
      { key: 'SRM_CUSTOM_FIELD_ID', value: 'cf_123' },
    ],
    {
      ...emptyEnv,
      NEXT_PUBLIC_APP_NAME: 'Environment EMS',
      LDAP_URL: 'ldap://environment.example',
      JIRA_BASE_URL: 'https://jira.example',
      JIRA_PROJECT_KEY: 'ENV',
    },
  );

  assert.deepEqual(config, {
    APP_NAME: 'Configured EMS',
    LDAP_ENABLED: true,
    LDAP_URL: 'ldap://configured.example',
    LDAP_SEARCH_BASE: 'dc=configured,dc=local',
    SRM_PROVIDER_TYPE: 'REDMINE',
    SRM_PROVIDER_URL: 'https://redmine.example',
    SRM_PROJECT_KEY: 'OPS',
    SRM_API_KEY: 'secret',
    SRM_CUSTOM_FIELD_ID: 'cf_123',
    JIRA_BASE_URL: 'https://redmine.example',
    JIRA_PROJECT_KEY: 'OPS',
    JIRA_EQUIPMENT_CUSTOM_FIELD: 'cf_123',
  });
});

test('uses legacy database keys before environment fallbacks', () => {
  const config = buildSystemSettings(
    [
      { key: 'JIRA_BASE_URL', value: 'https://legacy.example' },
      { key: 'JIRA_PROJECT_KEY', value: 'LEGACY' },
      { key: 'JIRA_EQUIPMENT_CUSTOM_FIELD', value: 'customfield_legacy' },
    ],
    {
      ...emptyEnv,
      JIRA_BASE_URL: 'https://environment.example',
      JIRA_PROJECT_KEY: 'ENV',
      JIRA_EQUIPMENT_CUSTOM_FIELD: 'customfield_env',
    },
  );

  assert.equal(config.SRM_PROVIDER_URL, 'https://legacy.example');
  assert.equal(config.SRM_PROJECT_KEY, 'LEGACY');
  assert.equal(config.SRM_CUSTOM_FIELD_ID, 'customfield_legacy');
  assert.equal(config.JIRA_BASE_URL, config.SRM_PROVIDER_URL);
  assert.equal(config.JIRA_PROJECT_KEY, config.SRM_PROJECT_KEY);
  assert.equal(config.JIRA_EQUIPMENT_CUSTOM_FIELD, config.SRM_CUSTOM_FIELD_ID);
});

test('uses documented defaults when database and environment are empty', () => {
  assert.deepEqual(buildSystemSettingsFromEnv(emptyEnv), {
    APP_NAME: 'EMS — Equipment Management System',
    LDAP_ENABLED: false,
    LDAP_URL: '',
    LDAP_SEARCH_BASE: 'dc=company,dc=local',
    SRM_PROVIDER_TYPE: 'JIRA',
    SRM_PROVIDER_URL: '',
    SRM_PROJECT_KEY: 'EMS',
    SRM_API_KEY: '',
    SRM_CUSTOM_FIELD_ID: 'customfield_10100',
    JIRA_BASE_URL: '',
    JIRA_PROJECT_KEY: 'EMS',
    JIRA_EQUIPMENT_CUSTOM_FIELD: 'customfield_10100',
  });
});

test('uses environment values for the database fallback configuration', () => {
  const config = buildSystemSettingsFromEnv({
    NEXT_PUBLIC_APP_NAME: 'Environment EMS',
    LDAP_ENABLED: 'true',
    LDAP_URL: 'ldap://environment.example',
    LDAP_SEARCH_BASE: 'dc=environment,dc=local',
    JIRA_HOST: 'https://jira.example',
    JIRA_PROJECT_KEY: 'ENV',
    JIRA_EQUIPMENT_CUSTOM_FIELD: 'customfield_env',
  });

  assert.equal(config.APP_NAME, 'Environment EMS');
  assert.equal(config.LDAP_ENABLED, true);
  assert.equal(config.LDAP_URL, 'ldap://environment.example');
  assert.equal(config.SRM_PROVIDER_URL, 'https://jira.example');
  assert.equal(config.SRM_PROJECT_KEY, 'ENV');
  assert.equal(config.SRM_CUSTOM_FIELD_ID, 'customfield_env');
});
