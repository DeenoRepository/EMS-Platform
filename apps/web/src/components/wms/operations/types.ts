import { TableColumnOption } from '@/components/ui';

export interface StockOperation {
  id: string;
  type: string;
  date: string;
  counterparty?: string | null;
  document?: string | null;
  comment?: string | null;
  warehouse: { id: string; name: string; code: string };
  createdBy: { displayName: string; ldapLogin: string };
  items: Array<{
    id: string;
    quantity: number;
    nomenclature: { id: string; name: string; article?: string | null; unit: string };
    equipment?: { id: string; name: string; inventoryNumber: string } | null;
  }>;
}

export interface TransferItemRecord {
  id: string;
  nomenclatureId: string;
  quantity: string | number;
  targetCellId?: string | null;
  targetCell?: { code: string; name?: string } | null;
  nomenclature?: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
  };
}

export interface TransferRecord {
  id: string;
  transferNumber: string;
  status: string;
  sourceWarehouse: { id: string; name: string; code: string; responsibleUserId?: string };
  targetWarehouse: { id: string; name: string; code: string; responsibleUserId?: string };
  requestedBy: { id: string; displayName: string };
  createdAt: string;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  comment?: string | null;
  rejectionReason?: string | null;
  items: TransferItemRecord[];
}

export const OPERATIONS_COLUMNS: TableColumnOption[] = [
  { id: 'date', label: 'Дата / Время', defaultVisible: true },
  { id: 'type', label: 'Тип операции', defaultVisible: true },
  { id: 'warehouse', label: 'Склад', defaultVisible: true },
  { id: 'items', label: 'Позиции и количество', defaultVisible: true, required: true },
  { id: 'recipient', label: 'Получатель / Назначение / Причина', defaultVisible: true },
  { id: 'comment', label: 'Примечание / Комментарий', defaultVisible: true },
  { id: 'executor', label: 'Исполнитель', defaultVisible: true },
];
