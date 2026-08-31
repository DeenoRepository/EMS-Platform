import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countActiveStockFilters } from './filter-state';

describe('stock filter state', () => {
  test('counts every active filter including the boolean low-stock flag', () => {
    assert.equal(countActiveStockFilters('', '', '', '', false), 0);
    assert.equal(countActiveStockFilters('w1', '', '', '', false), 1);
    assert.equal(countActiveStockFilters('w1', 'z1', 'cat', 'pump', true), 5);
  });
});
