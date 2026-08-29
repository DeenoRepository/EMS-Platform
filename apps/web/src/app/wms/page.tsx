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
  TableHead,
  TableRow,
  Skeleton,
  Stack,
  Paper,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import { OPERATION_TYPE_MAP, formatDateTime, PERMISSIONS } from '@ems/shared';
import WmsDeficitItem from '@/components/wms/WmsDeficitItem';
import {
  StatCard,
  StatusBadge,
  EmptyState,
  DataTableWrapper,
  CriticalAlertBanner,
  ModuleMaintenanceState,
} from '@/components/ui';
import { WmsOperationWizardDialog, type OperationType } from '@/components/wms';
import { useAuth } from '@/lib/auth-client';
import { PlatformMaintenanceStatus } from '@ems/shared';


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



/* ─── WMS Dashboard Page ─── */
export default function WmsDashboardPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<WmsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<OperationType>('RECEIPT');
  const [maintStatus, setMaintStatus] = useState<PlatformMaintenanceStatus | null>(null);

  const handleOpenWizard = (type: OperationType = 'RECEIPT') => {
    setWizardType(type);
    setIsWizardOpen(true);
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [statsRes, maintRes] = await Promise.all([
        fetch('/api/wms/stats'),
        fetch('/api/system/maintenance'),
      ]);
      if (statsRes.ok) {
        const json = await statsRes.json();
        if (json.success) {
          setStats(json.data);
        }
      }
      if (maintRes.ok) {
        const maintJson = await maintRes.json();
        if (maintJson.success && maintJson.data) {
          setMaintStatus(maintJson.data);
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

  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('administrator');
  const isModuleInMaintenance = Boolean(maintStatus?.modules.wms?.enabled);

  if (isModuleInMaintenance && !isAdmin) {
    return (
      <ModuleMaintenanceState
        moduleName="Складской учёт (WMS)"
        message={maintStatus?.modules.wms.message}
        estimatedUntil={maintStatus?.modules.wms.estimatedUntil}
        onRefresh={fetchStats}
      />
    );
  }

  return (
    <Box sx={{ pb: 2 }}>
      {/* Admin Maintenance Preview Banner */}
      {isModuleInMaintenance && (
        <Alert
          severity="warning"
          sx={{
            mb: 2.5,
            borderRadius: '12px',
            border: '1px solid warning.light',
            backgroundColor: 'warning.light',
            fontWeight: 500,
          }}
        >
          <strong>Режим предпросмотра администратора:</strong> Модуль WMS переведен в режим технического обслуживания. Для обычных пользователей доступ временно закрыт.
        </Alert>
      )}

      <PageHeader
        title="Панель материальных потоков и остатков (WMS)"
        subtitle="Сводный баланс ТМЦ, мониторинг неснижаемых запасов, дефицитные позиции и статистика движения"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Складской учёт ТМЦ' }]}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchStats}
              disabled={isLoading}
              aria-label="Обновить аналитику склада"
              sx={{
                height: 36,
                px: 2,
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '8px',
                textTransform: 'none',
                borderColor: 'grey.400',
                color: 'text.secondary',
                '&:hover': { borderColor: 'text.disabled', bgcolor: 'background.default' },
              }}
            >
              Обновить
            </Button>
            {hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => handleOpenWizard('RECEIPT')}
                aria-label="Оформить операцию через мастер"
                sx={{
                  height: 36,
                  px: 2,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  textTransform: 'none',
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                Мастер операций
              </Button>
            )}
          </Stack>
        }

      />

      {/* Предупреждение о дефиците ТМЦ */}
      {stats && stats.lowStockCount > 0 && (
        <CriticalAlertBanner
          alerts={[
            {
              id: 'wms-low-stock-critical',
              severity: 'WARNING',
              title: `Обнаружен дефицит ТМЦ по ${stats.lowStockCount} позициям`,
              description: 'Текущий остаток некоторых номенклатурных позиций на складах упал ниже установленного неснижаемого порога.',
              actionLabel: `Показать дефицит (${stats.lowStockCount})`,
              onAction: () => router.push('/wms/stock?lowStockOnly=true'),
              count: stats.lowStockCount,
            },
          ]}
        />
      )}

      {/* KPI Карточки */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Склады предприятия"
            value={stats?.warehousesCount ?? 0}
            subtitle="Активных складских комплексов"
            icon={<WarehouseOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="primary.main"
            accentColor="primary.main"
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
            iconColor="secondary.main"
            accentColor="secondary.main"
            loading={isLoading && !stats}
            onClick={() => router.push('/wms/stock')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Минимальный остаток"
            value={stats?.lowStockCount ?? 0}
            subtitle="Позиций требуют пополнения"
            icon={<WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor={stats && stats.lowStockCount > 0 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.08)'}
            iconColor={stats && stats.lowStockCount > 0 ? 'error.main' : 'warning.main'}
            accentColor={stats && stats.lowStockCount > 0 ? 'error.main' : 'warning.main'}
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
            iconColor="secondary.dark"
            accentColor="secondary.dark"
            loading={isLoading && !stats}
            onClick={() => router.push('/wms/inventory')}
          />
        </Grid>
      </Grid>

      {/* Двухколоночный layout: Операции + Sidebar */}
      <Grid container spacing={2.5}>
        {/* ── Левая колонка: Последние операции ── */}
        <Grid item xs={12} lg={8}>
          <Card
            sx={{
              height: '100%',
              borderRadius: '12px',
              border: '1px solid divider',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: 'text.primary',
                      letterSpacing: '-0.015em',
                    }}
                  >
                    Последние складские операции
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
                    Движение ТМЦ за последний период
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => router.push('/wms/operations')}
                  endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                  aria-label="Перейти в журнал операций"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.06)' },
                  }}
                >
                  Журнал операций
                </Button>
              </Box>

              <Box sx={{ flex: 1 }}>
                {isLoading && !stats ? (
                  <Stack spacing={1}>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} variant="rounded" height={44} sx={{ borderRadius: '8px' }} />
                    ))}
                  </Stack>
                ) : stats && stats.recentOperations.length > 0 ? (
                  <DataTableWrapper total={stats.recentOperations.length}>
                    <Table size="small" aria-label="Таблица последних складских операций">
                      <TableHead sx={{ bgcolor: 'background.default' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>
                            Тип
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>
                            Дата
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>
                            Склад
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>
                            Номенклатура
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>
                            Кол-во
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>
                            Исполнитель
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.recentOperations.map((op) => {
                          const firstItem = op.items[0];
                          const otherCount = op.items.length - 1;
                          return (
                            <TableRow
                              key={op.id}
                              hover
                              sx={{
                                '&:hover': { bgcolor: 'background.default' },
                                '& td': { py: 1.25, borderColor: 'grey.100' },
                              }}
                            >
                              <TableCell>
                                <StatusBadge status={op.type} />
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFeatureSettings: '"tnum"',
                                    color: 'text.secondary',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {formatDateTime(op.date)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={op.warehouse.code}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    bgcolor: 'grey.100',
                                    color: 'text.secondary',
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    noWrap
                                    sx={{
                                      fontWeight: 500,
                                      fontSize: '0.8125rem',
                                      color: 'text.primary',
                                      maxWidth: 200,
                                    }}
                                  >
                                    {firstItem?.nomenclature.name || '—'}
                                  </Typography>
                                  {otherCount > 0 && (
                                    <Typography
                                      variant="caption"
                                      sx={{ color: 'text.disabled', fontSize: '0.6875rem' }}
                                    >
                                      и ещё {otherCount} поз.
                                    </Typography>
                                  )}
                                  {firstItem?.equipment && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        display: 'block',
                                        color: 'primary.main',
                                        fontSize: '0.6875rem',
                                        fontWeight: 500,
                                      }}
                                    >
                                      → {firstItem.equipment.name}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    fontFeatureSettings: '"tnum"',
                                    color: 'text.primary',
                                  }}
                                >
                                  {firstItem ? `${firstItem.quantity} ${firstItem.nomenclature.unit}` : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="caption"
                                  noWrap
                                  sx={{
                                    color: 'text.disabled',
                                    fontSize: '0.75rem',
                                    maxWidth: 120,
                                    display: 'block',
                                  }}
                                >
                                  {op.createdBy.displayName}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </DataTableWrapper>
                ) : (
                  <EmptyState
                    icon={<SwapHorizIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
                    title="Операции не проводились"
                    description="В системе пока нет записей о движении ТМЦ"
                    actionText="Оформить операцию"
                    actionIcon={<AutoAwesomeIcon />}
                    onAction={() => handleOpenWizard('RECEIPT')}
                    minHeight={260}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Правая колонка: Дефицит и быстрый доступ ── */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={2.5}>
            {/* Позиции с дефицитом */}
            <Card
              sx={{
                borderRadius: '12px',
                border: '1px solid divider',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: 'text.primary',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Позиции с дефицитом
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => router.push('/wms/stock?lowStockOnly=true')}
                    endIcon={<ArrowForwardIcon sx={{ fontSize: '13px !important' }} />}
                    aria-label="Посмотреть все остатки номенклатуры"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      borderRadius: '6px',
                      color: 'primary.main',
                      px: 1,
                      py: 0.25,
                      minWidth: 'auto',
                      '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.06)' },
                    }}
                  >
                    Все остатки
                  </Button>
                </Box>

                {isLoading && !stats ? (
                  <Stack spacing={1}>
                    <Skeleton variant="rounded" height={44} sx={{ borderRadius: '6px' }} />
                    <Skeleton variant="rounded" height={44} sx={{ borderRadius: '6px' }} />
                    <Skeleton variant="rounded" height={44} sx={{ borderRadius: '6px' }} />
                  </Stack>
                ) : stats && stats.lowStockItems.length > 0 ? (
                  <Box>
                    {stats.lowStockItems.slice(0, 5).map((item) => (
                      <WmsDeficitItem key={item.id} item={item} />
                    ))}
                    {stats.lowStockItems.length > 5 && (
                      <Button
                        fullWidth
                        size="small"
                        onClick={() => router.push('/wms/stock?lowStockOnly=true')}
                        sx={{
                          mt: 1.5,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          borderRadius: '8px',
                          color: 'primary.main',
                          bgcolor: 'rgba(2, 132, 199, 0.04)',
                          '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.08)' },
                        }}
                      >
                        Показать все ({stats.lowStockItems.length})
                      </Button>
                    )}
                  </Box>
                ) : (
                  <EmptyState
                    icon={<Inventory2OutlinedIcon sx={{ fontSize: 28, color: 'success.main' }} />}
                    title="Дефицит отсутствует"
                    description="Все позиции в пределах нормативных остатков"
                    minHeight={120}
                  />
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Пошаговый мастер складских операций */}
      <WmsOperationWizardDialog
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialType={wizardType}
        onSuccess={() => {
          fetchStats();
        }}
      />
    </Box>
  );
}

