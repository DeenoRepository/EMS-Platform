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
