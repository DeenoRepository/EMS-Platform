import type { InventoryItemSummary } from './inventory-filter';

export interface InventoryStats {
  totalInventories: number;
  inProgressCount: number;
  completedCount: number;
}

export function getInventoryStats(inventories: InventoryItemSummary[]): InventoryStats {
  return {
    totalInventories: inventories.length,
    inProgressCount: inventories.filter(
      (inventory) => inventory.status === 'DRAFT' || inventory.status === 'IN_PROGRESS'
    ).length,
    completedCount: inventories.filter((inventory) => inventory.status === 'COMPLETED').length,
  };
}
