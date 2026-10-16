export interface LowStockItem {
  id: string;
  name: string;
  warehouseName: string;
  warehouseCode: string;
  quantity: number;
  inTransitQuantity?: number;
  effectiveQuantity?: number;
  minStock: number;
  unit: string;
}

export interface RecentStockOperationItem {
  id: string;
  nomenclature: { name: string; unit: string };
  quantity: number;
  equipment?: { name: string; inventoryNumber: string } | null;
}

export interface RecentStockOperation {
  id: string;
  type: string;
  date: string;
  warehouse: { name: string; code: string };
  createdBy: { displayName: string };
  items: RecentStockOperationItem[];
}

export interface WmsDashboardStats {
  warehousesCount: number;
  nomenclatureCount: number;
  stockItemsCount: number;
  lowStockCount: number;
  lowStockItems: LowStockItem[];
  activeInventoriesCount: number;
  inTransitTransfersCount?: number;
  recentOperations: RecentStockOperation[];
  userWarehouseIds?: string[];
}

export const DEFAULT_WMS_STATS: WmsDashboardStats = {
  warehousesCount: 0,
  nomenclatureCount: 0,
  stockItemsCount: 0,
  lowStockCount: 0,
  lowStockItems: [],
  activeInventoriesCount: 0,
  inTransitTransfersCount: 0,
  recentOperations: [],
};
