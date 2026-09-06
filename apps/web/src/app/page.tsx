'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Paper,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SpeedIcon from '@mui/icons-material/Speed';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import {
  StatCard,
  StatusBadge,
  CriticalAlertBanner,
  PageLoading,
  HealthScoreGauge,
  EmptyState,
  ErrorBoundary,
} from '@/components/ui';
import { WmsOperationWizardDialog } from '@/components/wms';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, formatDate } from '@ems/shared';

interface DashboardStats {
  scope?: 'ENTERPRISE' | 'PERSONAL';
  canToggleScope?: boolean;
  user?: {
    userId: string;
    displayName: string;
    ldapLogin: string;
    roles: string[];
  };
  eps: {
    total: number;
    active: number;
    underRepair: number;
    inStorage: number;
    decommissioned: number;
  };
  wms: {
    accessible?: boolean;
    warehousesCount: number;
    nomenclatureCount: number;
    lowStockCount: number;
    activeInventoriesCount: number;
    lowStockItems: Array<{
      id: string;
      name: string;
      warehouseCode: string;
      quantity: number;
      minStock: number;
      unit: string;
    }>;
  };
  srm: {
    openIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
    totalIssues: number;
    recentIssues: Array<{
      id: string;
      key: string;
      title: string;
      status: string;
      priority: string;
      createdAt: string;
      equipment?: { name: string; inventoryNumber: string | null } | null;
    }>;
  };
  mro: {
    overdueCount: number;
    plannedCount: number;
    completedCount: number;
    totalCount: number;
    nextSchedules: Array<{
      id: string;
      equipmentName: string;
      title: string;
      scheduledDate: string;
      periodicity: string;
      status: string;
    }>;
  };
  approvals: {
    pending: number;
    toReview?: number;
    myPending?: number;
  };
}

const DEFAULT_STATS: DashboardStats = {
  scope: 'ENTERPRISE',
  canToggleScope: false,
  eps: { total: 0, active: 0, underRepair: 0, inStorage: 0, decommissioned: 0 },
  wms: { accessible: true, warehousesCount: 0, nomenclatureCount: 0, lowStockCount: 0, activeInventoriesCount: 0, lowStockItems: [] },
  srm: { openIssues: 0, inProgressIssues: 0, resolvedIssues: 0, totalIssues: 0, recentIssues: [] },
  mro: { overdueCount: 0, plannedCount: 0, completedCount: 0, totalCount: 0, nextSchedules: [] },
  approvals: { pending: 0, toReview: 0, myPending: 0 },
};

function ExecutiveDashboardContent() {
  const router = useRouter();
  const { user: authUser, hasPermission } = useAuth();

  const [selectedScope, setSelectedScope] = useState<'enterprise' | 'personal'>('enterprise');
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Wizards State
  const [isWmsWizardOpen, setIsWmsWizardOpen] = useState(false);

  const fetchDashboardData = useCallback(async (scopeOverride?: string) => {
    try {
      const scopeToQuery = scopeOverride || selectedScope;
      const res = await fetch(`/api/dashboard/stats?scope=${scopeToQuery}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
          if (json.data.scope) {
            setSelectedScope(json.data.scope.toLowerCase() as any);
          }
        }
      }
    } catch {
      // keep default
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, [selectedScope]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleScopeChange = (_: any, newScope: 'enterprise' | 'personal' | null) => {
    if (newScope && newScope !== selectedScope) {
      setSelectedScope(newScope);
      setRefreshing(true);
      fetchDashboardData(newScope);
    }
  };

  if (loading && !hasLoadedOnce) {
    return <PageLoading text="Загрузка панели управления EMS-Platform..." />;
  }

  const isPersonalScope = stats.scope === 'PERSONAL';

  // Calculate Operational Readiness Score (KTG / Availability)
  const totalEquip = stats?.eps.total || 0;
  const activeEquip = stats?.eps.active || 0;
  const availabilityRate = totalEquip > 0 ? Math.round((activeEquip / totalEquip) * 100) : 100;

  // Critical alerts summary
  const criticalAlerts: any[] = [];
  if (stats?.eps.underRepair && stats.eps.underRepair > 0) {
    criticalAlerts.push({
      id: 'eps-repair',
      severity: 'CRITICAL',
      title: `${stats.eps.underRepair} ед. оборудования в неисправном состоянии (в ремонте)`,
      description: isPersonalScope
        ? 'В вашей зоне ответственности оборудование требует завершения ремонтных работ.'
        : 'Требуется контроль проведения ремонтных работ и восстановления работоспособности.',
      count: stats.eps.underRepair,
      actionLabel: 'К ремонту',
      onAction: () => router.push('/eps?status=UNDER_REPAIR'),
    });
  }
  if (stats?.wms.accessible !== false && stats?.wms.lowStockCount && stats.wms.lowStockCount > 0) {
    criticalAlerts.push({
      id: 'wms-deficit',
      severity: 'CRITICAL',
      title: `${stats.wms.lowStockCount} позиций ТМЦ ниже неснижаемого остатка (дефицит)`,
      description: isPersonalScope
        ? 'Критический дефицит расходных материалов и ЗИП на ваших ответственных складах.'
        : 'Критический дефицит расходных материалов и ЗИП на складах предприятия.',
      count: stats.wms.lowStockCount,
      actionLabel: 'К остаткам',
      onAction: () => router.push('/wms/stock'),
    });
  }
  if (stats?.approvals.pending && stats.approvals.pending > 0) {
    const toReview = stats.approvals.toReview || 0;
    criticalAlerts.push({
      id: 'eps-approvals',
      severity: 'WARNING',
      title: toReview > 0
        ? `${toReview} заявок требует вашего утверждения`
        : `${stats.approvals.pending} заявок ожидает утверждения`,
      description: 'Заявки на ввод, изменение статуса или списание оборудования в очереди согласования.',
      count: stats.approvals.pending,
      actionLabel: 'Согласовать',
      onAction: () => router.push('/eps/approvals'),
    });
  }

  const hasCriticalRepairs = (stats?.eps.underRepair || 0) > 0;
  const hasDeficit = stats.wms.accessible !== false && (stats?.wms.lowStockCount || 0) > 0;
  const hasPendingApprovals = (stats?.approvals.pending || 0) > 0;

  const currentDisplayName = stats.user?.displayName || authUser?.displayName || 'Сотрудник';

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* 1. Header with Role & Scope Controls */}
      <PageHeader
        title="Панель управления"
        subtitle={
          isPersonalScope
            ? `Персональная зона ответственности сотрудника: ${currentDisplayName}`
            : 'Сводный обзор показателей оборудования, складских запасов и регламентов ТО предприятия'
        }
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Панель управления' }]}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            {stats.canToggleScope && (
              <Box
                sx={{
                  bgcolor: '#f1f5f9',
                  p: '3px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <ToggleButtonGroup
                  value={selectedScope}
                  exclusive
                  onChange={handleScopeChange}
                  size="small"
                  sx={{
                    '& .MuiToggleButtonGroup-grouped': {
                      border: 'none !important',
                      borderRadius: '8px !important',
                      mx: '2px',
                    },
                    '& .MuiToggleButton-root': {
                      px: 1.5,
                      py: 0.5,
                      height: 30,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      color: '#64748b',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.6)',
                        color: '#0f172a',
                      },
                      '&.Mui-selected': {
                        bgcolor: '#ffffff',
                        color: '#0284c7',
                        fontWeight: 700,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
                        '&:hover': {
                          bgcolor: '#ffffff',
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="enterprise">
                    <BusinessIcon sx={{ fontSize: 16, mr: 0.75 }} />
                    Все предприятие
                  </ToggleButton>
                  <ToggleButton value="personal">
                    <PersonIcon sx={{ fontSize: 16, mr: 0.75 }} />
                    Моя зона
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            <Button
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              startIcon={<RefreshIcon className={refreshing ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
              sx={{
                height: 38,
                px: 2,
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '10px',
                borderColor: '#cbd5e1',
                bgcolor: '#ffffff',
                color: '#334155',
                textTransform: 'none',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  borderColor: '#94a3b8',
                  bgcolor: '#f8fafc',
                },
              }}
            >
              Обновить данные
            </Button>
          </Stack>
        }
      />

      {/* 2. Critical Alert Banner if anomalies detected */}
      {criticalAlerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <CriticalAlertBanner alerts={criticalAlerts} />
        </Box>
      )}

      {/* 3. Hero KPI Grid (4 Cross-Platform Modules) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* EPS */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={isPersonalScope ? 'Мое оборудование (EPS)' : 'Парк оборудования (EPS)'}
            value={stats?.eps.total || 0}
            subtitle={`${stats?.eps.active || 0} в работе • ${stats?.eps.underRepair || 0} в ремонте`}
            icon={<BadgeOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            onClick={() => router.push('/eps')}
            trend={{
              value: `${availabilityRate}% готовность`,
              direction: availabilityRate >= 85 ? 'up' : 'down',
              label: 'КТГ зоны',
            }}
          />
        </Grid>

        {/* WMS */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={isPersonalScope ? 'Ответственные склады (WMS)' : 'Складской учёт (WMS)'}
            value={stats?.wms.accessible !== false ? stats?.wms.nomenclatureCount || 0 : '—'}
            subtitle={
              stats?.wms.accessible !== false
                ? `${stats?.wms.warehousesCount || 0} складов • ${stats?.wms.lowStockCount || 0} дефицит ТМЦ`
                : 'Нет закрепленных складов'
            }
            icon={<WarehouseOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#0f766e"
            iconBgColor="rgba(15, 118, 110, 0.08)"
            accentColor={hasDeficit ? '#ef4444' : undefined}
            onClick={() => router.push('/wms/stock')}
          />
        </Grid>

        {/* Approvals */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={isPersonalScope ? 'Мои согласования' : 'Очередь согласований (EPS)'}
            value={stats?.approvals.pending || 0}
            subtitle={stats?.approvals.toReview ? `${stats.approvals.toReview} на моем рассмотрении` : 'В очереди утверждения'}
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#7c3aed"
            iconBgColor="rgba(124, 58, 237, 0.08)"
            accentColor={hasPendingApprovals ? '#7c3aed' : undefined}
            onClick={() => router.push('/eps/approvals')}
          />
        </Grid>

        {/* Warehouses & Inventories */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Инвентаризации и учет (WMS)"
            value={stats?.wms.activeInventoriesCount || 0}
            subtitle={`${stats?.wms.warehousesCount || 0} складов • ${stats?.wms.nomenclatureCount || 0} номенклатур`}
            icon={<WarehouseOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#d97706"
            iconBgColor="rgba(217, 119, 6, 0.08)"
            onClick={() => router.push('/wms/inventory')}
          />
        </Grid>
      </Grid>

      {/* 4. Quick Actions Row */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '12px',
          bgcolor: '#ffffff',
          borderColor: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              bgcolor: 'rgba(2, 132, 199, 0.08)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SpeedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
              Быстрые действия
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Оперативное создание документов, заявок и перемещений в вашей зоне
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: { xs: 1, sm: 0 } }}>
          {hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => router.push('/eps/new')}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
            >
              Добавить оборудование
            </Button>
          )}

          {hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MoveToInboxIcon />}
              onClick={() => setIsWmsWizardOpen(true)}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none', color: '#0f766e', borderColor: '#99f6e4' }}
            >
              Складская операция
            </Button>
          )}

          {hasPermission(PERMISSIONS.EPS_APPROVALS_VIEW) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<FactCheckOutlinedIcon />}
              onClick={() => router.push('/eps/approvals')}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none', color: '#7c3aed', borderColor: '#ddd6fe' }}
            >
              Согласования
            </Button>
          )}
        </Stack>
      </Paper>

      {/* 5. Main Operational Split (Left 7 Cols, Right 5 Cols) */}
      <Grid container spacing={3}>
        {/* Left Column: EPS Operational Status & Approvals */}
        <Grid item xs={12} lg={7}>
          <Stack spacing={3}>
            {/* EPS Approvals Queue Card */}
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <FactCheckOutlinedIcon sx={{ color: '#7c3aed', fontSize: 22 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                      {isPersonalScope ? 'Мои согласования оборудования' : 'Очередь согласований оборудования (EPS)'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => router.push('/eps/approvals')}
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    Все заявки ({stats?.approvals.pending || 0})
                  </Button>
                </Box>

                {(!stats?.approvals.pending || stats.approvals.pending === 0) ? (
                  <EmptyState
                    title="Очередь согласований пуста"
                    description="Все заявки на ввод в эксплуатацию, изменение параметров и списание оборудования рассмотрены."
                    minHeight={160}
                  />
                ) : (
                  <Box sx={{ p: 2, bgcolor: '#faf5ff', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#6b21a8" gutterBottom>
                      Требуется внимание ответственных лиц:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      В очереди находится <strong>{stats.approvals.pending}</strong> заявок на изменение статуса и жизненного цикла оборудования.
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => router.push('/eps/approvals')}
                      sx={{ mt: 2, textTransform: 'none', bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                    >
                      Перейти к утверждению
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* EPS Fleet Distribution Card */}
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <BadgeOutlinedIcon sx={{ color: '#0284c7', fontSize: 22 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                      Статус парка оборудования (EPS)
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => router.push('/eps')}
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    Реестр ({stats?.eps.total || 0})
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '8px' }}>
                      <Typography variant="h6" fontWeight={800} color="#15803d">
                        {stats?.eps.active || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        В работе
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '8px' }}>
                      <Typography variant="h6" fontWeight={800} color={stats?.eps.underRepair ? '#dc2626' : '#64748b'}>
                        {stats?.eps.underRepair || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        В ремонте
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '8px' }}>
                      <Typography variant="h6" fontWeight={800} color="#d97706">
                        {stats?.eps.inStorage || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        На консервации
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '8px' }}>
                      <Typography variant="h6" fontWeight={800} color="#64748b">
                        {stats?.eps.decommissioned || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Списано
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: Readiness Score & WMS Critical Deficit */}
        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            {/* Equipment Readiness & Health Gauge */}
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ mb: 0.5, textAlign: 'left' }}>
                  {isPersonalScope ? 'КТГ в зоне ответственности' : 'Коэффициент технической готовности (КТГ)'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'left' }}>
                  {isPersonalScope
                    ? 'Доля исправного оборудования в вашей зоне ответственности'
                    : 'Доля исправного оборудования, готового к бесперебойной эксплуатации'}
                </Typography>

                <Box sx={{ py: 1 }}>
                  <HealthScoreGauge score={availabilityRate} size="md" paper={false} title="" />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: '8px' }}>
                      <Typography variant="h6" fontWeight={800} color="#15803d">
                        {stats?.eps.active || 0}
                      </Typography>
                      <Typography variant="caption" color="#166534" fontWeight={600}>
                        В работе (Исправно)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ p: 1, bgcolor: stats?.eps.underRepair ? '#fef2f2' : '#f8fafc', borderRadius: '8px' }}>
                      <Typography variant="h6" fontWeight={800} color={stats?.eps.underRepair ? '#dc2626' : '#64748b'}>
                        {stats?.eps.underRepair || 0}
                      </Typography>
                      <Typography variant="caption" color={stats?.eps.underRepair ? '#991b1b' : '#64748b'} fontWeight={600}>
                        В ремонте / Отказ
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* WMS Critical Stock Deficit (if accessible) */}
            {stats.wms.accessible !== false && (
              <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <WarehouseOutlinedIcon sx={{ color: '#0f766e', fontSize: 22 }} />
                      <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                        {isPersonalScope ? 'Дефицит ТМЦ (мои склады)' : 'Критический дефицит ТМЦ (WMS)'}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => router.push('/wms/stock')}
                      sx={{ fontWeight: 600, textTransform: 'none' }}
                    >
                      Остатки ({stats?.wms.lowStockCount || 0})
                    </Button>
                  </Box>

                  {stats?.wms.lowStockItems.length === 0 ? (
                    <EmptyState
                      title="Дефицит ТМЦ отсутствует"
                      description={isPersonalScope ? 'На ваших складах все остатки в пределах нормы.' : 'Все складские позиции превышают уровень неснижаемого запаса.'}
                      minHeight={140}
                    />
                  ) : (
                    <Stack spacing={1.25}>
                      {stats?.wms.lowStockItems.map((item) => (
                        <Paper
                          key={item.id}
                          variant="outlined"
                          onClick={() => router.push('/wms/stock')}
                          sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            borderColor: '#fee2e2',
                            bgcolor: '#fff5f5',
                            transition: 'all 0.15s ease',
                            '&:hover': { bgcolor: '#fee2e2' },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle2" fontWeight={700} color="#991b1b" noWrap>
                                {item.name}
                              </Typography>
                              <Typography variant="caption" color="#b91c1c">
                                Склад: <strong>{item.warehouseCode}</strong>
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" fontWeight={800} color="#dc2626">
                                {item.quantity} {item.unit}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Мин: {item.minStock} {item.unit}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* WMS Quick Wizard */}
      <WmsOperationWizardDialog
        open={isWmsWizardOpen}
        initialType="RECEIPT"
        onClose={() => setIsWmsWizardOpen(false)}
        onSuccess={() => {
          setIsWmsWizardOpen(false);
          handleRefresh();
        }}
      />
    </Box>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <ExecutiveDashboardContent />
    </ErrorBoundary>
  );
}
