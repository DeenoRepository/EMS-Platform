import type { EquipmentFilters, ActiveFilterItem } from '../components/eps/EquipmentFilterTypes';
import { getEquipmentDepartment, getEquipmentKind, isTruthyBoolean } from './eps-helpers';

/**
 * Проверка текстового соответствия без учета регистра
 */
export function matchesText(actual?: string | null, expected?: string | null): boolean {
  if (!expected || !expected.trim()) return true;
  if (!actual) return false;
  return actual.toLowerCase().includes(expected.trim().toLowerCase());
}

/**
 * Проверка числового диапазона (min/max)
 */
export function matchesNumberRange(
  val: number | null | undefined,
  minStr?: string,
  maxStr?: string
): boolean {
  const min = minStr !== undefined && minStr !== '' ? Number(minStr) : null;
  const max = maxStr !== undefined && maxStr !== '' ? Number(maxStr) : null;
  if (min === null && max === null) return true;
  if (val === null || val === undefined || isNaN(val) || val < 0) return false;
  if (min !== null && !isNaN(min) && val < min) return false;
  if (max !== null && !isNaN(max) && val > max) return false;
  return true;
}

/**
 * Проверка соответствия диапазона дат
 */
export function matchesDateRange(
  dateValue?: string | null,
  fromStr?: string,
  toStr?: string
): boolean {
  if (!fromStr && !toStr) return true;
  if (!dateValue) return false;
  const d = new Date(dateValue).getTime();
  if (isNaN(d)) return false;

  if (fromStr) {
    const fromTime = new Date(fromStr).getTime();
    if (!isNaN(fromTime) && d < fromTime) return false;
  }
  if (toStr) {
    // Конец дня для конечной даты
    const toDate = new Date(toStr);
    toDate.setHours(23, 59, 59, 999);
    const toTime = toDate.getTime();
    if (!isNaN(toTime) && d > toTime) return false;
  }
  return true;
}

/**
 * Проверка тристейта булевого поля (все / да / нет)
 */
export function matchesTriState(actual: any, filterValue?: string): boolean {
  if (!filterValue || filterValue === 'all') return true;
  const isTrue = isTruthyBoolean(actual);
  if (filterValue === 'true') return isTrue;
  if (filterValue === 'false') return !isTrue;
  return true;
}

/**
 * Проверка наличия связанных сущностей (документов, запчастей)
 */
export function matchesCountFilter(count: number, filterValue?: string): boolean {
  if (!filterValue || filterValue === 'all') return true;
  if (filterValue === 'with') return count > 0;
  if (filterValue === 'without') return count === 0;
  return true;
}

/**
 * Проверка соответствия базовых полей карточки оборудования
 */
function matchesPrimaryFields(item: Record<string, any>, f: EquipmentFilters): boolean {
  if (!matchesText(item.inventoryNumber, f.inventoryNumber)) return false;
  if (!matchesText(item.name, f.name)) return false;
  if (!matchesText(item.serialNumber, f.serialNumber)) return false;
  if (!matchesText(item.manufacturer, f.manufacturer)) return false;
  if (!matchesText(item.model, f.model)) return false;
  if (!matchesText(item.location, f.location)) return false;
  if (f.status && item.status !== f.status) return false;
  if (f.tagId) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const hasTag = tags.some((t: any) => (t.id || t.tagId) === f.tagId);
    if (!hasTag) return false;
  }
  return true;
}

/**
 * Проверка соответствия кастомных классификаторов и характеристик
 */
function matchesCustomClassifierFields(item: Record<string, any>, f: EquipmentFilters): boolean {
  const c = item.customFields || {};
  if (f.criticality && (c.criticality || 'B') !== f.criticality) return false;

  const rawWear = c.actual_wear_percentage;
  const wear = rawWear !== undefined && rawWear !== '' ? Number(rawWear) : null;
  if (!matchesNumberRange(wear, f.wearMin, f.wearMax)) return false;

  if (f.eqGroup && !matchesText(getEquipmentDepartment(c), f.eqGroup)) return false;
  if (f.eqType && !matchesText(getEquipmentKind(c), f.eqType)) return false;
  if (f.respPerson && !matchesText(c.responsible_person_name, f.respPerson)) return false;
  if (f.okofCode && !matchesText(c.okof_code, f.okofCode)) return false;
  if (f.okpd2Code && !matchesText(c.okpd2_code, f.okpd2Code)) return false;
  if (f.procCode && !matchesText(c.process_classifier_code, f.procCode)) return false;
  return true;
}

/**
 * Проверка соответствия эксплуатационных свойств
 */
function matchesOperationalFields(item: Record<string, any>, f: EquipmentFilters): boolean {
  const c = item.customFields || {};
  if (f.maintPeriodicity && !matchesText(c.maintenance_periodicity, f.maintPeriodicity)) return false;

  const rawCalib = c.calibration_interval;
  const calib = rawCalib ? Number(rawCalib) : null;
  if (!matchesNumberRange(calib, f.calibrationIntervalMin, f.calibrationIntervalMax)) return false;

  if (f.cleanRoom && !matchesText(c.clean_room_class, f.cleanRoom)) return false;
  if (!matchesTriState(c.is_critical_path, f.isCriticalPath)) return false;
  if (!matchesTriState(c.is_unique, f.isUnique)) return false;
  if (!matchesTriState(c.is_imported, f.isImported)) return false;

  const docCount = item._count?.documents ?? item.counts?.documents ?? 0;
  if (!matchesCountFilter(docCount, f.documentsFilter)) return false;

  const spCount = item._count?.spareParts ?? item.counts?.spareParts ?? 0;
  if (!matchesCountFilter(spCount, f.sparePartsFilter)) return false;
  return true;
}

/**
 * Проверка быстрых текстовых полей при глобальном поиске
 */
function matchesGlobalSearch(item: Record<string, any>, search?: string): boolean {
  if (!search || !search.trim()) return true;
  const s = search.trim().toLowerCase();
  return Boolean(
    (item.name && item.name.toLowerCase().includes(s)) ||
    (item.inventoryNumber && item.inventoryNumber.toLowerCase().includes(s)) ||
    (item.serialNumber && item.serialNumber.toLowerCase().includes(s)) ||
    (item.manufacturer && item.manufacturer.toLowerCase().includes(s)) ||
    (item.model && item.model.toLowerCase().includes(s)) ||
    (item.location && item.location.toLowerCase().includes(s))
  );
}

/**
 * Полная проверка соответствия оборудования фильтрам по всем 27 полям
 */
export function matchesAllEquipmentFilters(
  item: Record<string, any>,
  filters: EquipmentFilters
): boolean {
  if (!matchesGlobalSearch(item, filters.search)) return false;
  if (!matchesPrimaryFields(item, filters)) return false;
  if (!matchesCustomClassifierFields(item, filters)) return false;
  if (!matchesOperationalFields(item, filters)) return false;
  if (!matchesDateRange(item.commissionDate, filters.commissionDateFrom, filters.commissionDateTo)) return false;
  if (!matchesDateRange(item.createdAt, filters.createdAtFrom, filters.createdAtTo)) return false;
  if (!matchesDateRange(item.updatedAt, filters.updatedAtFrom, filters.updatedAtTo)) return false;
  return true;
}

/**
 * Подсчет общего количества активных параметров фильтрации
 */
export function countActiveEquipmentFilters(f: EquipmentFilters): number {
  let count = 0;
  const keys = Object.keys(f) as (keyof EquipmentFilters)[];
  for (const k of keys) {
    const val = f[k];
    if (val !== undefined && val !== '' && val !== 'all') {
      count++;
    }
  }
  return count;
}

/**
 * Построение URLSearchParams для отправки на бэкенд
 */
export function buildEquipmentFilterSearchParams(
  filters: EquipmentFilters,
  page: number,
  pageSize: number
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const filterEntries = Object.entries(filters) as [keyof EquipmentFilters, string | undefined][];
  for (const [key, val] of filterEntries) {
    if (val !== undefined && val !== '' && val !== 'all') {
      params.append(key, val);
    }
  }

  return params;
}

/**
 * Формирование списка активных бейджей фильтров для быстрого снятия
 */
export function getActiveEquipmentFilterBadges(
  f: EquipmentFilters,
  tags: { id: string; name: string }[] = [],
  statusLabels: Record<string, string> = {}
): ActiveFilterItem[] {
  const badges: ActiveFilterItem[] = [];

  if (f.search) {
    badges.push({ key: 'search', keysToReset: ['search'], label: 'Поиск', value: f.search });
  }
  if (f.inventoryNumber) {
    badges.push({ key: 'inventoryNumber', keysToReset: ['inventoryNumber'], label: 'Инв. №', value: f.inventoryNumber });
  }
  if (f.name) {
    badges.push({ key: 'name', keysToReset: ['name'], label: 'Наименование', value: f.name });
  }
  if (f.serialNumber) {
    badges.push({ key: 'serialNumber', keysToReset: ['serialNumber'], label: 'Серийный №', value: f.serialNumber });
  }
  if (f.manufacturer) {
    badges.push({ key: 'manufacturer', keysToReset: ['manufacturer'], label: 'Производитель', value: f.manufacturer });
  }
  if (f.model) {
    badges.push({ key: 'model', keysToReset: ['model'], label: 'Модель', value: f.model });
  }
  if (f.location) {
    badges.push({ key: 'location', keysToReset: ['location'], label: 'Локация', value: f.location });
  }
  if (f.status) {
    badges.push({ key: 'status', keysToReset: ['status'], label: 'Статус', value: statusLabels[f.status] || f.status });
  }
  if (f.tagId) {
    const t = tags.find((item) => item.id === f.tagId);
    badges.push({ key: 'tagId', keysToReset: ['tagId'], label: 'Тег', value: t ? t.name : f.tagId });
  }
  if (f.criticality) {
    badges.push({ key: 'criticality', keysToReset: ['criticality'], label: 'Критичность', value: `Категория ${f.criticality}` });
  }

  appendRangeBadges(badges, f);
  appendClassifierBadges(badges, f);
  appendOperationalBadges(badges, f);
  appendDateBadges(badges, f);

  return badges;
}

function appendRangeBadges(badges: ActiveFilterItem[], f: EquipmentFilters): void {
  if (f.wearMin || f.wearMax) {
    const val = `${f.wearMin || '0'}% — ${f.wearMax || '100'}%`;
    badges.push({ key: 'wearRange', keysToReset: ['wearMin', 'wearMax'], label: 'Износ', value: val });
  }
  if (f.calibrationIntervalMin || f.calibrationIntervalMax) {
    const val = `${f.calibrationIntervalMin || '0'} — ${f.calibrationIntervalMax || '∞'} мес.`;
    badges.push({ key: 'calibrationRange', keysToReset: ['calibrationIntervalMin', 'calibrationIntervalMax'], label: 'Поверка', value: val });
  }
}

function appendClassifierBadges(badges: ActiveFilterItem[], f: EquipmentFilters): void {
  if (f.eqGroup) badges.push({ key: 'eqGroup', keysToReset: ['eqGroup'], label: 'Подразделение', value: f.eqGroup });
  if (f.eqType) badges.push({ key: 'eqType', keysToReset: ['eqType'], label: 'Вид оборуд.', value: f.eqType });
  if (f.respPerson) badges.push({ key: 'respPerson', keysToReset: ['respPerson'], label: 'МОЛ', value: f.respPerson });
  if (f.okofCode) badges.push({ key: 'okofCode', keysToReset: ['okofCode'], label: 'ОКОФ', value: f.okofCode });
  if (f.okpd2Code) badges.push({ key: 'okpd2Code', keysToReset: ['okpd2Code'], label: 'ОКПД2', value: f.okpd2Code });
  if (f.procCode) badges.push({ key: 'procCode', keysToReset: ['procCode'], label: 'Техпроцесс', value: f.procCode });
}

function appendOperationalBadges(badges: ActiveFilterItem[], f: EquipmentFilters): void {
  if (f.maintPeriodicity) badges.push({ key: 'maintPeriodicity', keysToReset: ['maintPeriodicity'], label: 'Период ТО', value: f.maintPeriodicity });
  if (f.cleanRoom) badges.push({ key: 'cleanRoom', keysToReset: ['cleanRoom'], label: 'Класс чистоты', value: f.cleanRoom });
  if (f.isCriticalPath && f.isCriticalPath !== 'all') {
    badges.push({ key: 'isCriticalPath', keysToReset: ['isCriticalPath'], label: 'Критич. путь', value: f.isCriticalPath === 'true' ? 'Да' : 'Нет' });
  }
  if (f.isUnique && f.isUnique !== 'all') {
    badges.push({ key: 'isUnique', keysToReset: ['isUnique'], label: 'Уникальное', value: f.isUnique === 'true' ? 'Да' : 'Нет' });
  }
  if (f.isImported && f.isImported !== 'all') {
    badges.push({ key: 'isImported', keysToReset: ['isImported'], label: 'Импортное', value: f.isImported === 'true' ? 'Да' : 'Нет' });
  }
  if (f.documentsFilter && f.documentsFilter !== 'all') {
    badges.push({ key: 'documentsFilter', keysToReset: ['documentsFilter'], label: 'Документы', value: f.documentsFilter === 'with' ? 'Есть' : 'Нет' });
  }
  if (f.sparePartsFilter && f.sparePartsFilter !== 'all') {
    badges.push({ key: 'sparePartsFilter', keysToReset: ['sparePartsFilter'], label: 'ЗИП', value: f.sparePartsFilter === 'with' ? 'Есть' : 'Нет' });
  }
}

function appendDateBadges(badges: ActiveFilterItem[], f: EquipmentFilters): void {
  if (f.commissionDateFrom || f.commissionDateTo) {
    const val = `${f.commissionDateFrom || '...'} по ${f.commissionDateTo || '...'}`;
    badges.push({ key: 'commissionDateRange', keysToReset: ['commissionDateFrom', 'commissionDateTo'], label: 'Ввод в экспл.', value: val });
  }
  if (f.createdAtFrom || f.createdAtTo) {
    const val = `${f.createdAtFrom || '...'} по ${f.createdAtTo || '...'}`;
    badges.push({ key: 'createdAtRange', keysToReset: ['createdAtFrom', 'createdAtTo'], label: 'Создано', value: val });
  }
  if (f.updatedAtFrom || f.updatedAtTo) {
    const val = `${f.updatedAtFrom || '...'} по ${f.updatedAtTo || '...'}`;
    badges.push({ key: 'updatedAtRange', keysToReset: ['updatedAtFrom', 'updatedAtTo'], label: 'Обновлено', value: val });
  }
}
