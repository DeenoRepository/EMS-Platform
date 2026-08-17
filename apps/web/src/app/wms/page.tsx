'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  AlertTitle,
  Skeleton,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import { OPERATION_TYPE_MAP, formatDateTime } from '@ems/shared';
import { StatCard, StatusBadge, EmptyState, DataTableWrapper } from '@/components/ui';

interface WmsStats {
  warehousesCount: number;
  nomenclatureCount: number;
  stockItemsCount: number;
  lowStockCount: number;
  lowStockItems: Array<{
    id: string;
    name: string;
    warehouseName: string;
    warehouseCode: string;
    quantity: number;
    minStock: number;
    unit: string;
  }>;
  activeInventoriesCount: number;
  recentOperations: Array<{
    id: string;
    type: string;
    date: string;
    warehouse: { name: string; code: string };
    createdBy: { displayName: string };
    items: Array<{
      id: string;
      nomenclature: { name: string; unit: string };
      quantity: number;
      equipment?: { name: string; inventoryNumber: string } | null;
    }>;
  }>;
}

export default function WmsDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<WmsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/wms/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки статистики WMS:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Складской учёт (WMS)"
        subtitle="Сводный мониторинг остатков, дефицита ТМЦ, прихода, списания на оборудование и инвентаризаций"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Складской учёт' }]}
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchStats}
            disabled={isLoading}
            size="small"
            aria-label="Обновить аналитику склада"
            sx={{ fontWeight: 600, borderRadius: '8px' }}
          >
            Обновить данные
          </Button>
        }
      />

      {/* Предупреждение о дефиците ТМЦ */}
      {stats && stats.lowStockCount > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberOutlinedIcon fontSize="inherit" />}
          sx={{ mb: 3, borderRadius: '10px', border: '1px solid #fde68a' }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => router.push('/wms/stock?lowStockOnly=true')}
              endIcon={<ArrowForwardIcon />}
              aria-label="Перейти к дефицитным позициям"
              sx={{ fontWeight: 700 }}
            >
              Смотреть все ({stats.lowStockCount})
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 700 }}>
            Обнаружен дефицит ТМЦ по {stats.lowStockCount} позициям
          </AlertTitle>
          Текущий остаток некоторых номенклатурных позиций на складах упал ниже установленного минимального порога.
        </Alert>
      )}

      {/* KPI Карточки со StatCard */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Склады предприятия"
            value={stats?.warehousesCount ?? 0}
            subtitle="Активных складских комплексов"
            icon={<WarehouseOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            loading={isLoading && !stats}
            onClick={() => router.push('/wms/warehouses')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Справочник номенклатуры"
            value={stats?.nomenclatureCount ?? 0}
            subtitle="Уникальных позиций ТМЦ"
            icon={<Inventory2OutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(15, 118, 110, 0.08)"
            iconColor="#0f766e"
            accentColor="#0f766e"
            loading={isLoading && !stats}
            onClick={() => router.push('/wms/nomenclature')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Минимальный остаток"
            value={stats?.lowStockCount ?? 0}
            subtitle="Позиций требуют пополнения"
            icon={<WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor={stats && stats.lowStockCount > 0 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.08)'}
            iconColor={stats && stats.lowStockCount > 0 ? '#dc2626' : '#d97706'}
            accentColor={stats && stats.lowStockCount > 0 ? '#dc2626' : '#d97706'}
            loading={isLoading && !stats}
            onClick={() => router.push('/wms/stock?lowStockOnly=true')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Инвентаризации"
            value={stats?.activeInventoriesCount ?? 0}
            subtitle="Актов в процессе сверки"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(123, 31, 162, 0.08)"
            iconColor="#7b1fa2"
            accentColor="#7b1fa2"
            loading={isLoading && !stats}
            onClick={() => router.push('/wms/inventory')}
          />
        </Grid>
      </Grid>

      {/* Быстрые действия */}
      <Card sx={{ mb: 3.5, p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Быстрые действия
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<MoveToInboxIcon />}
              onClick={() => router.push('/wms/operations?action=RECEIPT')}
              sx={{ py: 1.2, fontWeight: 600 }}
              aria-label="Оформить приход ТМЦ"
            >
              Оформить приход ТМЦ
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="warning"
              startIcon={<OutboxIcon />}
              onClick={() => router.push('/wms/operations?action=ISSUE')}
              sx={{ py: 1.2, fontWeight: 600 }}
              aria-label="Списать на оборудование"
            >
              Списать на оборудование
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="info"
              startIcon={<SwapHorizIcon />}
              onClick={() => router.push('/wms/operations?action=TRANSFER')}
              sx={{ py: 1.2, fontWeight: 600 }}
              aria-label="Перемещение между складами"
            >
              Перемещение между складами
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              startIcon={<FactCheckOutlinedIcon />}
              onClick={() => router.push('/wms/inventory')}
              sx={{ py: 1.2, fontWeight: 600 }}
              aria-label="Инвентаризация склада"
            >
              Инвентаризация склада
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Сетка: Дефицит и Последние операции */}
      <Grid container spacing={3}>
        {/* Таблица дефицита */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Позиции с дефицитом остатка
                </Typography>
                <Button
                  size="small"
                  onClick={() => router.push('/wms/stock?lowStockOnly=true')}
                  endIcon={<ArrowForwardIcon />}
                  aria-label="Посмотреть все остатки номенклатуры"
                >
                  Все остатки
                </Button>
              </Box>

              {isLoading && !stats ? (
                <Stack spacing={1.5}>
                  <Skeleton variant="rounded" height={36} />
                  <Skeleton variant="rounded" height={36} />
                  <Skeleton variant="rounded" height={36} />
                </Stack>
              ) : stats && stats.lowStockItems.length > 0 ? (
                <DataTableWrapper total={stats.lowStockItems.length}>
                  <Table size="small" aria-label="Таблица дефицита ТМЦ">
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>ТМЦ / Запчасть</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Склад</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Факт
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Мин.
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.lowStockItems.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                          <TableCell>
                            <Chip label={item.warehouseCode} size="small" variant="outlined" sx={{ borderRadius: '4px' }} />
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'text.secondary', fontFeatureSettings: '"tnum"' }}>
                            {item.minStock} {item.unit}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DataTableWrapper>
              ) : (
                <EmptyState
                  icon={<Inventory2OutlinedIcon sx={{ fontSize: 32, color: '#16a34a' }} />}
                  title="Дефицит отсутствует"
                  description="Все складские позиции находятся в пределах нормативных остатков"
                  minHeight={160}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Последние операции */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Последние складские операции
                </Typography>
                <Button
                  size="small"
                  onClick={() => router.push('/wms/operations')}
                  endIcon={<ArrowForwardIcon />}
                  aria-label="Перейти в журнал операций"
                >
                  Журнал операций
                </Button>
              </Box>

              {isLoading && !stats ? (
                <Stack spacing={1.5}>
                  <Skeleton variant="rounded" height={64} />
                  <Skeleton variant="rounded" height={64} />
                  <Skeleton variant="rounded" height={64} />
                </Stack>
              ) : stats && stats.recentOperations.length > 0 ? (
                <Stack spacing={1.5}>
                  {stats.recentOperations.map((op) => {
                    const typeInfo = OPERATION_TYPE_MAP[op.type] || { label: op.type, color: 'default' };
                    return (
                      <Paper
                        key={op.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            bgcolor: '#f8fafc',
                            borderColor: '#cbd5e1',
                          },
                        }}
                      >
                        <Box sx={{ minWidth: 0, pr: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <StatusBadge status={op.type} />
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(op.date)} • Склад: {op.warehouse.name}
                            </Typography>
                          </Box>
                          <Typography variant="body2" noWrap fontWeight={500}>
                            {op.items.map((i) => `${i.nomenclature.name} (${i.quantity} ${i.nomenclature.unit})`).join(', ')}
                          </Typography>
                          {op.items.some((i) => i.equipment) && (
                            <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.2 }}>
                              Оборудование: {op.items.find((i) => i.equipment)?.equipment?.name} (
                              {op.items.find((i) => i.equipment)?.equipment?.inventoryNumber})
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                          {op.createdBy.displayName}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <EmptyState
                  icon={<SwapHorizIcon sx={{ fontSize: 32, color: '#94a3b8' }} />}
                  title="Операции не проводились"
                  description="В системе пока нет записей о движении ТМЦ"
                  minHeight={160}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
