import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { toMroExecutionSchedule } from './schedule-execution-model';
import type { MaintenanceScheduleRow } from '@/components/mro/MroSchedulesTable';

describe('mro execution schedule model', () => {
  test('maps plan checklist items with sortOrder and BOOLEAN item type', () => {
    const schedule: MaintenanceScheduleRow = {
      id: 's1',
      scheduledDate: '2026-01-01',
      status: 'PLANNED',
      notes: 'take care',
      equipment: { id: 'e1', name: 'Pump', inventoryNumber: 'INV-1', location: 'Hall A' },
      plan: {
        id: 'p1',
        name: 'Monthly check',
        checklist: {
          id: 'c1',
          title: 'Checklist A',
          items: [
            { id: 'i1', text: 'Check oil', isRequired: true },
            { id: 'i2', text: 'Check belts', isRequired: false },
          ],
        },
      },
    } as unknown as MaintenanceScheduleRow;

    const result = toMroExecutionSchedule(schedule);
    assert.equal(result.title, 'Monthly check');
    assert.equal(result.equipment.location, 'Hall A');
    assert.deepEqual(result.plan?.checklist?.items, [
      { id: 'i1', description: 'Check oil', itemType: 'BOOLEAN', isRequired: true, sortOrder: 0 },
      { id: 'i2', description: 'Check belts', itemType: 'BOOLEAN', isRequired: false, sortOrder: 1 },
    ]);
  });

  test('falls back to default title when plan is missing and yields null plan/checklist', () => {
    const schedule: MaintenanceScheduleRow = {
      id: 's1',
      scheduledDate: '2026-01-01',
      status: 'PLANNED',
      notes: null,
      equipment: { id: 'e1', name: 'Pump', inventoryNumber: 'INV-1', location: null },
      plan: null,
    } as unknown as MaintenanceScheduleRow;

    const result = toMroExecutionSchedule(schedule);
    assert.equal(result.title, 'Регламентное обслуживание');
    assert.equal(result.plan, null);
  });

  test('yields null checklist when plan has no checklist', () => {
    const schedule: MaintenanceScheduleRow = {
      id: 's1',
      scheduledDate: '2026-01-01',
      status: 'PLANNED',
      notes: null,
      equipment: { id: 'e1', name: 'Pump', inventoryNumber: 'INV-1', location: null },
      plan: { id: 'p1', name: 'Annual', checklist: null },
    } as unknown as MaintenanceScheduleRow;

    const result = toMroExecutionSchedule(schedule);
    assert.equal(result.plan?.checklist, null);
  });
});
