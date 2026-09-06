import { OperationType, StockTransferStatus, InventoryStatus } from '@ems/database';

export interface OperationItemDto {
  nomenclatureId: string;
  quantity: number;
  equipmentId?: string | null;
  cellId?: string | null;
  price?: number | null;
  batchNumber?: string | null;
}

export interface CreateStockOperationDto {
  warehouseId: string;
  targetWarehouseId?: string;
  type: OperationType;
  counterparty?: string;
  recipientName?: string;
  equipmentId?: string;
  document?: string;
  comment?: string;
  items: OperationItemDto[];
  userId: string;
}

export interface StockTransferDispatchDto {
  transferId: string;
  userId: string;
}

export interface StockTransferReceiveDto {
  transferId: string;
  userId: string;
  cellAllocations?: { itemId: string; targetCellId?: string | null }[];
}

export interface StockTransferRejectDto {
  transferId: string;
  userId: string;
  reason: string;
}

export interface InventoryItemUpdateDto {
  id: string;
  actualQty: number;
  comment?: string | null;
}

export interface InventoryCompleteDto {
  inventoryId: string;
  userId: string;
  comment?: string;
  items?: InventoryItemUpdateDto[];
}
