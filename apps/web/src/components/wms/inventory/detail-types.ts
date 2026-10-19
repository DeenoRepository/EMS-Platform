import { TableColumnOption } from '@/components/ui';

export interface InventoryDetailItem {
  id: string;
  expectedQty: number;
  actualQty: number | null;
  diffQty: number | null;
  comment?: string | null;
  nomenclature: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
    category?: { name: string } | null;
  };
}

export interface InventoryDetail {
  id: string;
  warehouseId: string;
  status: string;
  comment?: string | null;
  closedAt?: string | null;
  createdAt: string;
  warehouse: { id: string; name: string; code: string };
  createdBy: { displayName: string; ldapLogin: string };
  items: InventoryDetailItem[];
}

export interface InventoryItemState {
  id: string;
  actualQty: number;
  expectedQty: number;
  comment: string;
}

export interface InventoryDetailKpiStats {
  statusLabel: string;
  createdByDisplayName: string;
  totalItems: number;
  matchCount: number;
  surplusCount: number;
  deficitCount: number;
}
