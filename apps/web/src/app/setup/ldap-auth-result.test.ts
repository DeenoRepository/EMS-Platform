import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapLdapAuthNetworkError, mapLdapAuthResponse } from './ldap-auth-result';

test('maps successful LDAP auth and fills default administrator profile fields', () => {
  assert.deepEqual(
    mapLdapAuthResponse(
      true,
      { success: true, message: 'LDAP проверен', user: { displayName: 'Иван Иванов', email: 'ivan@example.com' } },
      { adminDisplayName: 'Главный Администратор', adminEmail: 'admin@company.local' }
    ),
    {
      result: { success: true, message: 'LDAP проверен' },
      ldapAuthVerified: true,
      adminDisplayName: 'Иван Иванов',
      adminEmail: 'ivan@example.com',
    }
  );
});

test('maps success without a user and preserves non-default profile fields', () => {
  assert.deepEqual(
    mapLdapAuthResponse(
      true,
      { success: true },
      { adminDisplayName: 'Configured Name', adminEmail: 'configured@example.com' }
    ),
    { result: { success: true, message: '' }, ldapAuthVerified: true }
  );
});

test('maps API failures and preserves the server error', () => {
  assert.deepEqual(
    mapLdapAuthResponse(
      false,
      { success: false, error: 'LDAP недоступен' },
      { adminDisplayName: '', adminEmail: '' }
    ),
    {
      result: { success: false, message: 'LDAP недоступен' },
      ldapAuthVerified: false,
    }
  );
});

test('maps network failures to the existing user-facing message', () => {
  assert.deepEqual(mapLdapAuthNetworkError(), {
    result: { success: false, message: 'Ошибка сети при проверке службы LDAP' },
    ldapAuthVerified: false,
  });
});
