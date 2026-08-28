import type { TableColumnOption } from '@/components/ui';

export interface EquipmentCustomFields {
  [key: string]: string | number | boolean | null | undefined;
}

export interface EquipmentRegistryItem {
  id: string;
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: string;
  commissionDate: string | null;
  primaryPhoto: string | null;
  customFields?: EquipmentCustomFields | null;
  tags: { id: string; name: string; color: string | null }[];
  counts?: { documents: number; photos: number; maintenancePlans: number; spareParts: number };
  _count?: { documents?: number; photos?: number; maintenancePlans?: number; spareParts?: number };
  createdAt: string;
  updatedAt: string;
}

export const EPS_COLUMNS: TableColumnOption[] = [
  { id: 'inventoryNumber', label: 'Инвентарный номер', defaultVisible: true },
  { id: 'name', label: 'Наименование оборудования', defaultVisible: true },
  { id: 'serialNumber', label: 'Заводской (серийный) номер', defaultVisible: false },
  { id: 'manufacturer', label: 'Предприятие-изготовитель', defaultVisible: true },
  { id: 'model', label: 'Модель / Типоразмер', defaultVisible: true },
  { id: 'location', label: 'Место установки / Технологическая позиция', defaultVisible: true },
  { id: 'status', label: 'Эксплуатационный статус', defaultVisible: true },
  { id: 'criticality', label: 'Категория критичности (A / B / C)', defaultVisible: false },
  { id: 'actualWear', label: 'Степень физического износа (%)', defaultVisible: false },
  { id: 'eqGroup', label: 'Группа оборудования', defaultVisible: false },
  { id: 'eqType', label: 'Вид оборудования', defaultVisible: false },
  { id: 'respPerson', label: 'Ответственное лицо (МОЛ)', defaultVisible: false },
  { id: 'okofCode', label: 'Код ОКОФ (ОК 013-2014)', defaultVisible: false },
  { id: 'okpd2Code', label: 'Код ОКПД2 (ОК 034-2014)', defaultVisible: false },
  { id: 'procCode', label: 'Код технологического процесса', defaultVisible: false },
  { id: 'maintPeriodicity', label: 'Периодичность регламентного ТО', defaultVisible: false },
  { id: 'calibrationInterval', label: 'Межповерочный интервал (мес.)', defaultVisible: false },
  { id: 'cleanRoom', label: 'Класс чистоты помещения (ISO)', defaultVisible: false },
  { id: 'isCriticalPath', label: 'Влияние на непрерывность процесса', defaultVisible: false },
  { id: 'isUnique', label: 'Уникальное / единичное оборудование', defaultVisible: false },
  { id: 'isImported', label: 'Импортное оборудование', defaultVisible: false },
  { id: 'documentsCount', label: 'Комплект документации (ед.)', defaultVisible: false },
  { id: 'sparePartsCount', label: 'Комплект ЗИП / Запчасти (ед.)', defaultVisible: false },
  { id: 'tags', label: 'Технологические метки (теги)', defaultVisible: true },
  { id: 'commissionDate', label: 'Дата ввода в эксплуатацию', defaultVisible: true },
  { id: 'updatedAt', label: 'Дата последней корректировки', defaultVisible: false },
  { id: 'createdAt', label: 'Дата первичной регистрации', defaultVisible: false },
];

function customValue(item: EquipmentRegistryItem, key: string): string | number | boolean {
  return item.customFields?.[key] ?? '';
}

const DIRECT_EQUIPMENT_FIELDS = new Set(['inventoryNumber', 'serialNumber', 'manufacturer', 'model', 'location', 'name', 'status']);
const CUSTOM_FIELD_BY_SORT_FIELD: Record<string, string> = {
  criticality: 'criticality',
  eqGroup: 'equipment_group',
  eqType: 'equipment_type',
  respPerson: 'responsible_person_name',
  okofCode: 'okof_code',
  okpd2Code: 'okpd2_code',
  procCode: 'process_classifier_code',
  maintPeriodicity: 'maintenance_periodicity',
  cleanRoom: 'clean_room_class',
};
const BOOLEAN_SORT_FIELDS: Record<string, string> = {
  isCriticalPath: 'is_critical_path',
  isUnique: 'is_unique',
  isImported: 'is_imported',
};

function getEquipmentCustomSortValue(item: EquipmentRegistryItem, sortField: string): string | number | boolean | undefined {
  const customField = CUSTOM_FIELD_BY_SORT_FIELD[sortField];
  if (customField) return customValue(item, customField);

  const booleanField = BOOLEAN_SORT_FIELDS[sortField];
  if (booleanField) return item.customFields?.[booleanField] ? 1 : 0;

  return undefined;
}

function getEquipmentDateSortValue(item: EquipmentRegistryItem, sortField: string): number | undefined {
  if (sortField === 'commissionDate') return item.commissionDate ? new Date(item.commissionDate).getTime() : 0;
  if (sortField === 'updatedAt' || sortField === 'createdAt') {
    return item[sortField] ? new Date(item[sortField]).getTime() : 0;
  }
  return undefined;
}

export function getEquipmentSortValue(item: EquipmentRegistryItem, sortField: string): string | number | boolean {
  if (DIRECT_EQUIPMENT_FIELDS.has(sortField)) {
    return item[sortField as keyof Pick<EquipmentRegistryItem, 'inventoryNumber' | 'serialNumber' | 'manufacturer' | 'model' | 'location' | 'name' | 'status'>] || '';
  }

  if (sortField === 'actualWear') {
    const value = item.customFields?.actual_wear_percentage;
    return value !== undefined && value !== '' ? Number(value) : -1;
  }

  if (sortField === 'calibrationInterval') {
    return item.customFields?.calibration_interval ? Number(item.customFields.calibration_interval) : -1;
  }

  const customSortValue = getEquipmentCustomSortValue(item, sortField);
  if (customSortValue !== undefined) return customSortValue;

  if (sortField === 'documentsCount') return item._count?.documents || item.counts?.documents || 0;
  if (sortField === 'sparePartsCount') return item._count?.spareParts || item.counts?.spareParts || 0;
  if (sortField === 'tags') return item.tags.map((tag) => tag.name).join(', ');

  const dateSortValue = getEquipmentDateSortValue(item, sortField);
  if (dateSortValue !== undefined) return dateSortValue;

  return String((item as unknown as Record<string, unknown>)[sortField] ?? '');
}

export function sortEquipmentRegistry(
  items: EquipmentRegistryItem[],
  sortField: string,
  sortDirection: 'asc' | 'desc'
): EquipmentRegistryItem[] {
  if (!sortField) return items;

  return [...items].sort((left, right) => {
    const leftValue = getEquipmentSortValue(left, sortField);
    const rightValue = getEquipmentSortValue(right, sortField);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
    }

    const leftText = String(leftValue);
    const rightText = String(rightValue);
    return sortDirection === 'asc'
      ? leftText.localeCompare(rightText, 'ru')
      : rightText.localeCompare(leftText, 'ru');
  });
}
