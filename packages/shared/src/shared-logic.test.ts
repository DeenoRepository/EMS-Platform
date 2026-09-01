import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVAL_STATUS_MAP,
  EQUIPMENT_STATUS_MAP,
  OPERATION_TYPE_MAP,
  PERMISSIONS,
  STOCK_TRANSFER_STATUS_MAP,
} from './index';
import { formatBytes, formatDate, formatDateTime } from './formatters';
import { PERMISSION_DEFINITIONS } from './permissions';

describe('@ems/shared formatters', () => {
  test('returns an em dash for absent and invalid dates', () => {
    assert.equal(formatDate(null), '—');
    assert.equal(formatDate(undefined), '—');
    assert.equal(formatDate('not-a-date'), '—');
    assert.match(formatDate('2026-01-15T00:00:00.000Z'), /15\.01\.2026/);
  });

  test('formats date-time with date and time components', () => {
    const formatted = formatDateTime('2026-01-15T13:05:00.000Z');
    assert.match(formatted, /15\.01\.2026/);
    assert.match(formatted, /:\s?05/);
  });

  test('formats byte boundaries and clamps negative decimal precision', () => {
    assert.equal(formatBytes(0), '0 Байт');
    assert.equal(formatBytes(1024), '1 КБ');
    assert.equal(formatBytes(1024 * 1024), '1 МБ');
    assert.equal(formatBytes(1536, 0), '2 КБ');
    assert.equal(formatBytes(1536, -1), '2 КБ');
  });
});

describe('@ems/shared permission catalog', () => {
  test('contains a definition for every permission code', () => {
    const codes = Object.values(PERMISSIONS);
    assert.equal(new Set(codes).size, codes.length);
    for (const code of codes) {
      assert.equal(PERMISSION_DEFINITIONS[code].code, code);
      assert.ok(PERMISSION_DEFINITIONS[code].displayName.length > 0);
      assert.ok(PERMISSION_DEFINITIONS[code].description.length > 0);
    }
  });

  test('keeps permission modules aligned with code prefixes', () => {
    for (const definition of Object.values(PERMISSION_DEFINITIONS)) {
      const [prefix] = definition.code.split('.');
      assert.equal(definition.module, prefix);
    }
  });
});

describe('@ems/shared status maps', () => {
  test('maps all persisted equipment and transfer statuses to labels and semantic colors', () => {
    for (const status of ['ACTIVE', 'UNDER_REPAIR', 'DECOMMISSIONED', 'IN_STORAGE', 'INACTIVE', 'DRAFT']) {
      assert.ok(EQUIPMENT_STATUS_MAP[status].label);
      assert.ok(EQUIPMENT_STATUS_MAP[status].color);
    }
    for (const status of ['REQUESTED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED', 'CANCELLED']) {
      assert.ok(STOCK_TRANSFER_STATUS_MAP[status].label);
      assert.ok(STOCK_TRANSFER_STATUS_MAP[status].color);
    }
  });

  test('keeps approval and operation maps free from empty entries', () => {
    for (const map of [APPROVAL_STATUS_MAP, OPERATION_TYPE_MAP]) {
      for (const value of Object.values(map)) {
        assert.ok(value.label.length > 0);
        assert.ok(value.color.length > 0);
      }
    }
  });
});
