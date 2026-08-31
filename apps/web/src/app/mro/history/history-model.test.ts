import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { MaintenanceHistoryItem } from './history-model';
import { buildMaintenanceHistoryView, filterMaintenanceHistory, sortMaintenanceHistory } from './history-model';

function history(id: string, equipment: string, plan: string, executor: string, actualDate: string): MaintenanceHistoryItem {
  return {
    id,
    equipmentId: id,
    planId: 'p',
    scheduledDate: actualDate,
    actualDate,
    status: 'COMPLETED',
    notes: null,
    createdAt: actualDate,
    equipment: { id, name: equipment, inventoryNumber: `INV-${id}`, serialNumber: null, location: null, status: 'ACTIVE' },
    plan: { id: 'p', name: plan, frequency: 'MONTHLY' },
    completedBy: { id: 'u', displayName: executor, ldapLogin: executor.toLowerCase() },
  };
}

const items = [
  history('2', 'Beta Pump', 'Annual', 'Bob', '2026-02-01'),
  history('1', 'Alpha Pump', 'Monthly', 'Alice', '2026-01-01'),
];

describe('maintenance history model', () => {
  test('filters by equipment, inventory, plan, and executor', () => {
    assert.equal(filterMaintenanceHistory(items, 'alpha').length, 1);
    assert.equal(filterMaintenanceHistory(items, 'INV-2').length, 1);
    assert.equal(filterMaintenanceHistory(items, 'monthly').length, 1);
    assert.equal(filterMaintenanceHistory(items, 'bob').length, 1);
    assert.equal(filterMaintenanceHistory(items, ''), items);
  });

  test('sorts by date, equipment, and executor', () => {
    assert.deepEqual(sortMaintenanceHistory(items, 'date', 'asc').map((entry) => entry.id), ['1', '2']);
    assert.deepEqual(sortMaintenanceHistory(items, 'equipment', 'asc').map((entry) => entry.id), ['1', '2']);
    assert.deepEqual(sortMaintenanceHistory(items, 'completedBy', 'desc').map((entry) => entry.id), ['2', '1']);
  });

  test('combines filtering and sorting', () => {
    assert.deepEqual(buildMaintenanceHistoryView(items, 'pump', 'date', 'desc').map((entry) => entry.id), ['2', '1']);
  });
});
