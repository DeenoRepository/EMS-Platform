import { AuditChangeDto } from '@ems/shared';

export interface AuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: AuditChangeDto | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    ldapLogin: string;
    displayName: string;
  } | null;
}

type SortValue = number | string;
type SortDirection = 'asc' | 'desc';

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * Extracts the comparable value for a single audit log field. Mirrors the
 * field-specific fallbacks from the original inline switch (e.g. user shows
 * displayName with ldapLogin fallback) exactly.
 */
function getAuditSortValue(log: AuditItem, sortField: string): SortValue {
  switch (sortField) {
    case 'createdAt':
      return log.createdAt ? new Date(log.createdAt).getTime() : 0;
    case 'user':
      return log.user?.displayName || log.user?.ldapLogin || '';
    case 'action':
      return log.action || '';
    case 'entityType':
      return log.entityType || '';
    case 'entityId':
      return log.entityId || '';
    case 'ipAddress':
      return log.ipAddress || '';
    default: {
      const raw = (log as unknown as Record<string, unknown>)[sortField];
      return isNumber(raw) ? raw : String(raw ?? '');
    }
  }
}

function compareAuditValues(
  firstValue: SortValue,
  secondValue: SortValue,
  sortDirection: SortDirection
): number {
  if (isNumber(firstValue) && isNumber(secondValue)) {
    return sortDirection === 'asc' ? firstValue - secondValue : secondValue - firstValue;
  }
  return sortDirection === 'asc'
    ? String(firstValue).localeCompare(String(secondValue), 'ru')
    : String(secondValue).localeCompare(String(firstValue), 'ru');
}

/**
 * Sorts audit log entries by the given field/direction. Extracted from the
 * page component's inline switch (cyclomatic complexity 22) into a pair of
 * small, independently testable functions.
 */
export function sortAuditLogs(
  logs: AuditItem[],
  sortField: string,
  sortDirection: SortDirection
): AuditItem[] {
  if (!sortField) return logs;
  return [...logs].sort((a, b) =>
    compareAuditValues(
      getAuditSortValue(a, sortField),
      getAuditSortValue(b, sortField),
      sortDirection
    )
  );
}
