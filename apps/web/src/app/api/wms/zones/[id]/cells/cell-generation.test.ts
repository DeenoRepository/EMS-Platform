import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { normalizeBulkCellEntry, resolveZoneCellAccess, validateSingleCellInput } from './cell-generation';

const zone = { warehouse: { name: 'Main Warehouse', responsibleUserId: 'resp-1' } };

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

describe('zone cell access resolution', () => {
  test('allows platform admins regardless of responsibility', () => {
    const result = resolveZoneCellAccess(user({ roles: ['admin'] }), zone, 'create');
    assert.equal(result.allowed, true);
  });

  test('allows users with admin-settings or warehouse-management permission', () => {
    assert.equal(
      resolveZoneCellAccess(user({ permissions: [PERMISSIONS.ADMIN_SETTINGS_MANAGE] }), zone, 'create').allowed,
      true,
    );
    assert.equal(
      resolveZoneCellAccess(user({ permissions: [PERMISSIONS.WMS_WAREHOUSES_MANAGE] }), zone, 'delete').allowed,
      true,
    );
  });

  test('allows the responsible user with zone or nomenclature management rights', () => {
    const result = resolveZoneCellAccess(
      user({ userId: 'resp-1', permissions: [PERMISSIONS.WMS_ZONES_MANAGE] }),
      zone,
      'create',
    );
    assert.equal(result.allowed, true);
  });

  test('denies a responsible user without the required permission', () => {
    const result = resolveZoneCellAccess(user({ userId: 'resp-1' }), zone, 'create');
    assert.equal(result.allowed, false);
    assert.match(result.forbiddenMessage ?? '', /Создание/);
  });

  test('denies a non-responsible user with matching permission and shows a delete-specific message', () => {
    const result = resolveZoneCellAccess(
      user({ userId: 'other', permissions: [PERMISSIONS.WMS_ZONES_MANAGE] }),
      zone,
      'delete',
    );
    assert.equal(result.allowed, false);
    assert.match(result.forbiddenMessage ?? '', /Удаление/);
    assert.match(result.forbiddenMessage ?? '', /Main Warehouse/);
  });
});

describe('normalizeBulkCellEntry', () => {
  test('normalizes a plain string entry with a trimmed code and no name', () => {
    assert.deepEqual(normalizeBulkCellEntry('  A1  '), { code: 'A1', name: undefined });
  });

  test('normalizes an object entry with code and name', () => {
    assert.deepEqual(normalizeBulkCellEntry({ code: ' B2 ', name: ' Shelf B2 ' }), { code: 'B2', name: 'Shelf B2' });
  });

  test('returns null when the code is missing or empty', () => {
    assert.equal(normalizeBulkCellEntry({ code: '' }), null);
    assert.equal(normalizeBulkCellEntry({}), null);
  });
});

describe('validateSingleCellInput', () => {
  test('normalizes the code to uppercase and trims the name', () => {
    assert.deepEqual(validateSingleCellInput('  a1  ', '  Shelf A1  '), { cleanCode: 'A1', cleanName: 'Shelf A1' });
  });

  test('returns null cleanName when name is not provided', () => {
    assert.deepEqual(validateSingleCellInput('a1', undefined), { cleanCode: 'A1', cleanName: null });
  });

  test('returns null when code is falsy', () => {
    assert.equal(validateSingleCellInput('', 'name'), null);
    assert.equal(validateSingleCellInput(undefined, 'name'), null);
  });
});
