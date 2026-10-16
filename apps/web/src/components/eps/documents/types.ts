import { TableColumnOption } from '@/components/ui';

export interface DocumentItem {
  id: string;
  equipmentId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  docType: string;
  version: number;
  description: string | null;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    manufacturer: string | null;
    model: string | null;
    location: string | null;
    status: string;
  };
  uploadedBy: {
    id: string;
    displayName: string;
    ldapLogin: string;
  };
}

export interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string | null;
  model: string | null;
  manufacturer: string | null;
  location: string | null;
  tags?: Array<{ tag: { name: string } }>;
  customFields?: Record<string, any> | null;
}

export interface DocumentKpiCounts {
  total: number;
  passport: number;
  schema: number;
  manual: number;
  certificate: number;
}

export const DOCUMENT_COLUMNS: TableColumnOption[] = [
  { id: 'originalName', label: 'Наименование файла документа', defaultVisible: true, required: true },
  { id: 'docType', label: 'Тип документации', defaultVisible: true },
  { id: 'equipment', label: 'Привязка к оборудованию', defaultVisible: true },
  { id: 'model', label: 'Модель оборудования', defaultVisible: true },
  { id: 'location', label: 'Локация оборудования', defaultVisible: true },
  { id: 'fileSize', label: 'Размер', defaultVisible: true },
  { id: 'uploadedBy', label: 'Загрузил сотрудник', defaultVisible: true },
  { id: 'createdAt', label: 'Дата прикрепления', defaultVisible: true },
  { id: 'actions', label: 'Действия', defaultVisible: true, required: true },
];
