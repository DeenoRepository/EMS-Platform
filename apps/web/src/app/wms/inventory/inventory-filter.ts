export interface InventoryItemSummary {
  id: string;
  warehouseId: string;
  status: string;
  date: string;
  comment?: string | null;
  closedAt?: string | null;
  createdAt: string;
  warehouse: { name: string; code: string };
  createdBy: { displayName: string };
  _count: { items: number };
}

export function filterInventories(
  inventories: InventoryItemSummary[],
  selectedWarehouse: string,
  selectedStatus: string,
  search: string
): InventoryItemSummary[] {
  return inventories.filter((inv) => {
    if (selectedWarehouse && inv.warehouseId !== selectedWarehouse) return false;
    if (selectedStatus && inv.status !== selectedStatus) return false;
    if (search) {
      const query = search.toLowerCase();
      const codeMatch = `INV-${inv.id.slice(-6)}`.toLowerCase().includes(query);
      const warehouseMatch =
        inv.warehouse.name.toLowerCase().includes(query) ||
        inv.warehouse.code.toLowerCase().includes(query);
      const authorMatch = inv.createdBy.displayName.toLowerCase().includes(query);
      if (!codeMatch && !warehouseMatch && !authorMatch) return false;
    }
    return true;
  });
}
