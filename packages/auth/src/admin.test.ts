import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hasPermission, hasAnyPermission, hasAllPermissions } from './rbac';
import { JwtUserPayload, PERMISSIONS } from '@ems/shared';

describe('Admin & System Audit RBAC Engine', () => {
  const securityAuditorUser: JwtUserPayload = {
    userId: 'auditor-1',
    ldapLogin: 'auditor.orlov',
    displayName: 'Орлов О.О. (Аудитор ИБ)',
    roles: ['security_auditor'],
    permissions: [PERMISSIONS.ADMIN_AUDIT_VIEW],
  };

  const userManagerUser: JwtUserPayload = {
    userId: 'hr-1',
    ldapLogin: 'manager.vasiliev',
    displayName: 'Васильев В.В. (Менеджер пользователей)',
    roles: ['user_manager'],
    permissions: [PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.ADMIN_ROLES_MANAGE],
  };

  const sysAdminUser: JwtUserPayload = {
    userId: 'admin-0',
    ldapLogin: 'root.admin',
    displayName: 'Главный Администратор',
    roles: ['admin'],
    permissions: [], // Суперпользователь имеет доступ ко всем правам по роли
  };

  describe('Security & Audit access control', () => {
    test('Security auditor can view audit logs but cannot modify users or settings', () => {
      assert.strictEqual(hasPermission(securityAuditorUser, PERMISSIONS.ADMIN_AUDIT_VIEW), true);
      assert.strictEqual(hasPermission(securityAuditorUser, PERMISSIONS.ADMIN_USERS_MANAGE), false);
      assert.strictEqual(hasPermission(securityAuditorUser, PERMISSIONS.ADMIN_SETTINGS_MANAGE), false);
    });

    test('User manager can manage users and roles but cannot view audit logs', () => {
      assert.strictEqual(hasPermission(userManagerUser, PERMISSIONS.ADMIN_USERS_MANAGE), true);
      assert.strictEqual(hasPermission(userManagerUser, PERMISSIONS.ADMIN_ROLES_MANAGE), true);
      assert.strictEqual(hasPermission(userManagerUser, PERMISSIONS.ADMIN_AUDIT_VIEW), false);
    });

    test('System Administrator bypasses all permission restrictions', () => {
      assert.strictEqual(hasPermission(sysAdminUser, PERMISSIONS.ADMIN_AUDIT_VIEW), true);
      assert.strictEqual(hasPermission(sysAdminUser, PERMISSIONS.ADMIN_USERS_MANAGE), true);
      assert.strictEqual(hasPermission(sysAdminUser, PERMISSIONS.ADMIN_SETTINGS_MANAGE), true);
      assert.strictEqual(hasPermission(sysAdminUser, PERMISSIONS.EPS_EQUIPMENT_DELETE), true);
    });

    test('hasAllPermissions requires every permission in the list', () => {
      assert.strictEqual(
        hasAllPermissions(userManagerUser, [PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.ADMIN_ROLES_MANAGE]),
        true
      );
      assert.strictEqual(
        hasAllPermissions(userManagerUser, [PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.ADMIN_SETTINGS_MANAGE]),
        false
      );
    });
  });
});
