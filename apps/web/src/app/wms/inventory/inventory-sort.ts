import type { InventoryItemSummary } from './inventory-filter';

type SortValue = number | string;

type SortDirection = 'asc' | 'desc';

function isNumber(value: unknown): value is number {
  return Object.prototype.toString.call(value) === '[object Number]';
}

function getInventorySortValue(inventory: InventoryItemSummary, sortField: string): SortValue {
  switch (sortField) {
    case 'code':
      return inventory.id;
    case 'warehouse':
      return inventory.warehouse.name;
    case 'status':
      return inventory.status;
    case 'count':
      return inventory._count.items;
    case 'date':
      return new Date(inventory.createdAt).getTime();
    case 'author':
      return inventory.createdBy.displayName;
    default: {
      const value = (inventory as unknown as Record<string, unknown>)[sortField] ?? '';
      return isNumber(value) ? value : String(value);
    }
  }
}

function compareInventoryValues(
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

export function sortInventories(
  inventories: InventoryItemSummary[],
  sortField: string,
  sortDirection: SortDirection
): InventoryItemSummary[] {
  if (!sortField) return inventories;

  return [...inventories].sort((first, second) =>
    compareInventoryValues(
      getInventorySortValue(first, sortField),
      getInventorySortValue(second, sortField),
      sortDirection
    )
  );
}
