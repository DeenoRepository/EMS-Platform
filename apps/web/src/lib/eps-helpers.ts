function isDepartmentName(val?: unknown): boolean {
  if (!val || typeof val !== 'string') return false;
  const lower = val.toLowerCase();
  return (
    lower.includes('группа обслуживания') ||
    lower.includes('ремонта') ||
    lower.includes('цех') ||
    lower.includes('подразделение') ||
    lower.includes('участок') ||
    lower.includes('служба')
  );
}

/**
 * Извлекает децимальный номер оборудования из customFields.
 */
export function getEquipmentDecimalNumber(customFields: unknown): string {
  if (!customFields || typeof customFields !== 'object') return '';
  const fields = customFields as Record<string, unknown>;
  return String(
    fields.decimal_number ||
    fields.detsimalnyy_nomer ||
    fields.decimalNumber ||
    fields['децимальный номер'] ||
    ''
  ).trim();
}

/**
 * Определение вида оборудования из кастомных полей.
 * Защищает от ситуаций, когда в поле типа оборудования по ошибке попало название подразделения/группы обслуживания.
 */
export function getEquipmentKind(custom?: Record<string, any> | null): string {
  if (!custom) return '—';

  if (custom.equipment_kind && !isDepartmentName(custom.equipment_kind)) {
    return String(custom.equipment_kind).trim();
  }
  if (custom.equipment_type && !isDepartmentName(custom.equipment_type)) {
    return String(custom.equipment_type).trim();
  }
  return '—';
}

/**
 * Определение подразделения / группы обслуживания из кастомных полей.
 */
export function getEquipmentDepartment(custom?: Record<string, any> | null): string {
  if (!custom) return '—';

  if (custom.department) return String(custom.department).trim();
  if (custom.service_group) return String(custom.service_group).trim();
  if (isDepartmentName(custom.equipment_type)) return String(custom.equipment_type).trim();
  if (isDepartmentName(custom.equipment_group)) return String(custom.equipment_group).trim();
  return custom.equipment_group ? String(custom.equipment_group).trim() : '—';
}

/**
 * Корректное преобразование булевых значений из БД, JSON или строк ("Да", "Нет", "true", "false", 1, 0).
 * Предотвращает ошибку JavaScript, когда непустая строка "Нет" считается truthy.
 */
export function isTruthyBoolean(val: any): boolean {
  if (val === true || val === 1) return true;
  if (val === false || val === 0 || val === null || val === undefined) return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'да' || s === 'yes' || s === 'y' || s === '+') return true;
    if (s === 'false' || s === '0' || s === 'нет' || s === 'no' || s === 'n' || s === '-' || s === '' || s === '—') return false;
  }
  return Boolean(val);
}

export interface EquipmentCompletenessResult {
  isIncomplete: boolean;
  filledCount: number;
  totalCount: number;
  missingFields: string[];
}

interface EquipmentCheckTarget {
  name?: string | null;
  inventoryNumber?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  location?: string | null;
  commissionDate?: string | Date | null;
  status?: string | null;
  customFields?: Record<string, any> | null;
}

function isValidText(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return Boolean(trimmed && trimmed !== '—' && trimmed !== '-');
}

/**
 * Проверка полноты заполнения ключевых полей карточки оборудования.
 * Если переданы сконфигурированные разделы (configuredSections),
 * проверяются СТРОГО только те поля, у которых f.isRequired === true.
 * Если разделы не настроены (пустой массив), карточка считается полной (isIncomplete: false).
 */
export function checkEquipmentCardCompleteness(
  item: EquipmentCheckTarget,
  configuredSections?: Array<{ fields?: Array<{ key: string; name: string; isRequired?: boolean }> }>
): EquipmentCompletenessResult {
  // Динамическая проверка по настроенным разделам
  if (configuredSections !== undefined) {
    if (!configuredSections || configuredSections.length === 0) {
      return {
        isIncomplete: false,
        filledCount: 0,
        totalCount: 0,
        missingFields: [],
      };
    }

    const requiredFields: Array<{ key: string; name: string }> = [];
    const seenKeys = new Set<string>();

    for (const sec of configuredSections) {
      for (const f of sec.fields || []) {
        if (f.isRequired && !seenKeys.has(f.key)) {
          seenKeys.add(f.key);
          requiredFields.push({ key: f.key, name: f.name });
        }
      }
    }

    if (requiredFields.length === 0) {
      return {
        isIncomplete: false,
        filledCount: 0,
        totalCount: 0,
        missingFields: [],
      };
    }

    let filledCount = 0;
    const missingFields: string[] = [];

    for (const f of requiredFields) {
      const val = getEquipmentFieldValue(item, f.key);
      const isFilled = isValidText(val !== undefined && val !== null ? String(val) : '');
      if (isFilled) {
        filledCount++;
      } else {
        missingFields.push(f.name);
      }
    }

    return {
      isIncomplete: missingFields.length > 0,
      filledCount,
      totalCount: requiredFields.length,
      missingFields,
    };
  }

  // Fallback проверки (для тестов или вызовов без передачи структуры разделов)
  const custom = item.customFields || {};
  const missingFields: string[] = [];

  const checks: [string, boolean][] = [
    ['Инвентарный номер', isValidText(item.inventoryNumber)],
    ['Наименование оборудования', isValidText(item.name)],
    ['Заводской (серийный) номер', isValidText(item.serialNumber)],
    ['Предприятие-изготовитель', isValidText(item.manufacturer)],
    ['Модель / типоразмер', isValidText(item.model)],
    ['Место установки (локация)', isValidText(item.location)],
    ['Дата ввода в эксплуатацию', Boolean(item.commissionDate && isValidText(String(item.commissionDate)))],
    ['Ответственное лицо (МОЛ)', isValidText(custom.responsible_person_name)],
    ['Категория критичности', Boolean(custom.criticality && ['A', 'B', 'C'].includes(String(custom.criticality).trim().toUpperCase()))],
    ['Подразделение / группа', getEquipmentDepartment(custom) !== '—'],
    ['Вид оборудования', getEquipmentKind(custom) !== '—'],
    ['Периодичность регламентного ТО', isValidText(custom.maintenance_periodicity)],
  ];

  let filledCount = 0;
  for (const [name, isFilled] of checks) {
    if (isFilled) {
      filledCount++;
    } else {
      missingFields.push(name);
    }
  }

  return {
    isIncomplete: missingFields.length > 0,
    filledCount,
    totalCount: checks.length,
    missingFields,
  };
}

/**
 * Извлекает значение поля оборудования по ключу:
 * проверяет как прямые поля сущности Equipment, так и customFields.
 */
export function getEquipmentFieldValue(item: any, fieldKey: string): any {
  if (!item) return '';
  const custom = (item.customFields || {}) as Record<string, any>;

  switch (fieldKey) {
    case 'name':
      return item.name || '';
    case 'inventoryNumber':
    case 'inventory_number':
      return item.inventoryNumber || custom.inventory_number || '';
    case 'serialNumber':
    case 'serial_number':
    case 'zavodskoy_nomer':
      return item.serialNumber || custom.serial_number || custom.zavodskoy_nomer || '';
    case 'manufacturer':
    case 'proizvoditel':
      return item.manufacturer || custom.manufacturer || custom.proizvoditel || '';
    case 'model':
    case 'marka':
      return item.model || custom.model || custom.marka || '';
    case 'location':
    case 'raspolozhenie':
      return item.location || custom.location || custom.raspolozhenie || '';
    case 'status':
      return item.status || '';
    case 'commissionDate':
    case 'commission_date':
      return item.commissionDate || custom.commission_date || '';
    case 'department':
    case 'equipment_group': {
      const dept = getEquipmentDepartment(custom);
      return dept !== '—' ? dept : (custom[fieldKey] || '');
    }
    case 'equipment_kind':
    case 'equipment_type': {
      const kind = getEquipmentKind(custom);
      return kind !== '—' ? kind : (custom[fieldKey] || '');
    }
    default:
      return custom[fieldKey] !== undefined && custom[fieldKey] !== null ? custom[fieldKey] : '';
  }
}
