import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countActiveOperationFilters } from './filter-state';

describe('operation filter state', () => {
  test('counts each non-empty filter exactly once', () => {
    assert.equal(countActiveOperationFilters('', '', ''), 0);
    assert.equal(countActiveOperationFilters('ISSUE', '', ''), 1);
    assert.equal(countActiveOperationFilters('ISSUE', 'w1', 'pump'), 3);
  });
});
