export interface MaintenanceHistoryItem {
  id: string;
  equipmentId: string;
  planId: string | null;
  scheduledDate: string;
  actualDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    serialNumber: string | null;
    location: string | null;
    status: string;
  };
  plan?: {
    id: string;
    name: string;
    frequency: string;
    checklist?: {
      id: string;
      title: string;
      items: Array<{ id: string; text: string; isRequired: boolean }>;
    } | null;
  } | null;
  completedBy?: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
}

type SortDirection = 'asc' | 'desc';

/**
 * Filters completed maintenance history records by a free-text search query
 * matching equipment name/inventory number, plan name or the executor's
 * display name. Mirrors the original inline `.filter()` predicate exactly.
 */
export function filterMaintenanceHistory(
  items: MaintenanceHistoryItem[],
  search: string
): MaintenanceHistoryItem[] {
  if (!search) return items;
  const query = search.toLowerCase();
  return items.filter((sch) => {
    const eqName = sch.equipment?.name?.toLowerCase() || '';
    const eqInv = sch.equipment?.inventoryNumber?.toLowerCase() || '';
    const planName = sch.plan?.name?.toLowerCase() || '';
    const executor = sch.completedBy?.displayName?.toLowerCase() || '';
    return eqName.includes(query) || eqInv.includes(query) || planName.includes(query) || executor.includes(query);
  });
}

function getHistorySortValue(item: MaintenanceHistoryItem, sortField: string): string {
  if (sortField === 'equipment') return item.equipment?.name || '';
  if (sortField === 'completedBy') return item.completedBy?.displayName || '';
  return item.actualDate || item.scheduledDate || '';
}

/**
 * Sorts completed maintenance history records by date (default), equipment
 * name or executor name. Extracted from the page's inline `.sort()` to
 * decouple value extraction from comparison, matching compareInventoryValues
 * conventions used elsewhere in WMS/MRO pages.
 */
export function sortMaintenanceHistory(
  items: MaintenanceHistoryItem[],
  sortField: string,
  sortDirection: SortDirection
): MaintenanceHistoryItem[] {
  return [...items].sort((a, b) => {
    const valA = getHistorySortValue(a, sortField);
    const valB = getHistorySortValue(b, sortField);
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Combines filtering and sorting for the maintenance history list view.
 */
export function buildMaintenanceHistoryView(
  items: MaintenanceHistoryItem[],
  search: string,
  sortField: string,
  sortDirection: SortDirection
): MaintenanceHistoryItem[] {
  return sortMaintenanceHistory(filterMaintenanceHistory(items, search), sortField, sortDirection);
}
