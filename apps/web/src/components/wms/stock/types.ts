import { TableColumnOption } from '@/components/ui';

export interface InTransitTransferInfo {
  transferId: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  sourceWarehouseCode: string;
  targetWarehouseId: string;
  targetWarehouseName: string;
  targetWarehouseCode: string;
  quantity: number;
  dispatchedAt: string;
  direction: 'INCOMING' | 'OUTGOING';
}

export interface StockRow {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  warehouseResponsibleUserId?: string | null;
  nomenclatureId: string;
  name: string;
  article: string;
  description?: string | null;
  unit: string;
  category: string;
  quantity: number;
  inTransitIn?: number;
  inTransitOut?: number;
  globalInTransit?: number;
  expectedTotal?: number;
  transfersInTransit?: InTransitTransferInfo[];
  totalStock?: number;
  totalEffectiveStock?: number;
  minStock: number | string;
  isLowStock: boolean;
  isReplenishing?: boolean;
  cellId?: string | null;
  cellCode?: string | null;
  cellName?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
  zoneCode?: string | null;
  compatibleEquipmentCount: number;
  compatibleEquipment: Array<{ id: string; name: string; inventoryNumber: string }>;
  updatedAt: string;
}

export interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ZoneOption {
  id: string;
  name: string;
  code: string;
  cells: Array<{ id: string; code: string; name?: string | null }>;
}

export const STOCK_COLUMNS: TableColumnOption[] = [
  { id: 'warehouse', label: 'Склад хранения', defaultVisible: true },
  { id: 'zone', label: 'Адресная ячейка хранения', defaultVisible: true },
  { id: 'sku', label: 'Артикул / Модель', defaultVisible: true },
  { id: 'name', label: 'Наименование ТМЦ', defaultVisible: true, required: true },
  { id: 'category', label: 'Товарная группа / Категория', defaultVisible: true },
  { id: 'quantity', label: 'Фактический остаток', defaultVisible: true },
  { id: 'inTransit', label: 'В пути (Транзит)', defaultVisible: true },
  { id: 'minQuantity', label: 'Неснижаемый нормативный остаток', defaultVisible: true },
  { id: 'status', label: 'Статус обеспеченности', defaultVisible: true },
  { id: 'equipment', label: 'Совместимое оборудование', defaultVisible: true },
];
