import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { sortSrmIssues, type SrmSortableIssue } from './srm-issue-sorting';

function issue(overrides: Partial<SrmSortableIssue>): SrmSortableIssue {
  return {
    key: 'ISS-1',
    title: 'Broken pump',
    status: 'OPEN',
    priority: 'HIGH',
    failureCategory: null,
    source: 'INTERNAL',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

describe('SRM issue sorting', () => {
  test('sorts by createdAt date value, does not mutate the source array', () => {
    const issues = [issue({ key: 'B', createdAt: '2026-02-01' }), issue({ key: 'A', createdAt: '2026-01-01' })];
    const sorted = sortSrmIssues(issues, 'createdAt', 'asc');
    assert.deepEqual(sorted.map((i) => i.key), ['A', 'B']);
    assert.deepEqual(issues.map((i) => i.key), ['B', 'A']);
  });

  test('sorts by nested equipment and reportedBy names with empty fallback', () => {
    const withEquipment = issue({ key: 'A', equipment: { name: 'Alpha' } });
    const withoutEquipment = issue({ key: 'B', equipment: null });
    assert.deepEqual(sortSrmIssues([withoutEquipment, withEquipment], 'equipment', 'asc').map((i) => i.key), ['B', 'A']);

    const withReporter = issue({ key: 'A', reportedBy: { displayName: 'Alice' } });
    const withoutReporter = issue({ key: 'B', reportedBy: null });
    assert.deepEqual(sortSrmIssues([withoutReporter, withReporter], 'reportedBy', 'asc').map((i) => i.key), ['B', 'A']);
  });

  test('sorts by an arbitrary direct field and supports descending order', () => {
    const high = issue({ key: 'A', priority: 'HIGH' });
    const low = issue({ key: 'B', priority: 'LOW' });
    assert.deepEqual(sortSrmIssues([low, high], 'priority', 'desc').map((i) => i.key), ['B', 'A']);
  });
});
