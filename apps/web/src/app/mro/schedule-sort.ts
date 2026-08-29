import type { MaintenanceScheduleRow } from '@/components/mro/MroSchedulesTable';

type SortValue = number | string;

export function compareMaintenanceSchedules(
  first: MaintenanceScheduleRow,
  second: MaintenanceScheduleRow,
  sortField: string,
  sortDirection: 'asc' | 'desc'
): number {
  const firstValue = getSortValue(first, sortField);
  const secondValue = getSortValue(second, sortField);

  if (firstValue < secondValue) return sortDirection === 'asc' ? -1 : 1;
  if (firstValue > secondValue) return sortDirection === 'asc' ? 1 : -1;
  return 0;
}

function getSortValue(schedule: MaintenanceScheduleRow, sortField: string): SortValue {
  if (sortField === 'scheduledDate') return new Date(schedule.scheduledDate).getTime();
  if (sortField === 'equipment') return schedule.equipment?.name || '';
  if (sortField === 'plan') return schedule.plan?.name || '';
  if (sortField === 'status') return schedule.status;
  return '';
}
