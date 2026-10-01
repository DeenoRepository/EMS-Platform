import { EquipmentStatus } from '@ems/database';
import { getEquipmentDepartment, getEquipmentKind } from './eps-helpers';

export interface BatchColumnConfig {
  id: string;
  label: string;
  category: 'direct' | 'custom';
  valueType: 'text' | 'select' | 'status';
  options?: Array<{ value: string; label: string }>;
}

export const BATCH_EDIT_COLUMNS: BatchColumnConfig[] = [
  {
    id: 'manufacturer',
    label: 'Предприятие-изготовитель',
    category: 'direct',
    valueType: 'text',
  },
  {
    id: 'model',
    label: 'Модель / Типоразмер',
    category: 'direct',
    valueType: 'text',
  },
  {
    id: 'location',
    label: 'Место установки / позиция',
    category: 'direct',
    valueType: 'text',
  },
  {
    id: 'status',
    label: 'Эксплуатационный статус',
    category: 'direct',
    valueType: 'status',
    options: [
      { value: 'ACTIVE', label: 'В эксплуатации' },
      { value: 'UNDER_REPAIR', label: 'В ремонте' },
      { value: 'IN_STORAGE', label: 'На консервации / складе' },
      { value: 'DECOMMISSIONED', label: 'Списано / демонтировано' },
      { value: 'DRAFT', label: 'Черновик' },
      { value: 'INACTIVE', label: 'Выведено из эксплуатации' },
    ],
  },
  {
    id: 'name',
    label: 'Наименование оборудования',
    category: 'direct',
    valueType: 'text',
  },
  {
    id: 'department',
    label: 'Подразделение / группа обслуживания',
    category: 'custom',
    valueType: 'text',
  },
  {
    id: 'equipment_kind',
    label: 'Вид оборудования',
    category: 'custom',
    valueType: 'text',
  },
  {
    id: 'criticality',
    label: 'Категория критичности (A / B / C)',
    category: 'custom',
    valueType: 'select',
    options: [
      { value: 'A', label: 'A — Критичное (остановка производства)' },
      { value: 'B', label: 'B — Основное (снижение производительности)' },
      { value: 'C', label: 'C — Вспомогательное (без влияния)' },
    ],
  },
  {
    id: 'responsible_person_name',
    label: 'Ответственное лицо (МОЛ)',
    category: 'custom',
    valueType: 'text',
  },
  {
    id: 'maintenance_periodicity',
    label: 'Периодичность регламентного ТО',
    category: 'custom',
    valueType: 'text',
  },
  {
    id: 'okof_code',
    label: 'Код ОКОФ',
    category: 'custom',
    valueType: 'text',
  },
  {
    id: 'okpd2_code',
    label: 'Код ОКПД2',
    category: 'custom',
    valueType: 'text',
  },
];

export interface EquipmentRecordSource {
  id: string;
  name: string;
  inventoryNumber?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  location?: string | null;
  status?: string | null;
  customFields?: Record<string, any> | null;
}

export function getEquipmentColumnValue(
  eq: EquipmentRecordSource,
  fieldId: string
): string {
  const custom = (eq.customFields || {}) as Record<string, any>;
  switch (fieldId) {
    case 'manufacturer':
      return eq.manufacturer?.trim() || '';
    case 'model':
      return eq.model?.trim() || '';
    case 'location':
      return eq.location?.trim() || '';
    case 'name':
      return eq.name?.trim() || '';
    case 'status':
      return eq.status || '';
    case 'department': {
      const dept = getEquipmentDepartment(custom);
      return dept === '—' ? '' : dept;
    }
    case 'equipment_kind': {
      const kind = getEquipmentKind(custom);
      return kind === '—' ? '' : kind;
    }
    default:
      return custom[fieldId] !== undefined && custom[fieldId] !== null
        ? String(custom[fieldId]).trim()
        : '';
  }
}

export function computeReplacement(
  currentValue: string,
  findValue: string,
  replaceValue: string,
  matchMode: 'EXACT' | 'CONTAINS'
): { matched: boolean; newValue: string } {
  const cur = currentValue.trim();
  const fnd = findValue.trim();

  if (!cur || !fnd) {
    return { matched: false, newValue: currentValue };
  }

  if (matchMode === 'EXACT') {
    const isSame = cur.toLowerCase() === fnd.toLowerCase();
    return {
      matched: isSame,
      newValue: isSame ? replaceValue.trim() : currentValue,
    };
  }

  const escaped = fnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  if (regex.test(currentValue)) {
    return {
      matched: true,
      newValue: currentValue.replace(new RegExp(escaped, 'gi'), replaceValue.trim()),
    };
  }

  return { matched: false, newValue: currentValue };
}

export function extractDistinctColumnValues(
  items: EquipmentRecordSource[],
  fieldId: string,
  searchQuery = ''
): Array<{ value: string; count: number }> {
  const countMap = new Map<string, number>();
  const q = searchQuery.trim().toLowerCase();

  for (const item of items) {
    const val = getEquipmentColumnValue(item, fieldId);
    if (!val) continue;
    if (q && !val.toLowerCase().includes(q)) continue;
    countMap.set(val, (countMap.get(val) || 0) + 1);
  }

  return Array.from(countMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ru'));
}

export function prepareEquipmentFieldUpdate(
  fieldId: string,
  newValue: string,
  currentCustomFields: Record<string, any> | null
): {
  directData?: {
    manufacturer?: string | null;
    model?: string | null;
    location?: string | null;
    name?: string;
    status?: EquipmentStatus;
  };
  customFields?: Record<string, any>;
} {
  const trimmed = newValue.trim();

  if (['manufacturer', 'model', 'location', 'name', 'status'].includes(fieldId)) {
    return prepareDirectUpdate(fieldId, trimmed);
  }

  return prepareCustomUpdate(fieldId, trimmed, currentCustomFields);
}

function prepareDirectUpdate(fieldId: string, value: string) {
  switch (fieldId) {
    case 'manufacturer':
      return { directData: { manufacturer: value || null } };
    case 'model':
      return { directData: { model: value || null } };
    case 'location':
      return { directData: { location: value || null } };
    case 'name':
      return { directData: { name: value } };
    case 'status':
      return { directData: { status: value as EquipmentStatus } };
    default:
      return {};
  }
}

function prepareCustomUpdate(
  fieldId: string,
  value: string,
  currentCustomFields: Record<string, any> | null
) {
  const nextCustom: Record<string, any> = { ...(currentCustomFields || {}) };

  if (fieldId === 'department') {
    nextCustom.department = value;
    nextCustom.service_group = value;
    nextCustom.equipment_group = value;
  } else if (fieldId === 'equipment_kind') {
    nextCustom.equipment_kind = value;
    nextCustom.equipment_type = value;
  } else {
    nextCustom[fieldId] = value;
  }

  return { customFields: nextCustom };
}
