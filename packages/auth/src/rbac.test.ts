import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hasPermission, hasAnyPermission, hasAllPermissions } from './rbac';
import { JwtUserPayload, PERMISSIONS } from '@ems/shared';

describe('RBAC Authorization Rules', () => {
  const normalUser: JwtUserPayload = {
    userId: 'user-1',
    ldapLogin: 'technician',
    displayName: 'Техник Сидоров',
    roles: ['engineer'],
    permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW, PERMISSIONS.MRO_SCHEDULE_VIEW],
  };

  const adminUser: JwtUserPayload = {
    userId: 'admin-1',
    ldapLogin: 'admin',
    displayName: 'Администратор',
    roles: ['admin'],
    permissions: [],
  };

  test('Regular user has granted permissions', () => {
    assert.strictEqual(hasPermission(normalUser, PERMISSIONS.EPS_EQUIPMENT_VIEW), true);
    assert.strictEqual(hasPermission(normalUser, PERMISSIONS.MRO_SCHEDULE_VIEW), true);
  });

  test('Regular user is denied ungranted permissions', () => {
    assert.strictEqual(hasPermission(normalUser, PERMISSIONS.ADMIN_USERS_MANAGE), false);
    assert.strictEqual(hasPermission(normalUser, PERMISSIONS.WMS_OPERATIONS_CREATE), false);
  });

  test('Admin user has all permissions implicitly', () => {
    assert.strictEqual(hasPermission(adminUser, PERMISSIONS.ADMIN_USERS_MANAGE), true);
    assert.strictEqual(hasPermission(adminUser, PERMISSIONS.EPS_EQUIPMENT_DELETE), true);
    assert.strictEqual(hasPermission(adminUser, PERMISSIONS.WMS_OPERATIONS_CREATE), true);
  });

  test('hasAnyPermission correctly verifies permissions', () => {
    assert.strictEqual(hasAnyPermission(normalUser, [PERMISSIONS.EPS_EQUIPMENT_VIEW, PERMISSIONS.ADMIN_USERS_MANAGE]), true);
    assert.strictEqual(hasAnyPermission(normalUser, [PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.ADMIN_ROLES_MANAGE]), false);
  });

  test('hasAllPermissions correctly verifies all permissions', () => {
    assert.strictEqual(hasAllPermissions(normalUser, [PERMISSIONS.EPS_EQUIPMENT_VIEW, PERMISSIONS.MRO_SCHEDULE_VIEW]), true);
    assert.strictEqual(hasAllPermissions(normalUser, [PERMISSIONS.EPS_EQUIPMENT_VIEW, PERMISSIONS.ADMIN_USERS_MANAGE]), false);
  });

  test('Null user returns false', () => {
    assert.strictEqual(hasPermission(null, PERMISSIONS.EPS_EQUIPMENT_VIEW), false);
    assert.strictEqual(hasAnyPermission(undefined, [PERMISSIONS.EPS_EQUIPMENT_VIEW]), false);
  });
});
