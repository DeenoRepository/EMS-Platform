import { prisma } from '@ems/database';
import {
  CRITICAL_SLA_HOURS,
  DEFAULT_SLA_HOURS,
  HIGH_SLA_HOURS,
  INTERNAL_INCIDENT_SEQUENCE_PADDING,
  LOW_SLA_HOURS,
  MILLISECONDS_PER_HOUR,
} from './constants';
import { notifySrmIncident } from './notifications';
import type { JiraIssueData } from './field-mapping';

export async function createInternalServiceRequest(data: {
  summary: string;
  description?: string;
  priority: string;
  issueType?: string;
  failureCategory?: string;
  equipmentId?: string;
  reporter?: string;
  createdById?: string;
  assignee?: string;
  warrantyClaim?: boolean;
  contractorName?: string;
}): Promise<any> {
  const currentYear = new Date().getFullYear();
  
  // Генерация уникального номера заявки: INC-YYYY-XXXX
  const latestIssue = await prisma.jiraIssueCache.findFirst({
    where: {
      issueKey: {
        startsWith: `INC-${currentYear}-`,
      },
    },
    orderBy: { createdDate: 'desc' },
  });

  let nextNum = 1;
  if (latestIssue && latestIssue.issueKey) {
    const parts = latestIssue.issueKey.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
  }
  const issueKey = `INC-${currentYear}-${String(nextNum).padStart(INTERNAL_INCIDENT_SEQUENCE_PADDING, '0')}`;

  // Расчет нормативного дедлайна по SLA
  const now = new Date();
  let slaHours = DEFAULT_SLA_HOURS; // по умолчанию 24ч (Medium)
  const normPriority = (data.priority || 'MEDIUM').toUpperCase();
  if (normPriority === 'CRITICAL' || normPriority === 'HIGHEST') slaHours = CRITICAL_SLA_HOURS;
  else if (normPriority === 'HIGH') slaHours = HIGH_SLA_HOURS;
  else if (normPriority === 'LOW' || normPriority === 'LOWEST') slaHours = LOW_SLA_HOURS;

  const slaDeadline = new Date(now.getTime() + slaHours * MILLISECONDS_PER_HOUR);

  // Создаем запись инцидента
  const issue = await prisma.jiraIssueCache.create({
    data: {
      issueKey,
      summary: data.summary,
      description: data.description || null,
      status: 'OPEN',
      priority: normPriority,
      issueType: data.issueType || 'INCIDENT',
      source: 'INTERNAL',
      failureCategory: data.failureCategory || 'OTHER',
      slaDeadline,
      slaBreached: false,
      warrantyClaim: Boolean(data.warrantyClaim),
      contractorName: data.contractorName || null,
      equipmentId: data.equipmentId || null,
      reporter: data.reporter || 'Оператор EMS',
      createdById: data.createdById || null,
      assignee: data.assignee || null,
      createdDate: now,
      rawData: {
        submittedVia: 'EMS Web UI',
        userNotes: data.description || '',
      },
    },
  });

  // Если инцидент критический и указано оборудование - переводим оборудование в статус UNDER_REPAIR в EPS
  if (data.equipmentId && (normPriority === 'CRITICAL' || normPriority === 'HIGH')) {
    try {
      await prisma.equipment.update({
        where: { id: data.equipmentId },
        data: { status: 'UNDER_REPAIR' },
      });
    } catch (e) {
      console.warn('Не удалось обновить статус оборудования в EPS:', e);
    }
  }

  // Отправляем уведомление ответственным лицам
  try {
    let eqName: string | undefined;
    if (data.equipmentId) {
      const eq = await prisma.equipment.findUnique({ where: { id: data.equipmentId }, select: { name: true } });
      eqName = eq?.name;
    }
    await notifySrmIncident(
      {
        issueKey,
        summary: data.summary,
        status: 'OPEN',
        priority: normPriority,
        issueType: data.issueType || 'INCIDENT',
        assignee: data.assignee || null,
        reporter: data.reporter || null,
        createdDate: now,
        resolvedDate: null,
        rawData: {},
      },
      eqName
    );
  } catch (e) {
    console.warn('Ошибка при отправке оповещения SRM:', e);
  }

  return issue;
}

/**
 * Создание аварийного заказ-наряда MRO на основе инцидента SRM
 */
export async function createMroWorkOrderFromIssue(issueId: string, userId?: string): Promise<any> {
  const issue = await prisma.jiraIssueCache.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    throw new Error('Инцидент не найден');
  }

  if (!issue.equipmentId) {
    throw new Error('Невозможно создать заказ-наряд ТОиР: к заявке не привязано оборудование');
  }

  // Создаем заказ-наряд в MRO
  const schedule = await prisma.maintenanceSchedule.create({
    data: {
      equipmentId: issue.equipmentId,
      title: `Аварийный ремонт по заявке ${issue.issueKey}: ${issue.summary}`,
      scheduledDate: new Date(),
      status: 'IN_PROGRESS',
      notes: `Создано автоматически из модуля SRM (ServiceDesk). Приоритет: ${issue.priority}. Категория отказа: ${issue.failureCategory || 'Не указана'}. ${issue.description ? `\nОписание: ${issue.description}` : ''}`,
      jiraIssueKey: issue.issueKey,
    },
  });

  // Обновляем заявку SRM: статус IN_PROGRESS, связь с нарядом MRO
  const updatedIssue = await prisma.jiraIssueCache.update({
    where: { id: issueId },
    data: {
      status: 'IN_PROGRESS',
      mroScheduleId: schedule.id,
    },
  });

  // Убеждаемся, что оборудование имеет статус UNDER_REPAIR
  await prisma.equipment.update({
    where: { id: issue.equipmentId },
    data: { status: 'UNDER_REPAIR' },
  });

  return { schedule, issue: updatedIssue };
}
