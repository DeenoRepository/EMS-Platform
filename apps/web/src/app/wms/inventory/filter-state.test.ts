import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countActiveInventoryFilters } from './filter-state';

describe('inventory filter state', () => {
  test('counts every active filter', () => {
    assert.equal(countActiveInventoryFilters('', '', ''), 0);
    assert.equal(countActiveInventoryFilters('pump', '', ''), 1);
    assert.equal(countActiveInventoryFilters('pump', 'w1', 'DRAFT'), 3);
  });
});
