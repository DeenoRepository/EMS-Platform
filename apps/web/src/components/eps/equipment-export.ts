import * as XLSX from 'xlsx';
import { EQUIPMENT_STATUS_MAP, formatDate } from '@ems/shared';
import type { EquipmentRegistryItem } from './equipment-registry-model';

export function exportEquipmentToExcel(
  items: EquipmentRegistryItem[],
  selectedIds: string[]
): { fileName: string; count: number } {
  const listToExport = selectedIds.length > 0
    ? items.filter((item) => selectedIds.includes(item.id))
    : items;

  const exportRows = listToExport.map((eq) => ({
    'Инвентарный №': eq.inventoryNumber || '—',
    'Заводской №': eq.serialNumber || '—',
    'Наименование': eq.name,
    'Производитель': eq.manufacturer || '—',
    'Модель / Марка': eq.model || '—',
    'Место установки': eq.location || '—',
    'Статус': EQUIPMENT_STATUS_MAP[eq.status]?.label || eq.status,
    'Критичность': eq.customFields?.criticality || '—',
    'Износ (%)': eq.customFields?.actual_wear_percentage ? `${eq.customFields.actual_wear_percentage}%` : '—',
    'Группа оборудования': eq.customFields?.equipment_group || '—',
    'Вид оборудования': eq.customFields?.equipment_type || '—',
    'МОЛ / Ответственный': eq.customFields?.responsible_person_name || '—',
    'Код ОКОФ': eq.customFields?.okof_code || '—',
    'Код ОКПД2': eq.customFields?.okpd2_code || '—',
    'Код техпроцесса': eq.customFields?.process_classifier_code || '—',
    'Периодичность ТО': eq.customFields?.maintenance_periodicity || '—',
    'Класс чистоты': eq.customFields?.clean_room_class || '—',
    'Интервал поверки (мес.)': eq.customFields?.calibration_interval || '—',
    'Критический путь': eq.customFields?.is_critical_path ? 'Да' : 'Нет',
    'Уникальное': eq.customFields?.is_unique ? 'Да' : 'Нет',
    'Импортное': eq.customFields?.is_imported ? 'Да' : 'Нет',
    'Теги': eq.tags.map((t) => t.name).join(', ') || '—',
    'Ввод в эксплуатацию': formatDate(eq.commissionDate),
    'Дата изменения': formatDate(eq.updatedAt),
    'Дата создания': formatDate(eq.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Оборудование');

  const fileName = `equipment_registry_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  return { fileName, count: listToExport.length };
}
