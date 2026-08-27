import { prisma } from '@ems/database';
import {
  DEFAULT_ADVANCED_MTBF_DAYS,
  DEFAULT_ADVANCED_MTTR_HOURS,
  DEFAULT_MTBF_DAYS,
  MAX_AVAILABILITY_PERCENT,
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_HOUR,
  MIN_AVAILABILITY_PERCENT,
  ROUNDING_PRECISION,
  SLA_TARGET_HOURS,
} from './constants';

export async function calculateSrmMetrics(equipmentId?: string): Promise<{
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  mttrHours: number;
  mtbfDays: number;
  slaComplianceRate: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
}> {
  const where: any = {};
  if (equipmentId) {
    where.equipmentId = equipmentId;
  }

  const issues = await prisma.jiraIssueCache.findMany({
    where,
    orderBy: { createdDate: 'asc' },
  });

  const totalIssues = issues.length;
  let openIssues = 0;
  let inProgressIssues = 0;
  let resolvedIssues = 0;

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  let totalResolutionTimeHours = 0;
  let resolvedCount = 0;
  let slaMetCount = 0;
  for (const issue of issues) {
    statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
    priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;

    const lowerStatus = issue.status.toLowerCase();
    if (
      lowerStatus.includes('closed') ||
      lowerStatus.includes('resolved') ||
      lowerStatus.includes('done') ||
      lowerStatus.includes('решен') ||
      lowerStatus.includes('готов') ||
      lowerStatus.includes('закрыт')
    ) {
      resolvedIssues++;
      if (issue.resolvedDate) {
        const diffMs = issue.resolvedDate.getTime() - issue.createdDate.getTime();
        const diffHours = Math.max(0, diffMs / MILLISECONDS_PER_HOUR);
        totalResolutionTimeHours += diffHours;
        resolvedCount++;

        if (diffHours <= SLA_TARGET_HOURS) {
          slaMetCount++;
        }
      }
    } else if (
      lowerStatus.includes('progress') ||
      lowerStatus.includes('in work') ||
      lowerStatus.includes('review') ||
      lowerStatus.includes('процесс') ||
      lowerStatus.includes('работе')
    ) {
      inProgressIssues++;
    } else {
      openIssues++;
    }
  }

  const mttrHours = resolvedCount > 0
    ? Math.round((totalResolutionTimeHours / resolvedCount) * ROUNDING_PRECISION) / ROUNDING_PRECISION
    : 0;
  const slaComplianceRate = resolvedCount > 0 ? Math.round((slaMetCount / resolvedCount) * 100) : 100;

  let mtbfDays = 0;
  if (issues.length > 1) {
    const firstDate = issues[0].createdDate.getTime();
    const lastDate = issues[issues.length - 1].createdDate.getTime();
    const spanDays = Math.max(1, (lastDate - firstDate) / MILLISECONDS_PER_DAY);
    mtbfDays = Math.round((spanDays / issues.length) * ROUNDING_PRECISION) / ROUNDING_PRECISION;
  } else {
    mtbfDays = DEFAULT_MTBF_DAYS;
  }

  return {
    totalIssues,
    openIssues,
    inProgressIssues,
    resolvedIssues,
    mttrHours,
    mtbfDays,
    slaComplianceRate,
    statusCounts,
    priorityCounts,
  };
}

export const calculateSrmStats = calculateSrmMetrics;
export async function calculateAdvancedRamsMetrics(equipmentId?: string) {
  const where: any = {};
  if (equipmentId) {
    where.equipmentId = equipmentId;
  }

  const issues = await prisma.jiraIssueCache.findMany({
    where,
    orderBy: { createdDate: 'asc' },
  });

  const totalIncidents = issues.length;
  let resolvedCount = 0;
  let totalDowntimeHours = 0;
  let totalRepairTimeHours = 0;
  let slaMetCount = 0;

  const failureCategoryCounts: Record<string, number> = {
    MECHANICAL: 0,
    ELECTRICAL: 0,
    HYDRAULIC: 0,
    SOFTWARE: 0,
    OPERATOR_ERROR: 0,
    WEAR: 0,
    OTHER: 0,
  };

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const equipmentBreakdown: Record<string, { name: string; count: number; downtimeHours: number }> = {};

  const eqIds = issues.map((i) => i.equipmentId).filter(Boolean) as string[];
  const equipments = await prisma.equipment.findMany({
    where: { id: { in: eqIds } },
    select: { id: true, name: true, inventoryNumber: true },
  });
  const eqMap = new Map(equipments.map((e) => [e.id, e]));

  for (const issue of issues) {
    // Статусы
    statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
    priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;
    sourceCounts[issue.source || 'JIRA'] = (sourceCounts[issue.source || 'JIRA'] || 0) + 1;

    // Категория отказа
    const cat = issue.failureCategory || 'OTHER';
    failureCategoryCounts[cat] = (failureCategoryCounts[cat] || 0) + 1;

    // Оборудование
    if (issue.equipmentId) {
      const eq = eqMap.get(issue.equipmentId);
      const eqName = eq ? `[${eq.inventoryNumber || '—'}] ${eq.name}` : 'Неизвестное оборудование';
      if (!equipmentBreakdown[issue.equipmentId]) {
        equipmentBreakdown[issue.equipmentId] = { name: eqName, count: 0, downtimeHours: 0 };
      }
      equipmentBreakdown[issue.equipmentId].count += 1;
    }

    // Расчет времени восстановления и простоя
    const isResolved = ['CLOSED', 'RESOLVED', 'DONE', 'РЕШЕН', 'ГОТОВ', 'ЗАКРЫТ'].some((s) =>
      issue.status.toUpperCase().includes(s)
    );

    if (isResolved && issue.resolvedDate) {
      resolvedCount++;
      const durationHours = Math.max(0, (issue.resolvedDate.getTime() - issue.createdDate.getTime()) / MILLISECONDS_PER_HOUR);
      totalRepairTimeHours += durationHours;

      const downtime = issue.downtimeMinutes ? issue.downtimeMinutes / 60 : durationHours;
      totalDowntimeHours += downtime;

      if (issue.equipmentId && equipmentBreakdown[issue.equipmentId]) {
        equipmentBreakdown[issue.equipmentId].downtimeHours += downtime;
      }

      // Проверка SLA
      if (issue.slaDeadline) {
        if (issue.resolvedDate <= issue.slaDeadline) slaMetCount++;
      } else {
        if (durationHours <= SLA_TARGET_HOURS) slaMetCount++;
      }
    }
  }

  // MTTR (Mean Time To Repair) в часах
  const mttrHours = resolvedCount > 0
    ? Math.round((totalRepairTimeHours / resolvedCount) * ROUNDING_PRECISION) / ROUNDING_PRECISION
    : DEFAULT_ADVANCED_MTTR_HOURS;

  // MTBF (Mean Time Between Failures) в днях
  let mtbfDays = DEFAULT_ADVANCED_MTBF_DAYS;
  if (issues.length > 1) {
    const firstTime = issues[0].createdDate.getTime();
    const lastTime = issues[issues.length - 1].createdDate.getTime();
    const totalDays = Math.max(1, (lastTime - firstTime) / MILLISECONDS_PER_DAY);
    mtbfDays = Math.round((totalDays / issues.length) * ROUNDING_PRECISION) / ROUNDING_PRECISION;
  }

  // КТГ (Коэффициент технической готовности / Availability %)
  // КТГ = MTBF / (MTBF + MTTR_in_days) * 100%
  const mttrDays = mttrHours / 24;
  const availabilityPercent = Math.min(
    MAX_AVAILABILITY_PERCENT,
    Math.max(
      MIN_AVAILABILITY_PERCENT,
      Math.round((mtbfDays / (mtbfDays + mttrDays)) * ROUNDING_PRECISION * 100) / ROUNDING_PRECISION
    )
  );

  // Соблюдение SLA %
  const slaComplianceRate = resolvedCount > 0 ? Math.round((slaMetCount / resolvedCount) * 100) : 96;

  // Парето-анализ: Сортировка категорий отказов по частоте и накопленный процент
  const sortedCategories = Object.entries(failureCategoryCounts)
    .map(([cat, count]) => ({ category: cat, count }))
    .sort((a, b) => b.count - a.count);

  let cumulativeCount = 0;
  const paretoAnalysis = sortedCategories.map((item) => {
    cumulativeCount += item.count;
    const cumulativePercent = totalIncidents > 0 ? Math.round((cumulativeCount / totalIncidents) * 100) : 0;
    return {
      category: item.category,
      count: item.count,
      cumulativePercent,
    };
  });

  // ТОП-10 проблемного оборудования
  const topEquipment = Object.values(equipmentBreakdown)
    .sort((a, b) => b.count - a.count || b.downtimeHours - a.downtimeHours)
    .slice(0, 10);

  // Гарантийные заявки
  const warrantyIncidentsCount = issues.filter((i) => i.warrantyClaim).length;

  return {
    totalIncidents,
    resolvedCount,
    openCount: totalIncidents - resolvedCount,
    mttrHours,
    mtbfDays,
    availabilityPercent,
    slaComplianceRate,
    totalDowntimeHours: Math.round(totalDowntimeHours * ROUNDING_PRECISION) / ROUNDING_PRECISION,
    failureCategoryCounts,
    statusCounts,
    priorityCounts,
    sourceCounts,
    paretoAnalysis,
    topEquipment,
    warrantyIncidentsCount,
  };
}
