'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Stack,
  Chip,
  Button,
  Divider,
  Paper,
  Grid,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import HistoryIcon from '@mui/icons-material/History';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PrintIcon from '@mui/icons-material/Print';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDateTime, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { StockDetailOperationsTab } from './StockDetailOperationsTab';
import { StockDetailLabelTab } from './StockDetailLabelTab';

export interface StockDetailData {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  warehouseResponsibleUserId?: string | null;
  nomenclatureId: string;
  name: string;
  article: string;
  description?: string | null;
  unit: string;
  category: string;
  categoryId?: string | null;
  quantity: number;
  minStock: number | string;
  isLowStock: boolean;
  cellId?: string | null;
  cellCode?: string | null;
  cellName?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
  zoneCode?: string | null;
  compatibleEquipmentCount: number;
  compatibleEquipment: Array<{ id: string; name: string; inventoryNumber: string }>;
  updatedAt: string;
}

interface StockDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  stockItem: StockDetailData | null;
  onChangeLocation?: (item: StockDetailData) => void;
  onPrintLabel?: (item: StockDetailData) => void;
  onEdit?: (item: StockDetailData) => void;
}

export default function StockDetailDrawer({
  open,
  onClose,
  stockItem,
  onChangeLocation,
  onPrintLabel,
  onEdit,
}: StockDetailDrawerProps) {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  const [operations, setOperations] = useState<any[]>([]);
  const [isLoadingOps, setIsLoadingOps] = useState(false);

  const canEditLocation = Boolean(
    stockItem &&
    hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && (
      user?.roles?.includes('admin') ||
      hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE) ||
      (Boolean(user?.userId) && stockItem.warehouseResponsibleUserId === user?.userId)
    )
  );

  const canEditNomenclature = Boolean(
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) ||
    hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE)
  );

  useEffect(() => {
    if (open && stockItem) {
      setTabIndex(0);
      // Fetch operations history for this nomenclature on this warehouse
      setIsLoadingOps(true);
      fetch(`/api/wms/operations?nomenclatureId=${stockItem.nomenclatureId}&warehouseId=${stockItem.warehouseId}&limit=10`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setOperations(json.data.items || json.data || []);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingOps(false));
    }
  }, [open, stockItem]);

  if (!stockItem) return null;

  const minStockNum = Number(stockItem.minStock) || 0;
  const fillPercent = minStockNum > 0 ? Math.min((stockItem.quantity / minStockNum) * 100, 100) : 100;
  const isCritical = minStockNum > 0 && stockItem.quantity < minStockNum;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 540 },
          bgcolor: 'background.paper',
          boxShadow: '-8px 0 24px -4px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header Banner */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid divider',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              bgcolor: isCritical ? 'rgba(239, 68, 68, 0.1)' : 'rgba(2, 132, 199, 0.1)',
              color: isCritical ? 'error.main' : 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Inventory2OutlinedIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }} noWrap>
              {stockItem.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip
                label={stockItem.article ? `Арт: ${stockItem.article}` : 'Без артикула'}
                size="small"
                sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'divider' }}
              />
              <Chip
                label={stockItem.category || 'Без категории'}
                size="small"
                sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 500, bgcolor: 'grey.100' }}
              />
            </Stack>
          </Box>
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {canEditNomenclature && onEdit && (
            <Tooltip title="Редактировать параметры ТМЦ">
              <IconButton
                size="small"
                onClick={() => onEdit(stockItem)}
                sx={{ color: 'primary.main', bgcolor: 'rgba(2, 132, 199, 0.08)' }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.disabled' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Tabs Bar */}
      <Tabs
        value={tabIndex}
        onChange={(_, val) => setTabIndex(val)}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid divider',
          minHeight: 44,
          '& .MuiTab-root': {
            minHeight: 44,
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'none',
            py: 1,
          },
        }}
      >
        <Tab icon={<Inventory2OutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Остаток" />
        <Tab icon={<PrecisionManufacturingIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Оборудование (${stockItem.compatibleEquipmentCount})`} />
        <Tab icon={<HistoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Движение" />
        <Tab icon={<QrCode2Icon sx={{ fontSize: 16 }} />} iconPosition="start" label="Этикетка" />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ p: 2.5, flexGrow: 1, overflowY: 'auto' }}>
        {/* TAB 0: Общие сведения и остаток */}
        {tabIndex === 0 && (
          <Stack spacing={2.5}>
            {/* KPI Cards */}
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    border: '1px solid divider',
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
                    {stockItem.quantity} <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{stockItem.unit}</Box>
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    border: '1px solid divider',
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
                    {minStockNum > 0 ? minStockNum : '—'} <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{minStockNum > 0 ? stockItem.unit : ''}</Box>
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Min Stock Progress Bar */}
            {minStockNum > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                    Обеспеченность запасом
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: isCritical ? 'error.main' : 'success.main' }}
                  >
                    {fillPercent.toFixed(0)}%
                  </Typography>
                </Box>
                <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'divider', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: `${fillPercent}%`,
                      height: '100%',
                      bgcolor: isCritical ? 'error.main' : 'success.main',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Location & Warehouse Info */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '10px',
                border: '1px solid divider',
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
                      <Chip
                        label={`${stockItem.zoneCode || ''} • ${stockItem.cellCode}`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: 'info.light',
                          color: 'info.dark',
                          borderRadius: '6px',
                        }}
                      />
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

            {/* Quick Action Buttons */}
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
        )}

        {/* TAB 1: Совместимое оборудование */}
        {tabIndex === 1 && (
          <Stack spacing={1.5}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Оборудование и технологические линии, где устанавливается данная деталь:
            </Typography>

            {stockItem.compatibleEquipment.length === 0 ? (
              <EmptyState
                icon={<PrecisionManufacturingIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
                title="Оборудование не привязано"
                description="В каталоге ТМЦ нет привязки к конкретному оборудованию"
                minHeight={160}
              />
            ) : (
              stockItem.compatibleEquipment.map((eq) => (
                <Paper
                  key={eq.id}
                  elevation={0}
                  onClick={() => router.push(`/equipment/${eq.id}`)}
                  sx={{
                    p: 1.75,
                    borderRadius: '8px',
                    border: '1px solid divider',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'background.default',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {eq.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      Инв. №: <strong>{eq.inventoryNumber}</strong>
                    </Typography>
                  </Box>

                  <StatusBadge status="PASSPORT" size="small" />
                </Paper>
              ))
            )}
          </Stack>
        )}

        <StockDetailOperationsTab
          activeTab={tabIndex}
          operations={operations}
          loading={isLoadingOps}
          unit={stockItem.unit}
        />

        <StockDetailLabelTab
          activeTab={tabIndex}
          stockItem={stockItem}
          onPrintLabel={onPrintLabel}
        />
      </Box>
    </Drawer>
  );
}
