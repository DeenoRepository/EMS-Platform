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
  inTransitIn?: number;
  inTransitOut?: number;
  globalInTransit?: number;
  expectedTotal?: number;
  transfersInTransit?: Array<{
    transferId: string;
    transferNumber: string;
    sourceWarehouseId: string;
    sourceWarehouseName: string;
    sourceWarehouseCode: string;
    targetWarehouseId: string;
    targetWarehouseName: string;
    targetWarehouseCode: string;
    quantity: number;
    dispatchedAt: string;
    direction: 'INCOMING' | 'OUTGOING';
  }>;
  totalStock?: number;
  totalEffectiveStock?: number;
  minStock: number | string;
  isLowStock: boolean;
  isReplenishing?: boolean;
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
      fetch(`/api/wms/operations?nomenclatureId=${stockItem.nomenclatureId}&warehouseId=${stockItem.warehouseId}&pageSize=10`)
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
  const currentTotalStock = stockItem.totalStock !== undefined ? stockItem.totalStock : stockItem.quantity;
  const inTransitQty = stockItem.inTransitIn || 0;
  const effectiveTotalStock = stockItem.totalEffectiveStock !== undefined ? stockItem.totalEffectiveStock : (currentTotalStock + inTransitQty);
  const fillPercent = minStockNum > 0 ? Math.min((currentTotalStock / minStockNum) * 100, 100) : 100;
  const effectivePercent = minStockNum > 0 ? Math.min((effectiveTotalStock / minStockNum) * 100, 100) : 100;
  const isCritical = stockItem.isLowStock;
  const isReplenishing = Boolean(stockItem.isReplenishing);

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
          borderBottom: '1px solid #e2e8f0',
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
              color: isCritical ? '#ef4444' : 'primary.main',
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
                    border: '1px solid #e2e8f0',
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
                    border: '1px solid #e2e8f0',
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
                  {/* Фоновая полоса с учетом груза в пути */}
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
                  {/* Основная полоса фактического остатка */}
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

            {/* In-Transit Alert Card (if any positions in transit) */}
            {((stockItem.inTransitIn && stockItem.inTransitIn > 0) || (stockItem.inTransitOut && stockItem.inTransitOut > 0)) && (
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
                      Ожидаемый баланс после приемки: <strong>{stockItem.expectedTotal} {stockItem.unit}</strong>
                    </Typography>
                  </Box>
                )}
                {Boolean(stockItem.inTransitOut && stockItem.inTransitOut > 0) && (
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    Отгружено с этого склада (в пути): <strong>-{stockItem.inTransitOut} {stockItem.unit}</strong>
                  </Typography>
                )}

                {stockItem.transfersInTransit && stockItem.transfersInTransit.length > 0 && (
                  <Stack spacing={0.5} sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                    {stockItem.transfersInTransit.map((t, idx) => (
                      <Typography key={idx} variant="caption" sx={{ color: 'text.primary', display: 'block' }}>
                        • <strong>{t.transferNumber}</strong>: {t.quantity} {stockItem.unit} ({t.direction === 'INCOMING' ? `из «${t.sourceWarehouseName}»` : `на склад «${t.targetWarehouseName}»`})
                      </Typography>
                    ))}
                  </Stack>
                )}
              </Paper>
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
                          bgcolor: '#eff6ff',
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
                    border: '1px solid #e2e8f0',
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

        {/* TAB 2: История движения ТМЦ */}
        {tabIndex === 2 && (
          <Box>
            {isLoadingOps ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : operations.length === 0 ? (
              <EmptyState
                icon={<HistoryIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
                title="История операций пуста"
                description="По данной позиции пока нет записей о движении на этом складе"
                minHeight={160}
              />
            ) : (
              <Table size="small">
                <TableHead sx={{ bgcolor: 'background.default' }}>
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
                      <TableCell sx={{ py: 1, fontSize: '0.75rem', color: 'text.disabled' }}>
                        {formatDateTime(op.date || op.createdAt)}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>
                        {op.items?.find((i: any) => i.nomenclatureId === stockItem.nomenclatureId)?.quantity ?? op.items?.[0]?.quantity ?? '—'} {stockItem.unit}
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
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', display: 'block', mb: 1 }}>
                EMS WMS LABEL
              </Typography>
              {/* QR Code Placeholder Graphic */}
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
        )}
      </Box>
    </Drawer>
  );
}
