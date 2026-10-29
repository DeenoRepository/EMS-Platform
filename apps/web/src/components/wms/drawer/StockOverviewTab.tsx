'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  Grid,
  Tooltip,
} from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PrintIcon from '@mui/icons-material/Print';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import { useRouter } from 'next/navigation';
import { StockDetailData } from '../StockDetailDrawer';

interface StockOverviewTabProps {
  stockItem: StockDetailData;
  canEditLocation: boolean;
  onChangeLocation?: (item: StockDetailData) => void;
  onPrintLabel?: (item: StockDetailData) => void;
}

export function StockOverviewTab({
  stockItem,
  canEditLocation,
  onChangeLocation,
  onPrintLabel,
}: StockOverviewTabProps) {
  const router = useRouter();

  const minStockNum = Number(stockItem.minStock) || 0;
  const currentTotalStock = stockItem.totalStock !== undefined ? stockItem.totalStock : stockItem.quantity;
  const inTransitQty = stockItem.inTransitIn || 0;
  const effectiveTotalStock =
    stockItem.totalEffectiveStock !== undefined
      ? stockItem.totalEffectiveStock
      : currentTotalStock + inTransitQty;
  const fillPercent = minStockNum > 0 ? Math.min((currentTotalStock / minStockNum) * 100, 100) : 100;
  const effectivePercent = minStockNum > 0 ? Math.min((effectiveTotalStock / minStockNum) * 100, 100) : 100;
  const isCritical = stockItem.isLowStock;
  const isReplenishing = Boolean(stockItem.isReplenishing);

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={1.5}>
        <Grid item xs={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
              Текущий остаток
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: isCritical ? 'error.main' : 'text.primary',
                fontFeatureSettings: '"tnum"',
                mt: 0.5,
              }}
            >
              {stockItem.quantity}{' '}
              <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {stockItem.unit}
              </Box>
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
              Неснижаемый порог
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'text.secondary',
                fontFeatureSettings: '"tnum"',
                mt: 0.5,
              }}
            >
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
              {isReplenishing
                ? `Обеспеченность с учётом транзита (${effectivePercent.toFixed(0)}%)`
                : 'Обеспеченность запасом'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: isReplenishing ? 'primary.main' : isCritical ? 'error.main' : 'success.main',
              }}
            >
              {isReplenishing ? `${fillPercent.toFixed(0)}% факт + ${inTransitQty} в пути` : `${fillPercent.toFixed(0)}%`}
            </Typography>
          </Box>
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'divider', overflow: 'hidden', position: 'relative' }}>
            {isReplenishing && (
              <Box
                sx={{
                  width: `${effectivePercent}%`,
                  height: '100%',
                  bgcolor: 'primary.light',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                }}
              />
            )}
            <Box
              sx={{
                width: `${fillPercent}%`,
                height: '100%',
                bgcolor: isReplenishing ? 'primary.main' : isCritical ? 'error.main' : 'success.main',
                transition: 'width 0.4s ease',
                position: 'relative',
              }}
            />
          </Box>
        </Box>
      )}

      {((stockItem.inTransitIn && stockItem.inTransitIn > 0) ||
        (stockItem.inTransitOut && stockItem.inTransitOut > 0)) && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'primary.light',
            bgcolor: 'action.hover',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SwapHorizIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700} color="primary.main">
              Позиции в пути (Межскладской транзит)
            </Typography>
          </Box>
          {Boolean(stockItem.inTransitIn && stockItem.inTransitIn > 0) && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                Ожидается поступление: <strong>+{stockItem.inTransitIn} {stockItem.unit}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ожидаемый баланс: <strong>{stockItem.expectedTotal} {stockItem.unit}</strong>
              </Typography>
            </Box>
          )}
          {Boolean(stockItem.inTransitOut && stockItem.inTransitOut > 0) && (
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              Отгружено со склада: <strong>-{stockItem.inTransitOut} {stockItem.unit}</strong>
            </Typography>
          )}
        </Paper>
      )}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
          Размещение на складе
        </Typography>

        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarehouseOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Склад:
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {stockItem.warehouseName} ({stockItem.warehouseCode})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Ячейка / Адрес:
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {stockItem.cellCode ? (
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    bgcolor: 'info.light',
                    color: 'info.dark',
                  }}
                >
                  {stockItem.zoneCode || ''} • {stockItem.cellCode}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                  Не назначена
                </Typography>
              )}
            </Box>
          </Box>
        </Stack>

        {onChangeLocation && (
          <Tooltip
            title={
              !canEditLocation
                ? 'Чужой склад: смена ячейки разрешена только назначенному МОЛ склада или администратору'
                : ''
            }
          >
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
                  ...(!canEditLocation && {
                    borderColor: 'divider',
                    color: 'text.disabled',
                  }),
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
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          Печать этикетки
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<SwapHorizIcon />}
          onClick={() => router.push(`/wms/operations?create=TRANSFER&nomenclatureId=${stockItem.nomenclatureId}`)}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Переместить
        </Button>
      </Stack>
    </Stack>
  );
}
