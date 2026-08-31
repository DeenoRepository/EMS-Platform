import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { filterInventories } from './inventory-filter';

const base = { id: 'abcdef123456', warehouseId: 'w1', status: 'COMPLETED', date: '2026-01-01', createdAt: '2026-01-01', warehouse: { name: 'Main', code: 'MAIN' }, createdBy: { displayName: 'Alice' }, _count: { items: 2 } };

describe('inventory filter model', () => {
  test('filters by warehouse, status, generated code, warehouse, and author', () => {
    const items = [base, { ...base, id: 'other', warehouseId: 'w2', status: 'DRAFT', createdBy: { displayName: 'Bob' } }];
    assert.equal(filterInventories(items, 'w1', '', '').length, 1);
    assert.equal(filterInventories(items, '', 'DRAFT', '').length, 1);
    assert.equal(filterInventories(items, '', '', 'inv-123456').length, 1);
    assert.equal(filterInventories(items, '', '', 'alice').length, 1);
  });

  test('returns all entries when no filters are active', () => {
    assert.equal(filterInventories([base], '', '', '').length, 1);
  });
});
