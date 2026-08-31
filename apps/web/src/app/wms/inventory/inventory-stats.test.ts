import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getInventoryStats } from './inventory-stats';

describe('inventory stats model', () => {
  test('counts total, in-progress, and completed inventories', () => {
    const result = getInventoryStats([
      { status: 'DRAFT' },
      { status: 'IN_PROGRESS' },
      { status: 'COMPLETED' },
      { status: 'CANCELLED' },
    ] as never);
    assert.deepEqual(result, { totalInventories: 4, inProgressCount: 2, completedCount: 1 });
  });

  test('handles an empty list', () => {
    assert.deepEqual(getInventoryStats([]), { totalInventories: 0, inProgressCount: 0, completedCount: 0 });
  });
});
