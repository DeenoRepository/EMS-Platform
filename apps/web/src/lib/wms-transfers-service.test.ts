import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { generateTransferNumber, isTransfersAdmin } from './wms-transfers-service';

function user(overrides: Partial<JwtUserPayload> = {}): JwtUserPayload {
  return {
    userId: 'u1',
    ldapLogin: 'user',
    displayName: 'User',
    roles: ['engineer'],
    permissions: [],
    ...overrides,
  };
}

describe('isTransfersAdmin', () => {
  test('grants access to platform admins', () => {
    assert.equal(isTransfersAdmin(user({ roles: ['admin'] })), true);
  });

  test('grants access via admin-settings or warehouse-management permissions', () => {
    assert.equal(isTransfersAdmin(user({ permissions: [PERMISSIONS.ADMIN_SETTINGS_MANAGE] })), true);
    assert.equal(isTransfersAdmin(user({ permissions: [PERMISSIONS.WMS_WAREHOUSES_MANAGE] })), true);
  });

  test('denies a regular user without elevated permissions', () => {
    assert.equal(isTransfersAdmin(user()), false);
  });
});

describe('generateTransferNumber', () => {
  test('uses a TR prefix and an 8-digit date for a non-request transfer', () => {
    assert.match(generateTransferNumber(false), /^TR-\d{8}-[A-F0-9]{6}$/);
  });

  test('uses a REQ prefix for a request', () => {
    assert.match(generateTransferNumber(true), /^REQ-\d{8}-[A-F0-9]{6}$/);
  });

  test('generates unique suffixes across calls', () => {
    assert.notEqual(generateTransferNumber(false), generateTransferNumber(false));
  });
});
