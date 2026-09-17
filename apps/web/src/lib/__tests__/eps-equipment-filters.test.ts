import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEquipmentOrderBy,
  countActiveEquipmentFilters,
  parseEquipmentFilters,
  serializeEquipmentFilters,
} from '../eps-equipment-filters';

describe('EPS equipment filter contract', () => {
  test('round-trips multi-value filters and pagination', () => {
    const filters = parseEquipmentFilters(new URLSearchParams(
      'search=pump&status=ACTIVE,UNDER_REPAIR,ACTIVE&tagId=t1,t2&sortBy=name&sortDirection=asc&page=2&pageSize=50',
    ));
    const serialized = serializeEquipmentFilters(filters);

    assert.deepEqual(filters.statuses, ['ACTIVE', 'UNDER_REPAIR']);
    assert.deepEqual(filters.tagIds, ['t1', 't2']);
    assert.equal(serialized.get('page'), '2');
    assert.equal(serialized.get('sortBy'), 'name');
  });

  test('counts only active filters and whitelists ordering fields', () => {
    const filters = parseEquipmentFilters(new URLSearchParams('status=ACTIVE&tagId=t1&location=shop'));
    assert.equal(countActiveEquipmentFilters(filters), 3);
    assert.deepEqual(buildEquipmentOrderBy(filters), { updatedAt: 'desc' });
  });
});
