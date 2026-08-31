import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { sortInventories } from './inventory-sort';

const items = [
  { id: 'b', warehouseId: 'w', status: 'DRAFT', date: '', createdAt: '2026-02-01', warehouse: { name: 'Beta', code: 'B' }, createdBy: { displayName: 'Bob' }, _count: { items: 2 } },
  { id: 'a', warehouseId: 'w', status: 'COMPLETED', date: '', createdAt: '2026-01-01', warehouse: { name: 'Alpha', code: 'A' }, createdBy: { displayName: 'Alice' }, _count: { items: 1 } },
];

describe('inventory sort model', () => {
  test('sorts string and numeric fields', () => {
    assert.deepEqual(sortInventories(items, 'warehouse', 'asc').map((item) => item.id), ['a', 'b']);
    assert.deepEqual(sortInventories(items, 'count', 'desc').map((item) => item.id), ['b', 'a']);
  });

  test('preserves input for empty sort field', () => {
    assert.equal(sortInventories(items, '', 'asc'), items);
  });
});
