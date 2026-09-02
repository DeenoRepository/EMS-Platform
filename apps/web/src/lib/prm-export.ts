export interface PurchaseRequestExportRow {
  requestNumber: string;
  status: string;
  priority: string;
  warehouse: string;
  requester: string;
  supplierName?: string | null;
  estimatedTotal: number | string;
  currency: string;
  createdAt: Date | string;
  itemsCount: number;
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export const PURCHASE_REQUEST_EXPORT_COLUMNS = [
  'Номер заявки',
  'Статус',
  'Приоритет',
  'Склад назначения',
  'Инициатор',
  'Поставщик',
  'Оценочная сумма',
  'Валюта',
  'Дата создания',
  'Позиций',
] as const;

export function buildPurchaseRequestCsv(rows: PurchaseRequestExportRow[]): string {
  const header = PURCHASE_REQUEST_EXPORT_COLUMNS.map(escapeCsv).join(',');
  const body = rows.map((row) => [
    row.requestNumber,
    row.status,
    row.priority,
    row.warehouse,
    row.requester,
    row.supplierName,
    row.estimatedTotal,
    row.currency,
    new Date(row.createdAt).toISOString(),
    row.itemsCount,
  ].map(escapeCsv).join(','));

  return `\uFEFF${[header, ...body].join('\n')}`;
}
