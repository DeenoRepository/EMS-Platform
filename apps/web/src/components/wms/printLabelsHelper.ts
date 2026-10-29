import { PrintableLabelItem } from './PrintBarcodeModal';
import { getQrDataUrl } from '@/components/ui';

export type LabelFormat = '58mm' | '80mm' | 'a4';

export const QR_SIZE_80MM = 180;
export const QR_SIZE_DEFAULT = 120;

export interface LabelWithQr extends PrintableLabelItem {
  qrDataUrl?: string;
}

export async function executeLabelPrintWindow(
  items: PrintableLabelItem[],
  labelFormat: LabelFormat,
  includeQr: boolean,
  includeLocation: boolean
): Promise<boolean> {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return false;
  }

  const qrSize = labelFormat === '80mm' ? QR_SIZE_80MM : QR_SIZE_DEFAULT;
  const itemsWithQr = await Promise.all(
    items.map(async (item) => {
      const qrVal = item.article || item.id;
      const qrDataUrl = includeQr ? await getQrDataUrl(qrVal, qrSize) : '';
      return { ...item, qrDataUrl };
    })
  );

  const htmlContent = generateBarcodeLabelsHtml(itemsWithQr, labelFormat, includeLocation);
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return true;
}

export function generateBarcodeLabelsHtml(
  items: LabelWithQr[],
  labelFormat: LabelFormat,
  includeLocation: boolean
): string {
  const isA4 = labelFormat === 'a4';
  const is80 = labelFormat === '80mm';

  const labelsHtml = items
    .map(
      (item) => `
    <div class="label-card">
      <div class="label-brand">EMS ENTERPRISE WMS</div>
      ${item.qrDataUrl ? `<img src="${item.qrDataUrl}" class="qr-img" alt="QR" />` : ''}
      <div class="label-name">${item.name}</div>
      <div class="label-sku">SKU: ${item.article || '—'}</div>
      ${
        includeLocation && (item.cellCode || item.warehouseCode)
          ? `
        <div class="label-location">
          ${item.cellCode ? `Ячейка: ${item.cellCode}` : `Склад: ${item.warehouseCode}`}
        </div>
      `
          : ''
      }
    </div>
  `
    )
    .join('');

  const pageSizeStyle = isA4 ? 'A4 portrait' : is80 ? '80mm 60mm' : '58mm 40mm';
  const pageMargin = isA4 ? '10mm' : '2mm';

  const cardStyle = isA4
    ? `
    .labels-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
    }
    .label-card {
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      padding: 4mm;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      page-break-inside: avoid;
      min-height: 32mm;
    }
    .qr-img { width: 26mm; height: 26mm; object-fit: contain; margin: 1mm 0; }
    .label-brand { font-size: 7px; font-weight: 800; letter-spacing: 0.5px; }
    .label-name { font-size: 9px; font-weight: 700; margin: 1mm 0; max-height: 8mm; overflow: hidden; line-height: 1.1; }
    .label-sku { font-size: 8px; color: #334155; }
    .label-location { font-size: 8px; font-weight: 700; color: #0284c7; margin-top: 1mm; }
  `
    : `
    .labels-container {
      display: block;
    }
    .label-card {
      width: ${is80 ? '74mm' : '54mm'};
      height: ${is80 ? '54mm' : '36mm'};
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      page-break-after: always;
    }
    .qr-img {
      width: ${is80 ? '28mm' : '20mm'};
      height: ${is80 ? '28mm' : '20mm'};
      object-fit: contain;
      margin: 1mm 0;
    }
    .label-brand { font-size: 7px; font-weight: 800; letter-spacing: 0.5px; }
    .label-name { font-size: 9px; font-weight: 700; margin: 1mm 0; max-height: 8mm; overflow: hidden; line-height: 1.1; }
    .label-sku { font-size: 8px; color: #334155; }
    .label-location { font-size: 8px; font-weight: 700; color: #0284c7; margin-top: 1mm; }
  `;

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8" />
      <title>Печать этикеток ТМЦ</title>
      <style>
        @page {
          size: ${pageSizeStyle};
          margin: ${pageMargin};
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #000000;
          background-color: #ffffff;
        }
        ${cardStyle}
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="labels-container">
        ${labelsHtml}
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;
}
