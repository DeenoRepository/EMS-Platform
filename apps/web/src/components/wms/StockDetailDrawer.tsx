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
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDateTime, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export interface StockDetailData {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  warehouseResponsibleUserId?: string | null;
  nomenclatureId: string;
  name: string;
  article: string;
  unit: string;
  category: string;
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
}

export default function StockDetailDrawer({
  open,
  onClose,
  stockItem,
  onChangeLocation,
  onPrintLabel,
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
          bgcolor: '#ffffff',
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
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#f8fafc',
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
              color: isCritical ? '#ef4444' : '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Inventory2OutlinedIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }} noWrap>
              {stockItem.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip
                label={stockItem.article ? `Арт: ${stockItem.article}` : 'Без артикула'}
                size="small"
                sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600, bgcolor: '#e2e8f0' }}
              />
              <Chip
                label={stockItem.category || 'Без категории'}
                size="small"
                sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 500, bgcolor: '#f1f5f9' }}
              />
            </Stack>
          </Box>
        </Box>

        <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Tabs Bar */}
      <Tabs
        value={tabIndex}
        onChange={(_, val) => setTabIndex(val)}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid #e2e8f0',
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
        <Tab icon={<PrecisionManufacturingIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Станки (${stockItem.compatibleEquipmentCount})`} />
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
                    border: '1px solid #e2e8f0',
                    bgcolor: '#f8fafc',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Текущий остаток
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: isCritical ? '#dc2626' : '#0f172a',
                      fontFeatureSettings: '"tnum"',
                      mt: 0.5,
                    }}
                  >
                    {stockItem.quantity} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{stockItem.unit}</span>
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#f8fafc',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Неснижаемый порог
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: '#475569',
                      fontFeatureSettings: '"tnum"',
                      mt: 0.5,
                    }}
                  >
                    {minStockNum > 0 ? minStockNum : '—'} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{minStockNum > 0 ? stockItem.unit : ''}</span>
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Min Stock Progress Bar */}
            {minStockNum > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Обеспеченность запасом
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: isCritical ? '#dc2626' : '#16a34a' }}
                  >
                    {fillPercent.toFixed(0)}%
                  </Typography>
                </Box>
                <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: `${fillPercent}%`,
                      height: '100%',
                      bgcolor: isCritical ? '#ef4444' : '#22c55e',
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
                border: '1px solid #e2e8f0',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5 }}>
                Размещение на складе
              </Typography>

              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarehouseOutlinedIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                      Склад:
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                    {stockItem.warehouseName} ({stockItem.warehouseCode})
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnOutlinedIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    <Typography variant="body2" sx={{ color: '#475569' }}>
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
                          bgcolor: '#eff6ff',
                          color: '#1d4ed8',
                          borderRadius: '6px',
                        }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
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
                          borderColor: '#e2e8f0',
                          color: '#94a3b8',
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
                  bgcolor: '#0284c7',
                  '&:hover': { bgcolor: '#0369a1' },
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
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Станки и производственные линии, где устанавливается данная деталь:
            </Typography>

            {stockItem.compatibleEquipment.length === 0 ? (
              <EmptyState
                icon={<PrecisionManufacturingIcon sx={{ fontSize: 32, color: '#94a3b8' }} />}
                title="Оборудование не привязано"
                description="В каталоге ТМЦ нет привязки к конкретным станкам"
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
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': {
                      borderColor: '#0284c7',
                      bgcolor: '#f8fafc',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                      {eq.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Инв. №: <strong>{eq.inventoryNumber}</strong>
                    </Typography>
                  </Box>

                  <Chip label="Паспорт" size="small" sx={{ fontSize: '0.6875rem', height: 22 }} />
                </Paper>
              ))
            )}
          </Stack>
        )}

        {/* TAB 2: История движения ТМЦ */}
        {tabIndex === 2 && (
          <Box>
            {isLoadingOps ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : operations.length === 0 ? (
              <EmptyState
                icon={<HistoryIcon sx={{ fontSize: 32, color: '#94a3b8' }} />}
                title="История операций пуста"
                description="По данной позиции пока нет записей о движении на этом складе"
                minHeight={160}
              />
            ) : (
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Тип</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Дата</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Кол-во</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {operations.map((op) => (
                    <TableRow key={op.id} hover>
                      <TableCell sx={{ py: 1 }}>
                        <StatusBadge status={op.type} />
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: '0.75rem', color: '#64748b' }}>
                        {formatDateTime(op.date || op.createdAt)}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>
                        {op.items?.[0]?.quantity || '—'} {stockItem.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {/* TAB 3: QR-этикетка */}
        {tabIndex === 3 && (
          <Stack spacing={2} alignItems="center" sx={{ pt: 2 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                width: 220,
                borderRadius: '8px',
                border: '2px dashed #94a3b8',
                textAlign: 'center',
                bgcolor: '#ffffff',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', display: 'block', mb: 1 }}>
                EMS WMS LABEL
              </Typography>
              {/* QR Code Placeholder Graphic */}
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 1.5,
                  bgcolor: '#f1f5f9',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <QrCode2Icon sx={{ fontSize: 96, color: '#0f172a' }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }} noWrap>
                {stockItem.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                {stockItem.article || 'SKU-NONE'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 600, display: 'block', mt: 0.5 }}>
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
                bgcolor: '#0284c7',
                px: 4,
              }}
            >
              Распечатать наклейку
            </Button>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
