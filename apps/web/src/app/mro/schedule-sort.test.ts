import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compareMaintenanceSchedules } from './schedule-sort';
import type { MaintenanceScheduleRow } from '@/components/mro/MroSchedulesTable';

function schedule(overrides: Partial<MaintenanceScheduleRow>): MaintenanceScheduleRow {
  return {
    id: 'id',
    scheduledDate: '2026-01-01',
    status: 'PLANNED',
    equipment: { id: 'e1', name: 'Alpha', inventoryNumber: 'INV-1', serialNumber: null, location: null, status: 'ACTIVE' },
    plan: { id: 'p1', name: 'Monthly', frequency: 'MONTHLY', checklist: null },
    notes: null,
    ...overrides,
  } as MaintenanceScheduleRow;
}

describe('maintenance schedule comparator', () => {
  test('sorts by scheduled date ascending and descending', () => {
    const early = schedule({ scheduledDate: '2026-01-01' });
    const late = schedule({ scheduledDate: '2026-02-01' });
    assert.equal(compareMaintenanceSchedules(early, late, 'scheduledDate', 'asc'), -1);
    assert.equal(compareMaintenanceSchedules(early, late, 'scheduledDate', 'desc'), 1);
  });

  test('sorts by equipment name and plan name with empty fallback', () => {
    const a = schedule({ equipment: { id: 'e1', name: 'Alpha', inventoryNumber: 'INV-1', serialNumber: null, location: null, status: 'ACTIVE' } });
    const b = schedule({ equipment: { id: 'e2', name: 'Beta', inventoryNumber: 'INV-2', serialNumber: null, location: null, status: 'ACTIVE' } });
    assert.equal(compareMaintenanceSchedules(a, b, 'equipment', 'asc'), -1);

    const withoutPlan = schedule({ plan: null });
    const withPlan = schedule({ plan: { id: 'p1', name: 'Monthly', frequency: 'MONTHLY', checklist: null } });
    assert.equal(compareMaintenanceSchedules(withoutPlan, withPlan, 'plan', 'asc'), -1);
  });

  test('sorts by status and returns 0 for unknown fields', () => {
    const missed = schedule({ status: 'MISSED' });
    const planned = schedule({ status: 'PLANNED' });
    assert.equal(compareMaintenanceSchedules(missed, planned, 'status', 'asc'), -1);
    assert.equal(compareMaintenanceSchedules(missed, planned, 'unknown-field', 'asc'), 0);
  });
});
