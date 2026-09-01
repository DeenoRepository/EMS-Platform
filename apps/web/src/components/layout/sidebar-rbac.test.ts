import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAccessNavItem } from './sidebar-rbac';

test('canAccessNavItem allows public navigation entries', () => {
  assert.equal(canAccessNavItem(null, undefined, () => false), true);
});

test('canAccessNavItem grants administrator access without checking permissions', () => {
  let checks = 0;
  assert.equal(
    canAccessNavItem({ roles: ['admin'] }, { permission: 'admin.settings.manage' }, () => {
      checks += 1;
      return false;
    }),
    true,
  );
  assert.equal(checks, 0);
});

test('canAccessNavItem supports any-of permission groups', () => {
  const checked: string[] = [];
  assert.equal(
    canAccessNavItem(null, { permissions: ['wms.stock.view', 'wms.operations.create'] }, (permission) => {
      checked.push(permission);
      return permission === 'wms.operations.create';
    }),
    true,
  );
  assert.deepEqual(checked, ['wms.stock.view', 'wms.operations.create']);
});

test('canAccessNavItem denies a missing single permission', () => {
  assert.equal(canAccessNavItem({ roles: ['storekeeper'] }, { permission: 'admin.roles.manage' }, () => false), false);
});

test('canAccessNavItem leaves permissionless entries visible for authenticated users', () => {
  assert.equal(canAccessNavItem({ roles: ['viewer'] }, {}, () => false), true);
});
