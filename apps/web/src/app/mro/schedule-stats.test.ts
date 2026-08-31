import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getMaintenanceScheduleStats } from './schedule-stats';
import type { MaintenanceScheduleRow } from '@/components/mro/MroSchedulesTable';

function schedule(status: string, scheduledDate: string): MaintenanceScheduleRow {
  return {
    id: `${status}-${scheduledDate}`,
    scheduledDate,
    status,
    equipment: { id: 'e1', name: 'Pump', inventoryNumber: 'INV-1', location: null },
    plan: { id: 'p1', name: 'Monthly', checklist: null },
    notes: null,
  } as unknown as MaintenanceScheduleRow;
}

describe('maintenance schedule stats', () => {
  const now = new Date('2026-06-01T00:00:00Z');

  test('counts missed schedules and overdue planned schedules as overdue', () => {
    const schedules = [
      schedule('MISSED', '2026-05-01'),
      schedule('PLANNED', '2026-05-01'),
      schedule('PLANNED', '2026-07-01'),
      schedule('COMPLETED', '2026-01-01'),
    ];
    const stats = getMaintenanceScheduleStats(schedules, now);
    assert.deepEqual(stats, { total: 4, overdue: 2, planned: 1, completed: 1 });
  });

  test('returns zeroed stats for an empty list', () => {
    assert.deepEqual(getMaintenanceScheduleStats([], now), { total: 0, overdue: 0, planned: 0, completed: 0 });
  });
});
