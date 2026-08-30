import { prisma } from '@ems/database';
import { logger } from '../logger';
import {
  CRITICAL_SLA_HOURS,
  DEFAULT_SLA_HOURS,
  HIGH_SLA_HOURS,
  INTERNAL_INCIDENT_SEQUENCE_PADDING,
  LOW_SLA_HOURS,
  MILLISECONDS_PER_HOUR,
} from './constants';
import { notifySrmIncident } from './notifications';

export interface CreateServiceRequestInput {
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
}

/**
 * Генерация следующего порядкового ключа инцидента INC-YYYY-XXXX
 */
async function generateInternalIncidentKey(currentYear: number): Promise<string> {
  const latestIssue = await prisma.jiraIssueCache.findFirst({
    where: {
      issueKey: {
        startsWith: `INC-${currentYear}-`,
      },
    },
    orderBy: { createdDate: 'desc' },
  });

  let nextNum = 1;
  if (latestIssue?.issueKey) {
    const parts = latestIssue.issueKey.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
  }
  return `INC-${currentYear}-${String(nextNum).padStart(INTERNAL_INCIDENT_SEQUENCE_PADDING, '0')}`;
}

/**
 * Расчет нормативного дедлайна по SLA согласно приоритету
 */
function calculateSlaDeadline(normPriority: string, baseDate: Date): Date {
  let slaHours = DEFAULT_SLA_HOURS;
  if (normPriority === 'CRITICAL' || normPriority === 'HIGHEST') {
    slaHours = CRITICAL_SLA_HOURS;
  } else if (normPriority === 'HIGH') {
    slaHours = HIGH_SLA_HOURS;
  } else if (normPriority === 'LOW' || normPriority === 'LOWEST') {
    slaHours = LOW_SLA_HOURS;
  }
  return new Date(baseDate.getTime() + slaHours * MILLISECONDS_PER_HOUR);
}

/**
 * Перевод оборудования в статус UNDER_REPAIR при критических инцидентах
 */
async function setEquipmentUnderRepair(equipmentId: string): Promise<void> {
  try {
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { status: 'UNDER_REPAIR' },
    });
  } catch (error) {
    logger.warn('Не удалось обновить статус оборудования в EPS', { equipmentId, error });
  }
}

/**
 * Отправка оповещения ответственным лицам по созданному инциденту
 */
async function dispatchIncidentNotification(
  issueKey: string,
  normPriority: string,
  data: CreateServiceRequestInput,
  now: Date
): Promise<void> {
  try {
    let eqName: string | undefined;
    if (data.equipmentId) {
      const eq = await prisma.equipment.findUnique({
        where: { id: data.equipmentId },
        select: { name: true },
      });
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
  } catch (error) {
    logger.warn('Ошибка при отправке оповещения SRM', { issueKey, error });
  }
}

/** Stable public result shape; kept separate from generated Prisma payload types. */
export interface InternalServiceRequestResult {
  id: string;
  issueKey: string;
  summary: string;
  description: string | null;
  status: string;
  priority: string;
  issueType: string;
  source: string;
  failureCategory: string | null;
  slaDeadline: Date | null;
  slaBreached: boolean | null;
  warrantyClaim: boolean | null;
  contractorName: string | null;
  equipmentId: string | null;
  reporter: string | null;
  createdById: string | null;
  assignee: string | null;
  createdDate: Date;
  resolvedDate: Date | null;
  rawData: unknown;
  syncedAt: Date;
}

export interface MroWorkOrderResult {
  schedule: {
    id: string;
    equipmentId: string;
    title: string;
    scheduledDate: Date;
    status: string;
    notes: string | null;
    jiraIssueKey: string | null;
  };
  issue: InternalServiceRequestResult;
}

export async function createInternalServiceRequest(data: CreateServiceRequestInput): Promise<InternalServiceRequestResult> {
  const currentYear = new Date().getFullYear();
  const issueKey = await generateInternalIncidentKey(currentYear);

  const now = new Date();
  const normPriority = (data.priority || 'MEDIUM').toUpperCase();
  const slaDeadline = calculateSlaDeadline(normPriority, now);

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

  if (data.equipmentId && (normPriority === 'CRITICAL' || normPriority === 'HIGH')) {
    await setEquipmentUnderRepair(data.equipmentId);
  }

  await dispatchIncidentNotification(issueKey, normPriority, data, now);

  return issue;
}

/**
 * Создание аварийного заказ-наряда MRO на основе инцидента SRM
 */
export async function createMroWorkOrderFromIssue(issueId: string, _userId?: string): Promise<MroWorkOrderResult> {
  const issue = await prisma.jiraIssueCache.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    throw new Error('Инцидент не найден');
  }

  if (!issue.equipmentId) {
    throw new Error('Невозможно создать заказ-наряд ТОиР: к заявке не привязано оборудование');
  }

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

  const updatedIssue = await prisma.jiraIssueCache.update({
    where: { id: issueId },
    data: {
      status: 'IN_PROGRESS',
      mroScheduleId: schedule.id,
    },
  });

  await prisma.equipment.update({
    where: { id: issue.equipmentId },
    data: { status: 'UNDER_REPAIR' },
  });

  return { schedule, issue: updatedIssue };
}
