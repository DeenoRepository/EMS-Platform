export const IMPORT_COLUMN_ALIASES = [
  { key: 'name', aliases: ['наименование оборудования', 'наименование', 'название', 'оборудование', 'name', 'title', 'equipment name'] },
  { key: 'inventoryNumber', aliases: ['инвентарный номер', 'инвентарный', 'инв. номер', 'инв номер', 'инв. №', 'инв №', 'инв.', 'инв', 'inventorynumber', 'inventory number', 'inv number', 'inv no'] },
  { key: 'serialNumber', aliases: ['серийный номер', 'заводской номер', 'серийный', 'заводской', 'serial', 'serialnumber', 'serial number', 'sn'] },
  { key: 'category', aliases: ['категория', 'тип', 'группа оборудования', 'вид оборудования', 'category', 'type', 'group'] },
  { key: 'model', aliases: ['модель', 'модификация', 'модель / модификация', 'марка', 'тип оборудования', 'model'] },
  { key: 'location', aliases: ['место установки', 'локация', 'цех', 'участок', 'местоположение', 'помещение', 'location', 'site', 'placement'] },
];

/**
 * Matches an input column header from spreadsheet against known equipment fields.
 */
export function matchImportColumn(header: string): string | null {
  const norm = header.toLowerCase().replace(/[^a-zа-я0-9]/g, ' ').trim();
  for (const rule of IMPORT_COLUMN_ALIASES) {
    if (rule.aliases.some((alias) => norm === alias || norm.startsWith(alias) || alias.startsWith(norm))) {
      return rule.key;
    }
  }
  return null;
}

export interface InventoryResolutionResult {
  finalInventoryNumber: string;
  isDuplicate: boolean;
  isTemporary: boolean;
}

/**
 * Resolves inventory number collisions according to business rules:
 * - If missing, allocates TEMP-PAA-XXXX
 * - If exists in database, prefixes with DUP-
 */
export function resolveInventoryNumber(
  input: string | null | undefined,
  existingNumbers: Set<string>,
  tempSequence: number
): InventoryResolutionResult {
  const trimmed = input?.trim();

  if (!trimmed) {
    const padded = String(tempSequence).padStart(4, '0');
    return {
      finalInventoryNumber: `TEMP-PAA-${padded}`,
      isDuplicate: false,
      isTemporary: true,
    };
  }

  if (existingNumbers.has(trimmed)) {
    return {
      finalInventoryNumber: `DUP-${trimmed}`,
      isDuplicate: true,
      isTemporary: false,
    };
  }

  return {
    finalInventoryNumber: trimmed,
    isDuplicate: false,
    isTemporary: false,
  };
}

/**
 * Sanitizes import row to prevent false upsert collisions on temporary rows.
 */
export function sanitizeImportRow<T extends { inventoryNumber: string; serialNumber?: string | null }>(row: T): T {
  if (row.inventoryNumber.startsWith('TEMP-PAA-')) {
    return { ...row, serialNumber: null };
  }
  return row;
}
