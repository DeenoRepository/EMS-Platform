import { TableColumnOption } from '@/components/ui';

export interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
  } | null;
}

export interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string | null;
}

export interface AuditKpiStats {
  total: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
}

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  Equipment: 'Паспорт оборудования',
  EquipmentDocument: 'Документ / Чертеж',
  EquipmentApproval: 'Заявка на согласование',
  Photo: 'Фотография',
  CustomField: 'Технический параметр',
  EquipmentCustomSection: 'Пользовательский раздел',
};

export const AUDIT_COLUMNS: TableColumnOption[] = [
  { id: 'date', label: 'Дата / Время', defaultVisible: true, required: true },
  { id: 'action', label: 'Действие', defaultVisible: true, required: true },
  { id: 'entity', label: 'Объект изменений', defaultVisible: true },
  { id: 'equipment', label: 'Оборудование', defaultVisible: true },
  { id: 'details', label: 'Детализация изменений', defaultVisible: true },
  { id: 'user', label: 'Инициатор', defaultVisible: true },
];
