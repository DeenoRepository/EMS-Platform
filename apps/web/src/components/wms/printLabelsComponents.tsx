import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { QrCodeView } from '@/components/ui';
import { PrintableLabelItem } from './PrintBarcodeModal';

export type LabelFormat = '58mm' | '80mm' | 'a4';

export interface LabelWithQr extends PrintableLabelItem {
  qrDataUrl?: string;
}

export const QR_SIZE_80MM = 180;
export const QR_SIZE_DEFAULT = 120;
export const PREVIEW_QR_80MM = 84;
export const PREVIEW_QR_DEFAULT = 64;
export const FONT_WEIGHT_BOLD = 700;
export const FONT_WEIGHT_SEMI = 600;
export const FONT_WEIGHT_EXTRA = 800;
export const PAPER_WIDTH_80MM = 260;
export const PAPER_WIDTH_DEFAULT = 200;
export const DEFAULT_PREVIEW_SKU = 'SKU-ITEM-DEFAULT';

function PreviewQrBox({
  includeQr,
  value,
  qrBoxSize,
}: {
  includeQr: boolean;
  value: string;
  qrBoxSize: number;
}) {
  if (includeQr) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1, minHeight: qrBoxSize }}>
        <QrCodeView value={value} size={qrBoxSize} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1, minHeight: qrBoxSize }}>
      <Box
        sx={{
          width: qrBoxSize,
          height: qrBoxSize,
          border: '1px dashed #cbd5e1',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary" fontSize="0.6rem">
          Без QR
        </Typography>
      </Box>
    </Box>
  );
}

function PreviewTextContent({
  name,
  sku,
  cellCode,
  warehouseCode,
  includeLocation,
}: {
  name: string;
  sku: string;
  cellCode?: string | null;
  warehouseCode?: string;
  includeLocation: boolean;
}) {
  return (
    <>
      <Typography
        variant="body2"
        sx={{
          fontWeight: FONT_WEIGHT_BOLD,
          fontSize: '0.75rem',
          lineHeight: 1.2,
          color: 'text.primary',
          mb: 0.5,
        }}
        noWrap
      >
        {name}
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: FONT_WEIGHT_SEMI, display: 'block', fontSize: '0.6875rem' }}>
        SKU: {sku}
      </Typography>

      {includeLocation && (
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: FONT_WEIGHT_BOLD, display: 'block', mt: 0.5, fontSize: '0.6875rem' }}>
          {cellCode ? `Ячейка: ${cellCode}` : warehouseCode ? `Склад: ${warehouseCode}` : 'Склад: WH-MAIN'}
        </Typography>
      )}
    </>
  );
}

export function BarcodeLivePreview({
  previewItem,
  labelFormat,
  includeQr,
  includeLocation,
}: {
  previewItem: PrintableLabelItem | null;
  labelFormat: LabelFormat;
  includeQr: boolean;
  includeLocation: boolean;
}) {
  const qrBoxSize = labelFormat === '80mm' ? PREVIEW_QR_80MM : PREVIEW_QR_DEFAULT;
  const paperWidth = labelFormat === '80mm' ? PAPER_WIDTH_80MM : PAPER_WIDTH_DEFAULT;
  const qrValue = previewItem?.article || previewItem?.id || DEFAULT_PREVIEW_SKU;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, bgcolor: 'grey.100', borderRadius: '10px' }}>
      <Paper
        elevation={2}
        sx={{
          p: 2,
          width: paperWidth,
          borderRadius: '6px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_EXTRA, color: 'text.primary', letterSpacing: 1, fontSize: '0.625rem' }}>
          EMS ENTERPRISE WMS
        </Typography>

        <PreviewQrBox includeQr={includeQr} value={qrValue} qrBoxSize={qrBoxSize} />

        <PreviewTextContent
          name={previewItem?.name || 'Наименование позиции ТМЦ'}
          sku={qrValue}
          cellCode={previewItem?.cellCode}
          warehouseCode={previewItem?.warehouseCode}
          includeLocation={includeLocation}
        />
      </Paper>
    </Box>
  );
}

