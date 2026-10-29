'use client';

import React from 'react';
import { Box, Typography, Button, Stack, Paper } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { QrCodeView } from '@/components/ui';
import { StockDetailData } from '../StockDetailDrawer';

const LABEL_CARD_WIDTH = 220;
const QR_BOX_SIZE = 120;
const QR_IMAGE_SIZE = 110;
const FONT_WEIGHT_BOLD = 700;
const FONT_WEIGHT_SEMI = 600;

interface StockLabelTabProps {
  stockItem: StockDetailData;
  onPrintLabel?: (item: StockDetailData) => void;
}

function StockLabelCard({ stockItem }: { stockItem: StockDetailData }) {
  const qrValue = stockItem.article || stockItem.nomenclatureId || stockItem.id;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        width: LABEL_CARD_WIDTH,
        borderRadius: '8px',
        border: '2px dashed',
        borderColor: 'divider',
        textAlign: 'center',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_BOLD, color: 'text.primary', display: 'block', mb: 1 }}>
        EMS WMS LABEL
      </Typography>
      <Box
        sx={{
          width: QR_BOX_SIZE,
          height: QR_BOX_SIZE,
          mx: 'auto',
          mb: 1.5,
          bgcolor: 'common.white',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <QrCodeView value={qrValue} size={QR_IMAGE_SIZE} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT_BOLD, fontSize: '0.8125rem', color: 'text.primary' }} noWrap>
        {stockItem.name}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
        {stockItem.article || 'SKU-NONE'}
      </Typography>
      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: FONT_WEIGHT_SEMI, display: 'block', mt: 0.5 }}>
        {stockItem.cellCode ? `Ячейка: ${stockItem.cellCode}` : `Склад: ${stockItem.warehouseCode}`}
      </Typography>
    </Paper>
  );
}

export function StockLabelTab({ stockItem, onPrintLabel }: StockLabelTabProps) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ pt: 2 }}>
      <StockLabelCard stockItem={stockItem} />

      <Button
        variant="contained"
        startIcon={<PrintIcon />}
        onClick={() => onPrintLabel && onPrintLabel(stockItem)}
        sx={{
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: FONT_WEIGHT_SEMI,
          bgcolor: 'primary.main',
          px: 4,
        }}
      >
        Распечатать наклейку
      </Button>
    </Stack>
  );
}

