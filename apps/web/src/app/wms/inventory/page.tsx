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

  return (
    <Box sx={{ pb: 4 }}>
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

      <Card sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table size="small" aria-label="Реестр актов инвентаризации">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Номер / Акт</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Склад</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Статус</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Позиций в акте</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Дата создания</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ответственный</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Действия
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton variant="text" width={90} /></TableCell>
                    <TableCell><Skeleton variant="text" width={130} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={80} height={20} /></TableCell>
                    <TableCell><Skeleton variant="text" width={70} /></TableCell>
                    <TableCell><Skeleton variant="text" width={110} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell align="right"><Skeleton variant="rounded" width={90} height={24} sx={{ ml: 'auto' }} /></TableCell>
                  </TableRow>
                ))
              ) : inventories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Акты инвентаризации ещё не создавались
                  </TableCell>
                </TableRow>
              ) : (
                inventories.map((inv) => {
                  const statusInfo = INVENTORY_STATUS_MAP[inv.status] || { label: inv.status, color: 'default' };
                  return (
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
                        <Chip label={inv.warehouse.code} size="small" variant="outlined" sx={{ mt: 0.2 }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          color={statusInfo.color as any}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {inv._count.items} позиций
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDateTime(inv.createdAt)}</TableCell>
                      <TableCell>{inv.createdBy.displayName}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

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
