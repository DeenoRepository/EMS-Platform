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

export function getEquipmentSortValue(item: EquipmentRegistryItem, sortField: string): string | number | boolean {
  switch (sortField) {
    case 'inventoryNumber':
    case 'serialNumber':
    case 'manufacturer':
    case 'model':
    case 'location':
      return item[sortField] || '';
    case 'name':
    case 'status':
      return item[sortField] || '';
    case 'criticality':
      return customValue(item, 'criticality');
    case 'actualWear':
      return item.customFields?.actual_wear_percentage !== undefined && item.customFields.actual_wear_percentage !== ''
        ? Number(item.customFields.actual_wear_percentage)
        : -1;
    case 'eqGroup':
      return customValue(item, 'equipment_group');
    case 'eqType':
      return customValue(item, 'equipment_type');
    case 'respPerson':
      return customValue(item, 'responsible_person_name');
    case 'okofCode':
      return customValue(item, 'okof_code');
    case 'okpd2Code':
      return customValue(item, 'okpd2_code');
    case 'procCode':
      return customValue(item, 'process_classifier_code');
    case 'maintPeriodicity':
      return customValue(item, 'maintenance_periodicity');
    case 'calibrationInterval':
      return item.customFields?.calibration_interval ? Number(item.customFields.calibration_interval) : -1;
    case 'cleanRoom':
      return customValue(item, 'clean_room_class');
    case 'isCriticalPath':
      return item.customFields?.is_critical_path ? 1 : 0;
    case 'isUnique':
      return item.customFields?.is_unique ? 1 : 0;
    case 'isImported':
      return item.customFields?.is_imported ? 1 : 0;
    case 'documentsCount':
      return item._count?.documents || item.counts?.documents || 0;
    case 'sparePartsCount':
      return item._count?.spareParts || item.counts?.spareParts || 0;
    case 'tags':
      return item.tags.map((tag) => tag.name).join(', ');
    case 'commissionDate':
      return item.commissionDate ? new Date(item.commissionDate).getTime() : 0;
    case 'updatedAt':
    case 'createdAt':
      return item[sortField] ? new Date(item[sortField]).getTime() : 0;
    default:
      return String((item as unknown as Record<string, unknown>)[sortField] ?? '');
  }
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
