export interface ApprovalRegistryItem {
  id: string;
  equipment?: {
    name?: string | null;
    inventoryNumber?: string | null;
    manufacturer?: string | null;
  } | null;
  title: string;
  type: string;
  status: string;
  requester?: { displayName?: string | null } | null;
  reviewer?: { displayName?: string | null } | null;
  createdAt: string;
}

export function getApprovalSortValue(item: ApprovalRegistryItem, field: string): string | number {
  switch (field) {
    case 'title': return item.title || '';
    case 'inventoryNumber': return item.equipment?.inventoryNumber || '';
    case 'equipment': return item.equipment?.name || '';
    case 'manufacturer': return item.equipment?.manufacturer || '';
    case 'type': return item.type || '';
    case 'status': return item.status || '';
    case 'requester': return item.requester?.displayName || '';
    case 'reviewer': return item.reviewer?.displayName || '';
    case 'date': return item.createdAt ? new Date(item.createdAt).getTime() : 0;
    default: return String((item as unknown as Record<string, unknown>)[field] ?? '');
  }
}

export function sortApprovals<T extends ApprovalRegistryItem>(
  items: T[],
  field: string,
  direction: 'asc' | 'desc'
): T[] {
  if (!field) return items;
  return [...items].sort((left, right) => {
    const leftValue = getApprovalSortValue(left, field);
    const rightValue = getApprovalSortValue(right, field);
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
