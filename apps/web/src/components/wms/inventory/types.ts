import { TableColumnOption } from '@/components/ui';

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

export interface InventoryWarehouseOption {
  id: string;
  name: string;
  code: string;
  responsibleUserId?: string | null;
  responsibleUser?: { id: string; displayName: string } | null;
}

export interface InventoryKpiStats {
  total: number;
  inProgress: number;
  completed: number;
  totalPositionsCount: number;
}

export const INVENTORY_COLUMNS: TableColumnOption[] = [
  { id: 'code', label: 'Номер / Акт', defaultVisible: true, required: true },
  { id: 'warehouse', label: 'Склад', defaultVisible: true },
  { id: 'status', label: 'Статус', defaultVisible: true },
  { id: 'count', label: 'Позиций в акте', defaultVisible: true },
  { id: 'date', label: 'Дата создания', defaultVisible: true },
  { id: 'author', label: 'Ответственный', defaultVisible: true },
  { id: 'actions', label: 'Действия', defaultVisible: true, required: true },
];
