export interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  responsibleUserId?: string | null;
  responsibleUser?: {
    id: string;
    displayName: string;
    ldapLogin: string;
    email?: string | null;
  } | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    stockItems: number;
    operations: number;
    inventories: number;
  };
}

export interface WarehouseUserOption {
  id: string;
  displayName: string;
  ldapLogin: string;
}

export interface WarehouseKpiStats {
  total: number;
  active: number;
  totalStockItems: number;
  totalOperations: number;
}
