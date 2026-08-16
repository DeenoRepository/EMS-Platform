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
  CircularProgress,
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
          >
            Обновить данные
          </Button>
        }
      />

      {isLoading && !stats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Предупреждение о дефиците ТМЦ */}
          {stats && stats.lowStockCount > 0 && (
            <Alert
              severity="warning"
              icon={<WarningAmberOutlinedIcon fontSize="inherit" />}
              sx={{ mb: 3, borderRadius: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => router.push('/wms/stock?lowStockOnly=true')}
                  endIcon={<ArrowForwardIcon />}
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

          {/* KPI Карточки */}
          <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Склады предприятия
                    </Typography>
                    <WarehouseOutlinedIcon color="primary" />
                  </Box>
                  <Typography variant="h4" fontWeight={800}>
                    {stats?.warehousesCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Активных складских комплексов
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Справочник номенклатуры
                    </Typography>
                    <Inventory2OutlinedIcon sx={{ color: '#0288d1' }} />
                  </Box>
                  <Typography variant="h4" fontWeight={800}>
                    {stats?.nomenclatureCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Уникальных позиций ТМЦ
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: (stats?.lowStockCount || 0) > 0 ? 'warning.main' : 'divider',
                  bgcolor: (stats?.lowStockCount || 0) > 0 ? 'warning.light' : 'background.paper',
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Минимальный остаток
                    </Typography>
                    <WarningAmberOutlinedIcon color="warning" />
                  </Box>
                  <Typography variant="h4" fontWeight={800} color={stats?.lowStockCount ? 'warning.dark' : 'text.primary'}>
                    {stats?.lowStockCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Позиций требуют пополнения
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Инвентаризации
                    </Typography>
                    <FactCheckOutlinedIcon sx={{ color: '#7b1fa2' }} />
                  </Box>
                  <Typography variant="h4" fontWeight={800}>
                    {stats?.activeInventoriesCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Актов в процессе сверки
                  </Typography>
                </CardContent>
              </Card>
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
                    >
                      Все остатки
                    </Button>
                  </Box>

                  {stats && stats.lowStockItems.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                      <Table size="small">
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
                                <Chip label={item.warehouseCode} size="small" variant="outlined" />
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                                {item.quantity} {item.unit}
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                                {item.minStock} {item.unit}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        Все складские позиции находятся в пределах нормативных остатков
                      </Typography>
                    </Box>
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
                    >
                      Журнал операций
                    </Button>
                  </Box>

                  {stats && stats.recentOperations.length > 0 ? (
                    <Stack spacing={1.5}>
                      {stats.recentOperations.map((op) => {
                        const typeInfo = OPERATION_TYPE_MAP[op.type] || { label: op.type, color: 'default' };
                        return (
                          <Paper
                            key={op.id}
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Box sx={{ minWidth: 0, pr: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Chip
                                  label={typeInfo.label}
                                  size="small"
                                  color={typeInfo.color as any}
                                  sx={{ fontWeight: 700 }}
                                />
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
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">Операции ещё не проводились</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
