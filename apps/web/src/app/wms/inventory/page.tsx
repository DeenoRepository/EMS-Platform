'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Skeleton,
  Stack,
  IconButton,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, INVENTORY_STATUS_MAP, formatDateTime } from '@ems/shared';
import {
  StatCard,
  DataTableWrapper,
  EmptyState,
  StatusBadge,
} from '@/components/ui';

interface InventoryItemSummary {
  id: string;
  warehouseId: string;
  status: string;
  date: string;
  comment?: string | null;
  closedAt?: string | null;
  createdAt: string;
  warehouse: { name: string; code: string };
  createdBy: { displayName: string };
  _count: { items: number };
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

export default function WmsInventoryListPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuth();

  const [inventories, setInventories] = useState<InventoryItemSummary[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Inventory Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/wms/inventories');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setInventories(json.data);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки инвентаризаций:', err);
      enqueueSnackbar('Ошибка загрузки актов инвентаризации', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchInventories();
    async function loadWarehouses() {
      try {
        const res = await fetch('/api/wms/warehouses');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setWarehouses(json.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки складов:', err);
      }
    }
    loadWarehouses();
  }, [fetchInventories]);

  const handleCreateInventory = async () => {
    if (!selectedWarehouseId) {
      enqueueSnackbar('Выберите склад для проведения инвентаризации', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wms/inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          comment: comment.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Акт инвентаризации создан', { variant: 'success' });
        setIsModalOpen(false);
        router.push(`/wms/inventory/${json.data.id}`);
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания акта', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при создании инвентаризации', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalInventories = inventories.length;
  const inProgressCount = inventories.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'DRAFT').length;
  const completedCount = inventories.filter((i) => i.status === 'COMPLETED').length;

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto', pb: 4 }}>
      <PageHeader
        title="Инвентаризация складов"
        subtitle="Сверка фактического наличия ТМЦ с учетными остатками и автоматическая корректировка"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Инвентаризация' },
        ]}
        actions={
          hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedWarehouseId(warehouses[0]?.id || '');
                setComment('');
                setIsModalOpen(true);
              }}
            >
              Новая инвентаризация
            </Button>
          )
        }
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Всего актов"
            value={totalInventories}
            subtitle="За все периоды учета"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="В процессе сверки"
            value={inProgressCount}
            subtitle="Открытые акты инвентаризации"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Завершенные акты"
            value={completedCount}
            subtitle="Успешно сверенные и закрытые"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {/* Main Inventory Acts Registry Table */}
      {inventories.length === 0 && !isLoading ? (
        <EmptyState
          paper
          icon={<FactCheckOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="Акты инвентаризации ещё не создавались"
          description="Вы можете инициировать сверку фактических складских остатков по выбранному складу с автоматическим расчетом расхождений."
          actionText={hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE) ? 'Создать акт инвентаризации' : undefined}
          onAction={
            hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE)
              ? () => {
                  setSelectedWarehouseId(warehouses[0]?.id || '');
                  setComment('');
                  setIsModalOpen(true);
                }
              : undefined
          }
        />
      ) : (
        <DataTableWrapper
          loading={isLoading}
          total={inventories.length}
          stickyHeader
        >
          <Table size="small" aria-label="Реестр актов инвентаризации">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Номер / Акт</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Склад</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130 }}>Статус</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Позиций в акте</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Дата создания</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ответственный</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>
                  Действия
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventories.map((inv) => (
                <TableRow
                  key={inv.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/wms/inventory/${inv.id}`)}
                >
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    INV-{inv.id.slice(-6).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {inv.warehouse.name}
                    </Typography>
                    <Chip label={inv.warehouse.code} size="small" variant="outlined" sx={{ mt: 0.2, borderRadius: '4px' }} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {inv._count.items} позиций
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                    {formatDateTime(inv.createdAt)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {inv.createdBy.displayName}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<ArrowForwardIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/wms/inventory/${inv.id}`);
                      }}
                    >
                      Открыть акт
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {/* Модальное окно запуска инвентаризации */}
      <Dialog open={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Создание акта инвентаризации</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              При создании акта система зафиксирует текущие учетные остатки по всем позициям выбранного склада.
            </Typography>

            <TextField
              select
              fullWidth
              required
              label="Склад для инвентаризации"
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
            >
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Основание / Примечание"
              placeholder="Плановая квартальная инвентаризация, приказ №..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleCreateInventory} disabled={isSubmitting}>
            {isSubmitting ? 'Создание...' : 'Начать инвентаризацию'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
