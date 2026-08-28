import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  escapeLdapFilter,
  constructUserPrincipalName,
  authenticateLdap,
  testLdapConnection,
} from './ldap';

describe('LDAP Core Authentication & Utilities', () => {
  describe('escapeLdapFilter', () => {
    it('escapes wildcard, parenthesis, backslash, NUL, and slash characters', () => {
      const input = 'admin*(test)\\user/\x00evil';
      const escaped = escapeLdapFilter(input);
      assert.strictEqual(escaped, 'admin\\2a\\28test\\29\\5cuser\\2f\\00evil');
    });

    it('returns empty string unchanged', () => {
      assert.strictEqual(escapeLdapFilter(''), '');
    });

    it('preserves alphanumeric characters and safe symbols', () => {
      const safe = 'user.name-123_abc';
      assert.strictEqual(escapeLdapFilter(safe), safe);
    });
  });

  describe('constructUserPrincipalName', () => {
    it('preserves existing UPN with @', () => {
      assert.strictEqual(constructUserPrincipalName('user@company.local'), 'user@company.local');
    });

    it('preserves existing NetBIOS format with backslash', () => {
      assert.strictEqual(constructUserPrincipalName('DOMAIN\\user'), 'DOMAIN\\user');
    });

    it('extracts domain from searchBase when available', () => {
      const upn = constructUserPrincipalName('ivanov', 'OU=Users,DC=corp,DC=example,DC=com');
      assert.strictEqual(upn, 'ivanov@corp.example.com');
    });

    it('extracts domain from ldapUrl when searchBase has no DC components', () => {
      const upn = constructUserPrincipalName('ivanov', '', 'ldap://dc01.corp.example.com:389');
      assert.strictEqual(upn, 'ivanov@example.com');
    });

    it('returns clean username when neither searchBase nor ldapUrl has domain', () => {
      assert.strictEqual(constructUserPrincipalName('ivanov'), 'ivanov');
    });
  });

  describe('authenticateLdap', () => {
    it('returns null when LDAP is disabled', async () => {
      const result = await authenticateLdap('test.user', 'password123', {
        ldapEnabled: false,
        ldapUrl: 'ldap://localhost:389',
      });
      assert.strictEqual(result, null);
    });

    it('returns null when credentials or URL are missing', async () => {
      const result = await authenticateLdap('', '', {
        ldapEnabled: true,
      });
      assert.strictEqual(result, null);
    });
  });

  describe('testLdapConnection', () => {
    it('returns error on invalid URL', async () => {
      const result = await testLdapConnection({
        url: 'invalid-url-format',
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });
});
