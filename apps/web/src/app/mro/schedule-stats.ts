import type { MaintenanceScheduleRow } from '@/components/mro/MroSchedulesTable';

export interface MaintenanceScheduleStats {
  total: number;
  overdue: number;
  planned: number;
  completed: number;
}

export function getMaintenanceScheduleStats(
  schedules: MaintenanceScheduleRow[],
  now: Date
): MaintenanceScheduleStats {
  const total = schedules.length;
  const overdue = schedules.filter(
    (schedule) =>
      schedule.status === 'MISSED' ||
      (schedule.status === 'PLANNED' && new Date(schedule.scheduledDate) < now)
  ).length;
  const planned = schedules.filter(
    (schedule) => schedule.status === 'PLANNED' && new Date(schedule.scheduledDate) >= now
  ).length;
  const completed = schedules.filter((schedule) => schedule.status === 'COMPLETED').length;

  return { total, overdue, planned, completed };
}
