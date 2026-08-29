'use client';

import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  Tooltip,
} from '@mui/material';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import PrintIcon from '@mui/icons-material/Print';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import type { StockDetailData } from './StockDetailDrawer';

interface StockDetailOverviewTabProps {
  stockItem: StockDetailData;
  minStockNum: number;
  fillPercent: number;
  isCritical: boolean;
  canEditLocation: boolean;
  onChangeLocation?: (item: StockDetailData) => void;
  onPrintLabel?: (item: StockDetailData) => void;
  onTransfer: (nomenclatureId: string) => void;
}

export function StockDetailOverviewTab({
  stockItem,
  minStockNum,
  fillPercent,
  isCritical,
  canEditLocation,
  onChangeLocation,
  onPrintLabel,
  onTransfer,
}: StockDetailOverviewTabProps) {
  return (
    <Stack spacing={2.5}>
      <Grid container spacing={1.5}>
        <Grid item xs={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid divider', bgcolor: 'background.default' }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
              Текущий остаток
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: isCritical ? 'error.main' : 'text.primary', fontFeatureSettings: '"tnum"', mt: 0.5 }}>
              {stockItem.quantity}{' '}
              <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {stockItem.unit}
              </Box>
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid divider', bgcolor: 'background.default' }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
              Неснижаемый порог
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.secondary', fontFeatureSettings: '"tnum"', mt: 0.5 }}>
              {minStockNum > 0 ? minStockNum : '—'}{' '}
              <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {minStockNum > 0 ? stockItem.unit : ''}
              </Box>
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {minStockNum > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
              Обеспеченность запасом
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: isCritical ? 'error.main' : 'success.main' }}>
              {fillPercent.toFixed(0)}%
            </Typography>
          </Box>
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ width: `${fillPercent}%`, height: '100%', bgcolor: isCritical ? 'error.main' : 'success.main', transition: 'width 0.4s ease' }} />
          </Box>
        </Box>
      )}

      <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
          Размещение на складе
        </Typography>

        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarehouseOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Склад:</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {stockItem.warehouseName} ({stockItem.warehouseCode})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Ячейка / Адрес:</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {stockItem.cellCode ? (
                <Chip label={`${stockItem.zoneCode || ''} • ${stockItem.cellCode}`} size="small" sx={{ fontWeight: 700, bgcolor: 'info.light', color: 'info.dark', borderRadius: '6px' }} />
              ) : (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Не назначена</Typography>
              )}
            </Box>
          </Box>
        </Stack>

        {onChangeLocation && (
          <Tooltip title={!canEditLocation ? 'Чужой склад: смена ячейки разрешена только назначенному МОЛ склада или администратору' : ''}>
            <span>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                disabled={!canEditLocation}
                startIcon={<EditLocationAltIcon />}
                onClick={() => onChangeLocation(stockItem)}
                sx={{
                  mt: 2,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(!canEditLocation && { borderColor: 'divider', color: 'text.disabled' }),
                }}
              >
                {stockItem.cellCode ? 'Изменить ячейку хранения' : 'Назначить ячейку хранения'}
              </Button>
            </span>
          </Tooltip>
        )}
      </Paper>

      <Stack direction="row" spacing={1.5}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => onPrintLabel && onPrintLabel(stockItem)}
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          Печать этикетки
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<SwapHorizIcon />}
          onClick={() => onTransfer(stockItem.nomenclatureId)}
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
        >
          Переместить
        </Button>
      </Stack>
    </Stack>
  );
}

export default StockDetailOverviewTab;
