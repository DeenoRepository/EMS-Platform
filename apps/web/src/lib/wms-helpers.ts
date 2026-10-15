/**
 * WMS адресные вспомогательные функции для форматирования ячеек и стеллажей.
 */

export interface StorageCellInfo {
  code: string;
  name?: string | null;
  zone?: {
    code: string;
    name: string;
  } | null;
}

/**
 * Возвращает полное адресное наименование ячейки склада:
 * Например: "Зона A / Стеллаж 01 / Ячейка A-01-02"
 */
export function formatStorageCellAddress(cell?: StorageCellInfo | null): string {
  if (!cell) return 'Без адреса (не размещено)';

  const parts: string[] = [];
  if (cell.zone?.name) {
    parts.push(cell.zone.name);
  }
  if (cell.code) {
    parts.push(cell.code);
  }
  if (cell.name && cell.name !== cell.code) {
    parts.push(`(${cell.name})`);
  }

  return parts.join(' • ') || '—';
}

/**
 * Возвращает компактную метку ячейки для бейджа
 */
export function formatCellShortCode(cellCode?: string | null, zoneCode?: string | null): string {
  if (!cellCode) return 'Б/Я';
  if (zoneCode && !cellCode.startsWith(zoneCode)) {
    return `${zoneCode}-${cellCode}`;
  }
  return cellCode;
}
