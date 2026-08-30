import type { AuditLogItem } from '@/components/eps/history/AuditDiffModal';

export function getHistorySortValue(item: AuditLogItem, field: string): string | number {
  switch (field) {
    case 'createdAt': {
      const timestamp = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      return Number.isNaN(timestamp) ? 0 : timestamp;
    }
    case 'user':
      return item.user?.displayName || item.user?.ldapLogin || '';
    case 'action':
      return item.action || '';
    case 'entityType':
      return item.entityType || '';
    case 'equipment':
      return item.equipment?.name || item.equipment?.inventoryNumber || '';
    default:
      return String((item as unknown as Record<string, unknown>)[field] || '');
  }
}

export function sortHistoryItems<T extends AuditLogItem>(
  items: T[],
  field: string,
  direction: 'asc' | 'desc'
): T[] {
  if (!field) return items;
  return [...items].sort((left, right) => {
    const leftValue = getHistorySortValue(left, field);
    const rightValue = getHistorySortValue(right, field);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
    }

    const leftText = String(leftValue);
    const rightText = String(rightValue);
    return direction === 'asc'
      ? leftText.localeCompare(rightText, 'ru')
      : rightText.localeCompare(leftText, 'ru');
  });
}
