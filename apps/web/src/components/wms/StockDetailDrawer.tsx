'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Stack,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import HistoryIcon from '@mui/icons-material/History';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { StockOverviewTab } from './drawer/StockOverviewTab';
import { StockEquipmentTab } from './drawer/StockEquipmentTab';
import { StockOperationsHistoryTab } from './drawer/StockOperationsHistoryTab';
import { StockLabelTab } from './drawer/StockLabelTab';

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
          borderBottom: '1px solid',
          borderColor: 'divider',
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
              <Box
                sx={{
                  display: 'inline-block',
                  px: 0.75,
                  py: 0.1,
                  borderRadius: '4px',
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  fontWeight: 600,
                  fontSize: '0.6875rem',
                  color: 'text.secondary',
                }}
              >
                {stockItem.article ? `Арт: ${stockItem.article}` : 'Без артикула'}
              </Box>
              <Box
                sx={{
                  display: 'inline-block',
                  px: 0.75,
                  py: 0.1,
                  borderRadius: '4px',
                  bgcolor: 'action.hover',
                  fontWeight: 500,
                  fontSize: '0.6875rem',
                  color: 'text.secondary',
                }}
              >
                {stockItem.category || 'Без категории'}
              </Box>
            </Stack>
          </Box>
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {canEditNomenclature && onEdit && (
            <Tooltip title="Редактировать параметры ТМЦ">
              <IconButton
                size="small"
                onClick={() => onEdit(stockItem)}
                sx={{ color: 'primary.main', bgcolor: 'action.hover' }}
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
          borderBottom: '1px solid',
          borderColor: 'divider',
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
          <StockOverviewTab
            stockItem={stockItem}
            canEditLocation={canEditLocation}
            onChangeLocation={onChangeLocation}
            onPrintLabel={onPrintLabel}
          />
        )}


        {/* TAB 1: Совместимое оборудование */}
        {tabIndex === 1 && <StockEquipmentTab stockItem={stockItem} />}

        {/* TAB 2: История движения ТМЦ */}
        {tabIndex === 2 && (
          <StockOperationsHistoryTab
            operations={operations}
            isLoading={isLoadingOps}
            stockItem={stockItem}
          />
        )}

        {/* TAB 3: QR-этикетка */}
        {tabIndex === 3 && <StockLabelTab stockItem={stockItem} onPrintLabel={onPrintLabel} />}
      </Box>
    </Drawer>
  );
}
