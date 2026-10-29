import { formatDateTime } from '@ems/shared';
import { InventoryCountSheetDetail, InventoryCountSheetItem } from '../InventoryCountSheetDialog';

export function getCellAddress(item: InventoryCountSheetItem, warehouseId: string): string {
  const stock = item.nomenclature.stockItems?.find((si) => si.warehouseId === warehouseId) || item.nomenclature.stockItems?.[0];
  if (!stock || !stock.cell) return '—';
  if (stock.cell.zone) {
    return `${stock.cell.zone.name} / ${stock.cell.code}`;
  }
  return stock.cell.code;
}

export function generateCountSheetCsv(inventory: InventoryCountSheetDetail): string {
  const headers = [
    '№ п/п',
    'Артикул',
    'Наименование ТМЦ (Номенклатура)',
    'Категория',
    'Ед. изм.',
    'Место хранения (Ячейка)',
    'Учетный остаток',
    'Фактический остаток (заполняется вручную)',
    'Расхождения (+/-)',
    'Примечания комиссии',
  ];

  const csvRows = [
    headers.join(';'),
    ...inventory.items.map((item, idx) => {
      const cell = getCellAddress(item, inventory.warehouseId);
      return [
        idx + 1,
        `"${(item.nomenclature.article || '—').replace(/"/g, '""')}"`,
        `"${item.nomenclature.name.replace(/"/g, '""')}"`,
        `"${(item.nomenclature.category?.name || '—').replace(/"/g, '""')}"`,
        `"${item.nomenclature.unit}"`,
        `"${cell}"`,
        item.expectedQty,
        '', // пустая колонка для ручного ввода
        '',
        `"${(item.comment || '').replace(/"/g, '""')}"`,
      ].join(';');
    }),
  ];

  return '\uFEFF' + csvRows.join('\r\n');
}


export function printCountSheetHtml(
  inventory: InventoryCountSheetDetail,
  actCode: string,
  molName: string
): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const rowsHtml = inventory.items
    .map((item, idx) => {
      const cellAddr = getCellAddress(item, inventory.warehouseId);
      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-family: monospace; font-size: 11px;">${item.nomenclature.article || '—'}</td>
          <td><strong>${item.nomenclature.name}</strong></td>
          <td>${item.nomenclature.category?.name || '—'}</td>
          <td style="text-align: center;">${item.nomenclature.unit}</td>
          <td style="text-align: center; font-size: 11px;">${cellAddr}</td>
          <td style="text-align: right; font-weight: bold; padding-right: 8px;">${item.expectedQty}</td>
          <td style="background-color: #fafafa; border: 1.5px solid #000; min-width: 70px;"></td>
          <td style="min-width: 90px;"></td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8" />
      <title>Бланк пересчета ТМЦ — ${actCode}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 0; }
        .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
        .org-title { font-size: 14px; font-weight: bold; text-transform: uppercase; }
        .doc-title { font-size: 16px; font-weight: 800; text-align: center; margin: 6px 0 2px 0; text-transform: uppercase; }
        .doc-subtitle { font-size: 12px; text-align: center; margin-bottom: 12px; color: #333; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; font-size: 11px; margin-bottom: 14px; background-color: #f8fafc; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; }
        .meta-item strong { display: inline-block; min-width: 130px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
        th, td { border: 1px solid #000; padding: 5px 6px; vertical-align: middle; }
        th { background-color: #f1f5f9; font-weight: 700; text-align: center; }
        .signatures { margin-top: 24px; page-break-inside: avoid; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 14px; font-size: 11px; }
        .sig-line { display: inline-block; width: 180px; border-bottom: 1px solid #000; margin: 0 4px; }
        .receipt-text { font-size: 10px; font-style: italic; margin-top: 16px; line-height: 1.4; color: #444; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="header-box">
        <div>
          <div class="org-title">EMS Platform / Складской комплекс</div>
          <div style="font-size: 10px; color: #555;">Система управления запасами предприятия</div>
        </div>
        <div style="text-align: right; font-size: 11px;">Форма: <strong>Бланк пересчета ТМЦ (ИНВ)</strong></div>
      </div>
      <div class="doc-title">ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ ТМЦ (БЛАНК ПЕРЕСЧЕТА)</div>
      <div class="doc-subtitle">к Акту инвентаризации № <strong>${actCode}</strong> от ${formatDateTime(inventory.createdAt)}</div>
      <div class="meta-grid">
        <div class="meta-item"><strong>Склад:</strong> ${inventory.warehouse.name} (${inventory.warehouse.code})</div>
        <div class="meta-item"><strong>МОЛ / Ответственный:</strong> ${molName}</div>
        <div class="meta-item"><strong>Инициатор описи:</strong> ${inventory.createdBy.displayName}</div>
        <div class="meta-item"><strong>Основание:</strong> ${inventory.comment || 'Плановая сплошная инвентаризация'}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 25px;">№</th>
            <th style="width: 75px;">Артикул</th>
            <th>Наименование ТМЦ / Запасной части</th>
            <th style="width: 90px;">Категория</th>
            <th style="width: 45px;">Ед.</th>
            <th style="width: 70px;">Ячейка</th>
            <th style="width: 60px;">Учет (остаток)</th>
            <th style="width: 75px; background-color: #e2e8f0;">ФАКТ (вручную)</th>
            <th style="width: 90px;">Подпись / Прим.</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="receipt-text">
        Все ТМЦ, поименованные в настоящей инвентаризационной описи, комиссией проверены в натуре в моем присутствии и внесены в опись, в связи с чем претензий к инвентаризационной комиссии не имею.
      </div>
      <div class="signatures">
        <div class="sig-row">
          <div>Материально ответственное лицо: <span class="sig-line"></span> / <strong>${molName}</strong></div>
          <div>Дата: «____» ____________ 2026 г.</div>
        </div>
        <div class="sig-row">
          <div>Председатель комиссии: <span class="sig-line"></span> / ______________</div>
          <div>Члены комиссии: <span class="sig-line"></span> / ______________</div>
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return true;
}
