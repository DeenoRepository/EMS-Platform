'use client';

import React from 'react';
import { Box, Typography, Button, Stack, Paper } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { StockDetailData } from '../StockDetailDrawer';

interface StockLabelTabProps {
  stockItem: StockDetailData;
  onPrintLabel?: (item: StockDetailData) => void;
}

export function StockLabelTab({ stockItem, onPrintLabel }: StockLabelTabProps) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ pt: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          width: 220,
          borderRadius: '8px',
          border: '2px dashed',
          borderColor: 'divider',
          textAlign: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', display: 'block', mb: 1 }}>
          EMS WMS LABEL
        </Typography>
        <Box
          sx={{
            width: 120,
            height: 120,
            mx: 'auto',
            mb: 1.5,
            bgcolor: 'grey.100',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QrCode2Icon sx={{ fontSize: 96, color: 'text.primary' }} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'text.primary' }} noWrap>
          {stockItem.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
          {stockItem.article || 'SKU-NONE'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block', mt: 0.5 }}>
          {stockItem.cellCode ? `Ячейка: ${stockItem.cellCode}` : `Склад: ${stockItem.warehouseCode}`}
        </Typography>
      </Paper>

      <Button
        variant="contained"
        startIcon={<PrintIcon />}
        onClick={() => onPrintLabel && onPrintLabel(stockItem)}
        sx={{
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          bgcolor: 'primary.main',
          px: 4,
        }}
      >
        Распечатать наклейку
      </Button>
    </Stack>
  );
}
