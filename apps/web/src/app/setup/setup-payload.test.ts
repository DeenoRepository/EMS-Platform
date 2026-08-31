import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildSetupPayload, type SetupPayloadInput } from './setup-payload';

const baseInput: SetupPayloadInput = {
  dbHost: 'localhost',
  dbPort: '5432',
  dbName: 'ems',
  dbUser: 'postgres',
  dbPassword: 'secret',
  adminLogin: 'admin',
  adminDisplayName: 'Admin',
  adminEmail: 'admin@example.com',
  adminPassword: 'password123',
  authMode: 'local',
  ldapEnabled: false,
  ldapUrl: '',
  ldapBindDn: '',
  ldapBindPassword: '',
  ldapSearchBase: '',
  ldapSearchFilter: '',
  storageDir: '/data/uploads',
  srmUrl: '',
  srmProjectKey: '',
  srmApiKey: '',
};

describe('setup payload builder', () => {
  test('builds db, admin, storage, and jira config sections for local auth', () => {
    const payload = buildSetupPayload(baseInput);
    assert.deepEqual(payload.dbConfig, {
      host: 'localhost',
      port: '5432',
      database: 'ems',
      user: 'postgres',
      password: 'secret',
    });
    assert.deepEqual(payload.adminConfig, {
      login: 'admin',
      displayName: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      authType: 'local',
    });
    assert.equal(payload.ldapConfig.enabled, false);
    assert.equal(payload.ldapConfig.useForAdmin, false);
    assert.equal(payload.storageConfig.dir, '/data/uploads');
  });

  test('blanks the admin password and enables LDAP when auth mode is ldap', () => {
    const payload = buildSetupPayload({ ...baseInput, authMode: 'ldap', ldapUrl: 'ldap://dc.local' });
    assert.equal(payload.adminConfig.password, '');
    assert.equal(payload.adminConfig.authType, 'ldap');
    assert.equal(payload.ldapConfig.enabled, true);
    assert.equal(payload.ldapConfig.useForAdmin, true);
    assert.equal(payload.ldapConfig.url, 'ldap://dc.local');
  });

  test('enables LDAP config when ldapEnabled is set independently of authMode', () => {
    const payload = buildSetupPayload({ ...baseInput, ldapEnabled: true });
    assert.equal(payload.ldapConfig.enabled, true);
    assert.equal(payload.ldapConfig.useForAdmin, false);
  });

  test('maps srm fields into the jira config section', () => {
    const payload = buildSetupPayload({ ...baseInput, srmUrl: 'https://srm.example', srmProjectKey: 'OPS', srmApiKey: 'token' });
    assert.deepEqual(payload.jiraConfig, {
      host: 'https://srm.example',
      email: '',
      apiToken: 'token',
      projectKey: 'OPS',
    });
  });
});
