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
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { StockDetailOperationsTab } from './StockDetailOperationsTab';
import { StockDetailLabelTab } from './StockDetailLabelTab';
import { StockDetailEquipmentTab } from './StockDetailEquipmentTab';
import { StockDetailOverviewTab } from './StockDetailOverviewTab';

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
  const { enqueueSnackbar } = useSnackbar();
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
        .catch(() => {
          enqueueSnackbar('Не удалось загрузить историю операций', { variant: 'error' });
        })
        .finally(() => setIsLoadingOps(false));
    }
  }, [open, stockItem, enqueueSnackbar]);

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
        {tabIndex === 0 && (
          <StockDetailOverviewTab
            stockItem={stockItem}
            minStockNum={minStockNum}
            fillPercent={fillPercent}
            isCritical={isCritical}
            canEditLocation={canEditLocation}
            onChangeLocation={onChangeLocation}
            onPrintLabel={onPrintLabel}
            onTransfer={(nomenclatureId) => router.push(`/wms/operations?create=TRANSFER&nomenclatureId=${nomenclatureId}`)}
          />
        )}

        <StockDetailEquipmentTab
          activeTab={tabIndex}
          stockItem={stockItem}
          onOpenEquipment={(equipmentId) => router.push(`/equipment/${equipmentId}`)}
        />

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
