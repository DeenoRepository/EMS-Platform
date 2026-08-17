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
  TextField,
  Stack,
  Alert,
  AlertTitle,
  Divider,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, INVENTORY_STATUS_MAP, formatDateTime } from '@ems/shared';
import {
  StatCard,
  StatusBadge,
  DataTableWrapper,
  ConfirmDialog,
  PageLoading,
  CriticalAlertBanner,
} from '@/components/ui';

interface InventoryDetail {
  id: string;
  warehouseId: string;
  status: string;
  comment?: string | null;
  closedAt?: string | null;
  createdAt: string;
  warehouse: { id: string; name: string; code: string };
  createdBy: { displayName: string; ldapLogin: string };
  items: Array<{
    id: string;
    expectedQty: number;
    actualQty: number | null;
    diffQty: number | null;
    comment?: string | null;
    nomenclature: {
      id: string;
      name: string;
      article?: string | null;
      unit: string;
      category?: { name: string } | null;
    };
  }>;
}

export default function WmsInventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuth();

  const [inventory, setInventory] = useState<InventoryDetail | null>(null);
  const [itemsState, setItemsState] = useState<
    Array<{ id: string; actualQty: number; comment: string; expectedQty: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmCompleteOpen, setIsConfirmCompleteOpen] = useState(false);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/wms/inventories/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setInventory(json.data);
          setItemsState(
            json.data.items.map((i: any) => ({
              id: i.id,
              actualQty: i.actualQty !== null ? Number(i.actualQty) : Number(i.expectedQty),
              expectedQty: Number(i.expectedQty),
              comment: i.comment || '',
            }))
          );
        }
      } else {
        enqueueSnackbar('Акт инвентаризации не найден', { variant: 'error' });
      }
    } catch (err) {
      console.error('Ошибка загрузки данных инвентаризации:', err);
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleActualQtyChange = (itemId: string, val: string) => {
    const num = parseFloat(val);
    setItemsState((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, actualQty: isNaN(num) ? 0 : num } : i))
    );
  };

  const handleCommentChange = (itemId: string, val: string) => {
    setItemsState((prev) => prev.map((i) => (i.id === itemId ? { ...i, comment: val } : i)));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/wms/inventories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsState.map((i) => ({
            id: i.id,
            actualQty: i.actualQty,
            comment: i.comment,
          })),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Данные инвентаризации сохранены', { variant: 'success' });
        fetchInventory();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения данных', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при сохранении', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteInventory = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/wms/inventories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          items: itemsState.map((i) => ({
            id: i.id,
            actualQty: i.actualQty,
            comment: i.comment,
          })),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(json.message || 'Инвентаризация успешно завершена', { variant: 'success' });
        setIsConfirmCompleteOpen(false);
        fetchInventory();
      } else {
        enqueueSnackbar(json.error || 'Ошибка завершения инвентаризации', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при завершении инвентаризации', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !inventory) {
    return <PageLoading text="Загрузка акта инвентаризации..." />;
  }

  if (!inventory) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Акт инвентаризации не найден</Alert>
      </Box>
    );
  }

  const isCompleted = inventory.status === 'COMPLETED';
  const statusInfo = INVENTORY_STATUS_MAP[inventory.status] || { label: inventory.status, color: 'default' };

  // Calculate live stats
  const totalItems = itemsState.length;
  const matchCount = itemsState.filter((i) => i.actualQty === i.expectedQty).length;
  const surplusCount = itemsState.filter((i) => i.actualQty > i.expectedQty).length;
  const deficitCount = itemsState.filter((i) => i.actualQty < i.expectedQty).length;

  return (
    <Box sx={{ pb: 6 }}>
      <PageHeader
        title={`Акт инвентаризации № INV-${inventory.id.slice(-6).toUpperCase()}`}
        subtitle={`Склад: ${inventory.warehouse.name} (${inventory.warehouse.code}) • Дата: ${formatDateTime(
          inventory.createdAt
        )}`}
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Инвентаризация', href: '/wms/inventory' },
          { label: `Акт INV-${inventory.id.slice(-6).toUpperCase()}` },
        ]}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/wms/inventory')}
            >
              К списку
            </Button>
            {!isCompleted && hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE) && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить факт'}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => setIsConfirmCompleteOpen(true)}
                  disabled={isSaving}
                >
                  Завершить инвентаризацию
                </Button>
              </>
            )}
          </Stack>
        }
      />

      {/* Статус и сводные карточки */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Статус акта"
            value={statusInfo.label}
            subtitle={`Ответственный: ${inventory.createdBy.displayName}`}
            icon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего позиций"
            value={totalItems}
            subtitle={`Совпадают: ${matchCount}`}
            icon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(15, 23, 42, 0.06)"
            iconColor="#475569"
            accentColor="#0284c7"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Выявлено излишков (+)"
            value={surplusCount}
            subtitle="Факт выше учетного"
            icon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Выявлено недостач (-)"
            value={deficitCount}
            subtitle="Факт ниже учетного"
            icon={<WarningAmberIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="#dc2626"
            accentColor="#dc2626"
          />
        </Grid>
      </Grid>

      {isCompleted && (
        <Box sx={{ mb: 3 }}>
          <CriticalAlertBanner
            alerts={[
              {
                id: 'inv-completed-alert',
                severity: 'INFO',
                title: 'Инвентаризация завершена',
                description: `Акт закрыт ${inventory.closedAt ? formatDateTime(inventory.closedAt) : ''}. Складские остатки скорректированы в соответствии с фактическими данными.`,
              },
            ]}
          />
        </Box>
      )}

      {/* Таблица инвентаризации */}
      <DataTableWrapper total={inventory.items.length} stickyHeader>
        <Table size="small" aria-label="Ведомость инвентаризации остатков">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>Артикул</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Наименование номенклатуры</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 160 }}>Категория</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: 140 }}>
                Учетный остаток
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: 180 }}>
                Фактический остаток
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: 160 }}>
                Расхождение (Дифф)
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Примечание / Причина</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.items.map((item) => {
              const state = itemsState.find((s) => s.id === item.id) || {
                actualQty: Number(item.expectedQty),
                expectedQty: Number(item.expectedQty),
                comment: '',
              };

              const diff = state.actualQty - state.expectedQty;

              return (
                <TableRow
                  key={item.id}
                  hover
                  sx={{
                    bgcolor:
                      diff > 0
                        ? 'rgba(46, 125, 50, 0.04)'
                        : diff < 0
                        ? 'rgba(211, 47, 47, 0.04)'
                        : undefined,
                  }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {item.nomenclature.article || '—'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.nomenclature.name}</TableCell>
                  <TableCell>{item.nomenclature.category?.name || '—'}</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={700}>
                      {item.expectedQty} {item.nomenclature.unit}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {isCompleted ? (
                      <Typography variant="body2" fontWeight={700}>
                        {item.actualQty} {item.nomenclature.unit}
                      </Typography>
                    ) : (
                      <TextField
                        type="number"
                        size="small"
                        value={state.actualQty}
                        onChange={(e) => handleActualQtyChange(item.id, e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <Typography variant="caption" color="text.secondary">
                              {item.nomenclature.unit}
                            </Typography>
                          ),
                        }}
                        sx={{ width: 130 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {diff === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        0
                      </Typography>
                    ) : diff > 0 ? (
                      <StatusBadge
                        status="SURPLUS"
                        label={`+${diff} ${item.nomenclature.unit}`}
                        size="small"
                      />
                    ) : (
                      <StatusBadge
                        status="DEFICIT"
                        label={`${diff} ${item.nomenclature.unit}`}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isCompleted ? (
                      <Typography variant="body2" color="text.secondary">
                        {item.comment || '—'}
                      </Typography>
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Причина расхождения..."
                        value={state.comment}
                        onChange={(e) => handleCommentChange(item.id, e.target.value)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Диалог подтверждения завершения инвентаризации */}
      <ConfirmDialog
        open={isConfirmCompleteOpen}
        title="Завершение инвентаризации и корректировка"
        message={
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Вы уверены, что хотите завершить инвентаризацию по складу <b>{inventory.warehouse.name}</b>?
            </Typography>
            <Alert severity="warning" icon={<WarningAmberIcon />}>
              По всем строкам с расхождениями ({surplusCount + deficitCount} поз.) будет автоматически сформирована
              складская операция <b>ADJUSTMENT (Корректировка)</b>, а остатки в базе данных приведены к фактическим значениям.
            </Alert>
          </Stack>
        }
        confirmText="Подтвердить и закрыть акт"
        variant="warning"
        loading={isSaving}
        onConfirm={handleCompleteInventory}
        onClose={() => setIsConfirmCompleteOpen(false)}
      />
    </Box>
  );
}
