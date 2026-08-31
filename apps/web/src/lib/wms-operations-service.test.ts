import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { OperationType } from '@ems/database';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { buildOperationsWhereInput, isOperationsAdmin } from './wms-operations-service';

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

describe('isOperationsAdmin', () => {
  test('grants access to platform admins and elevated permissions', () => {
    assert.equal(isOperationsAdmin(user({ roles: ['admin'] })), true);
    assert.equal(isOperationsAdmin(user({ permissions: [PERMISSIONS.ADMIN_SETTINGS_MANAGE] })), true);
    assert.equal(isOperationsAdmin(user({ permissions: [PERMISSIONS.WMS_WAREHOUSES_MANAGE] })), true);
  });

  test('denies a regular user', () => {
    assert.equal(isOperationsAdmin(user()), false);
  });
});

describe('buildOperationsWhereInput', () => {
  test('returns an empty filter when no parameters are given', () => {
    assert.deepEqual(buildOperationsWhereInput({}), {});
  });

  test('filters by warehouseId when provided', () => {
    assert.deepEqual(buildOperationsWhereInput({ warehouseId: 'w1' }), { warehouseId: 'w1' });
  });

  test('filters by a valid OperationType and ignores an invalid one', () => {
    assert.deepEqual(buildOperationsWhereInput({ type: OperationType.RECEIPT }), { type: OperationType.RECEIPT });
    assert.deepEqual(buildOperationsWhereInput({ type: 'NOT_REAL' as OperationType }), {});
  });

  test('combines warehouseId and type filters', () => {
    assert.deepEqual(buildOperationsWhereInput({ warehouseId: 'w1', type: OperationType.RECEIPT }), {
      warehouseId: 'w1',
      type: OperationType.RECEIPT,
    });
  });
});
