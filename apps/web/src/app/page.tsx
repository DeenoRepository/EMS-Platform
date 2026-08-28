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
import { CreateServiceRequestDialog } from '@/components/srm';
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
  const [isSrmDialogOpen, setIsSrmDialogOpen] = useState(false);
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
  if (stats?.mro.overdueCount && stats.mro.overdueCount > 0) {
    criticalAlerts.push({
      id: 'mro-overdue',
      severity: 'WARNING',
      title: `${stats.mro.overdueCount} просроченных регламентов ТОиР`,
      description: isPersonalScope
        ? 'Превышен плановый срок выполнения ТО по оборудованию в вашей зоне ответственности.'
        : 'Превышен плановый срок выполнения планово-предупредительных ремонтов.',
      count: stats.mro.overdueCount,
      actionLabel: 'К графику ППР',
      onAction: () => router.push('/mro'),
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
  const hasOverdueMro = (stats?.mro.overdueCount || 0) > 0;
  const hasPendingApprovals = (stats?.approvals.pending || 0) > 0;
  const hasOpenIncidents = (stats?.srm.openIssues || 0) > 0;

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
                  bgcolor: 'action.hover',
                  p: '3px',
                  borderRadius: '10px',
                  border: '1px solid divider',
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
                      color: 'text.secondary',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.6)',
                        color: 'text.primary',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'background.paper',
                        color: 'primary.main',
                        fontWeight: 700,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
                        '&:hover': {
                          bgcolor: 'background.paper',
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
                borderColor: 'divider',
                bgcolor: 'background.paper',
                color: 'text.secondary',
                textTransform: 'none',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  borderColor: 'text.disabled',
                  bgcolor: 'background.default',
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
            iconColor="primary.main"
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
            iconColor="secondary.main"
            iconBgColor="rgba(15, 118, 110, 0.08)"
            accentColor={hasDeficit ? 'error.main' : undefined}
            onClick={() => router.push('/wms/stock')}
          />
        </Grid>

        {/* SRM */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={isPersonalScope ? 'Мои сервисные заявки (SRM)' : 'Сервисные заявки (SRM)'}
            value={stats?.srm.totalIssues || 0}
            subtitle={`${stats?.srm.openIssues || 0} открыто • ${stats?.srm.inProgressIssues || 0} в работе`}
            icon={<BugReportOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="warning.main"
            iconBgColor="rgba(217, 119, 6, 0.08)"
            accentColor={hasOpenIncidents ? 'warning.main' : undefined}
            onClick={() => router.push('/srm')}
          />
        </Grid>

        {/* MRO */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={isPersonalScope ? 'Мой график ТОиР (MRO)' : 'График ППР и ТО (MRO)'}
            value={stats?.mro.plannedCount || 0}
            subtitle={`${stats?.mro.overdueCount || 0} просрочено • ${stats?.mro.completedCount || 0} выполнено`}
            icon={<BuildOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="secondary.main"
            iconBgColor="rgba(124, 58, 237, 0.08)"
            accentColor={hasOverdueMro ? 'error.main' : undefined}
            onClick={() => router.push('/mro')}
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
          bgcolor: 'background.paper',
          borderColor: 'divider',
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
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SpeedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
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

          {hasPermission(PERMISSIONS.SRM_REQUESTS_CREATE) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<BugReportOutlinedIcon />}
              onClick={() => setIsSrmDialogOpen(true)}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none', color: 'warning.main', borderColor: 'warning.light' }}
            >
              Подать заявку
            </Button>
          )}

          {hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MoveToInboxIcon />}
              onClick={() => setIsWmsWizardOpen(true)}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none', color: 'secondary.main', borderColor: 'secondary.light' }}
            >
              Складская операция
            </Button>
          )}

          {hasPermission(PERMISSIONS.MRO_EXECUTION_COMPLETE) && (
            <Button
              variant="contained"
              size="small"
              startIcon={<BuildOutlinedIcon />}
              onClick={() => router.push('/mro')}
              sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none', bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
            >
              Провести ТО
            </Button>
          )}
        </Stack>
      </Paper>

      {/* 5. Main Operational Split (Left 7 Cols, Right 5 Cols) */}
      <Grid container spacing={3}>
        {/* Left Column: Recent SRM Incidents & Upcoming MRO Schedules */}
        <Grid item xs={12} lg={7}>
          <Stack spacing={3}>
            {/* SRM Recent Issues Feed */}
            <Card sx={{ borderRadius: '12px', border: '1px solid divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <BugReportOutlinedIcon sx={{ color: 'warning.main', fontSize: 22 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                      {isPersonalScope ? 'Мои обращения и инциденты (SRM)' : 'Оперативные инциденты и заявки (SRM)'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => router.push('/srm')}
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    Все заявки ({stats?.srm.totalIssues || 0})
                  </Button>
                </Box>

                {stats?.srm.recentIssues.length === 0 ? (
                  <EmptyState
                    title="Нет открытых инцидентов"
                    description={isPersonalScope ? 'В вашей зоне ответственности активных заявок нет.' : 'Все сервисные заявки и инциденты успешно закрыты.'}
                    minHeight={160}
                  />
                ) : (
                  <Stack spacing={1.5}>
                    {stats?.srm.recentIssues.map((issue) => (
                      <Paper
                        key={issue.id}
                        variant="outlined"
                        onClick={() => router.push('/srm')}
                        sx={{
                          p: 1.75,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          borderColor: 'action.hover',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: 'background.default', borderColor: 'divider' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Chip
                                label={issue.key}
                                size="small"
                                sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 800, bgcolor: 'action.hover', color: 'text.secondary' }}
                              />
                              <Typography variant="subtitle2" fontWeight={700} noWrap color="text.primary">
                                {issue.title}
                              </Typography>
                            </Box>
                            {issue.equipment && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Оборудование: <strong>{issue.equipment.name}</strong> ({issue.equipment.inventoryNumber || 'Б/Н'})
                              </Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                            <StatusBadge status={issue.priority} label={issue.priority} size="small" />
                            <StatusBadge status={issue.status} label={issue.status} size="small" />
                          </Stack>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* MRO Upcoming Maintenance Feed */}
            <Card sx={{ borderRadius: '12px', border: '1px solid divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <BuildOutlinedIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                      {isPersonalScope ? 'Мои ближайшие регламенты ТО (MRO)' : 'Ближайшие регламенты ТО и ППР (MRO)'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => router.push('/mro')}
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    График ППР ({stats?.mro.totalCount || 0})
                  </Button>
                </Box>

                {stats?.mro.nextSchedules.length === 0 ? (
                  <EmptyState
                    title="График ТО свободен"
                    description={isPersonalScope ? 'В вашей зоне ответственности нет запланированных ТО на ближайшее время.' : 'Все регламенты ТОиР выполнены в срок.'}
                    minHeight={160}
                  />
                ) : (
                  <Stack spacing={1.5}>
                    {stats?.mro.nextSchedules.map((schedule) => (
                      <Paper
                        key={schedule.id}
                        variant="outlined"
                        onClick={() => router.push('/mro')}
                        sx={{
                          p: 1.75,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          borderColor: 'action.hover',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: 'background.default', borderColor: 'divider' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap>
                              {schedule.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {schedule.equipmentName} • Срок: <strong>{formatDate(schedule.scheduledDate)}</strong>
                            </Typography>
                          </Box>
                          <StatusBadge status={schedule.status} label={schedule.status} size="small" />
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: Readiness Score & WMS Critical Deficit */}
        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            {/* Equipment Readiness & Health Gauge */}
            <Card sx={{ borderRadius: '12px', border: '1px solid divider' }}>
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mb: 0.5, textAlign: 'left' }}>
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
                    <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: '8px' }}>
                      <Typography variant="h6" fontWeight={800} color="success.dark">
                        {stats?.eps.active || 0}
                      </Typography>
                      <Typography variant="caption" color="success.dark" fontWeight={600}>
                        В работе (Исправно)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ p: 1, bgcolor: stats?.eps.underRepair ? 'error.light' : 'background.default', borderRadius: '8px' }}>
                      <Typography variant="h6" fontWeight={800} color={stats?.eps.underRepair ? 'error.main' : 'text.secondary'}>
                        {stats?.eps.underRepair || 0}
                      </Typography>
                      <Typography variant="caption" color={stats?.eps.underRepair ? 'error.dark' : 'text.secondary'} fontWeight={600}>
                        В ремонте / Отказ
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* WMS Critical Stock Deficit (if accessible) */}
            {stats.wms.accessible !== false && (
              <Card sx={{ borderRadius: '12px', border: '1px solid divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <WarehouseOutlinedIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
                      <Typography variant="subtitle1" fontWeight={700} color="text.primary">
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
                            borderColor: 'error.light',
                            bgcolor: 'error.light',
                            transition: 'all 0.15s ease',
                            '&:hover': { bgcolor: 'error.light' },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle2" fontWeight={700} color="error.dark" noWrap>
                                {item.name}
                              </Typography>
                              <Typography variant="caption" color="error.dark">
                                Склад: <strong>{item.warehouseCode}</strong>
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" fontWeight={800} color="error.main">
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

      {/* SRM Create Dialog */}
      <CreateServiceRequestDialog
        open={isSrmDialogOpen}
        onClose={() => setIsSrmDialogOpen(false)}
        onSuccess={() => {
          setIsSrmDialogOpen(false);
          handleRefresh();
        }}
      />

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
