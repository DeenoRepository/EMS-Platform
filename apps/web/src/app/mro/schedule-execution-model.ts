import type { MroExecutionWizardDialogProps } from '@/components/mro/MroExecutionWizardDialog';
import type { MaintenanceScheduleRow } from '@/components/mro/MroSchedulesTable';

export type MroExecutionSchedule = NonNullable<MroExecutionWizardDialogProps['schedule']>;

export function toMroExecutionSchedule(schedule: MaintenanceScheduleRow): MroExecutionSchedule {
  return {
    id: schedule.id,
    title: schedule.plan?.name || 'Регламентное обслуживание',
    scheduledDate: schedule.scheduledDate,
    notes: schedule.notes,
    equipment: {
      id: schedule.equipment.id,
      name: schedule.equipment.name,
      inventoryNumber: schedule.equipment.inventoryNumber,
      location: schedule.equipment.location,
    },
    plan: schedule.plan
      ? {
          id: schedule.plan.id,
          name: schedule.plan.name,
          checklist: schedule.plan.checklist
            ? {
                id: schedule.plan.checklist.id,
                name: schedule.plan.checklist.title,
                items: schedule.plan.checklist.items.map((item, index) => ({
                  id: item.id,
                  description: item.text,
                  itemType: 'BOOLEAN',
                  isRequired: item.isRequired,
                  sortOrder: index,
                })),
              }
            : null,
        }
      : null,
  };
}
