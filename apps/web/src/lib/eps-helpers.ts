/**
 * Определение вида оборудования из кастомных полей.
 * Защищает от ситуаций, когда в поле типа оборудования по ошибке попало название подразделения/группы обслуживания.
 */
export function getEquipmentKind(custom?: Record<string, any> | null): string {
  if (!custom) return '—';

  const isDept = (val?: any) => {
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
  };

  // Если в equipment_type по ошибке записано подразделение/группа обслуживания,
  // берем настоящий вид оборудования из equipment_group
  if (isDept(custom.equipment_type) && custom.equipment_group && !isDept(custom.equipment_group)) {
    return String(custom.equipment_group).trim();
  }
  if (custom.equipment_kind && !isDept(custom.equipment_kind)) {
    return String(custom.equipment_kind).trim();
  }
  if (custom.equipment_type && !isDept(custom.equipment_type)) {
    return String(custom.equipment_type).trim();
  }
  if (custom.equipment_group && !isDept(custom.equipment_group)) {
    return String(custom.equipment_group).trim();
  }
  return '—';
}

/**
 * Определение подразделения / группы обслуживания из кастомных полей.
 */
export function getEquipmentDepartment(custom?: Record<string, any> | null): string {
  if (!custom) return '—';

  const isDept = (val?: any) => {
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
  };

  if (custom.department) return String(custom.department).trim();
  if (custom.service_group) return String(custom.service_group).trim();
  if (isDept(custom.equipment_type)) return String(custom.equipment_type).trim();
  if (isDept(custom.equipment_group)) return String(custom.equipment_group).trim();
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
