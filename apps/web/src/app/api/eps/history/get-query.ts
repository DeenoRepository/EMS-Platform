import { AuditAction, Prisma } from '@ems/database';

type AuditHistoryQuery = {
  page: number;
  pageSize: number;
  action: string;
  equipmentId: string;
  userId: string;
  search: string;
  startDate: string;
  endDate: string;
};

type AuditHistoryLog = {
  entityType: string;
  entityId: string;
  changes: unknown;
};

type EquipmentSummary = {
  id: string;
  name: string;
  inventoryNumber: string | null;
};

export const EPS_ENTITY_TYPES: string[] = [
  'Equipment',
  'EquipmentDocument',
  'EquipmentApproval',
  'Photo',
  'CustomField',
  'EquipmentCustomSection',
];

export function parseAuditHistoryQuery(searchParams: URLSearchParams): AuditHistoryQuery {
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)),
    pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10))),
    action: searchParams.get('action')?.trim() || '',
    equipmentId: searchParams.get('equipmentId')?.trim() || '',
    userId: searchParams.get('userId')?.trim() || '',
    search: searchParams.get('search')?.trim() || '',
    startDate: searchParams.get('startDate')?.trim() || '',
    endDate: searchParams.get('endDate')?.trim() || '',
  };
}

export function buildAuditHistoryWhereInput(
  query: Pick<AuditHistoryQuery, 'action' | 'equipmentId' | 'userId' | 'search' | 'startDate' | 'endDate'>,
): { where: Prisma.AuditLogWhereInput; entityTypes: string[] } {
  const { action, equipmentId, userId, search, startDate, endDate } = query;
  const where: Prisma.AuditLogWhereInput = {
    entityType: { in: [...EPS_ENTITY_TYPES] },
  };

  if (action && action in AuditAction) where.action = action as AuditAction;
  if (userId) where.userId = userId;
  if (equipmentId) where.entityId = equipmentId;
  if (search) {
    where.OR = [
      { user: { displayName: { contains: search, mode: 'insensitive' } } },
      { user: { ldapLogin: { contains: search, mode: 'insensitive' } } },
      { entityId: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  return { where, entityTypes: EPS_ENTITY_TYPES };
}

function getChanges(log: AuditHistoryLog): Record<string, unknown> {
  return (log.changes as Record<string, unknown> | null) || {};
}

function getChangeValue(changes: Record<string, unknown>, key: string): unknown {
  const value = changes[key];
  if (value && typeof value === 'object' && 'new' in value) {
    return (value as { new?: unknown }).new;
  }
  return value;
}

export function enrichAuditLogs<T extends AuditHistoryLog>(
  logs: T[],
  equipments: EquipmentSummary[],
): Array<T & { equipment: EquipmentSummary | null }> {
  const equipmentMap = new Map(equipments.map((equipment) => [equipment.id, equipment]));

  return logs.map((log) => {
    const changes = getChanges(log);
    const equipmentId = log.entityType === 'Equipment'
      ? log.entityId
      : typeof changes.equipmentId === 'string' ? changes.equipmentId : null;
    if (!equipmentId) return { ...log, equipment: null };

    const fallback = {
      id: equipmentId,
      name: String(log.entityType === 'Equipment'
        ? getChangeValue(changes, 'name') || 'Оборудование'
        : changes.equipmentName || 'Оборудование'),
      inventoryNumber: log.entityType === 'Equipment'
        ? (getChangeValue(changes, 'inventoryNumber') as string | null) || null
        : null,
    };

    return { ...log, equipment: equipmentMap.get(equipmentId) || fallback };
  });
}

type AuditActionInput = { action: string };

export function buildAuditHistoryStats(logs: AuditActionInput[]) {
  return {
    total: logs.length,
    creates: logs.filter((log) => log.action === 'CREATE').length,
    updates: logs.filter((log) => log.action === 'UPDATE').length,
    deletes: logs.filter((log) => log.action === 'DELETE').length,
  };
}
