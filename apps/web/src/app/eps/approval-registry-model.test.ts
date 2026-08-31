import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApprovalSortValue, sortApprovals } from './approval-registry-model';

const approvals = [
  { id: '2', title: 'Beta', type: 'CHANGE', status: 'PENDING', createdAt: '2026-02-01', equipment: { name: 'B', inventoryNumber: '2', manufacturer: 'M' } },
  { id: '1', title: 'Alpha', type: 'CHANGE', status: 'APPROVED', createdAt: '2026-01-01', equipment: { name: 'A', inventoryNumber: '1', manufacturer: 'M' } },
];

describe('approval registry model', () => {
  test('uses nested equipment fields and date values', () => {
    assert.equal(getApprovalSortValue(approvals[0], 'equipment'), 'B');
    assert.equal(getApprovalSortValue(approvals[0], 'inventoryNumber'), '2');
    assert.equal(typeof getApprovalSortValue(approvals[0], 'date'), 'number');
  });

  test('sorts and preserves original array', () => {
    const sorted = sortApprovals(approvals, 'date', 'asc');
    assert.deepEqual(sorted.map((item) => item.id), ['1', '2']);
    assert.notEqual(sorted, approvals);
    assert.equal(sortApprovals(approvals, '', 'asc'), approvals);
  });
});
