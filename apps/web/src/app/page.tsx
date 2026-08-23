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
import {
  StatCard,
  StatusBadge,
  CriticalAlertBanner,
  PageLoading,
  HealthScoreGauge,
  EmptyState,
} from '@/components/ui';
import { EquipmentWizardDialog } from '@/components/eps';
import { CreateServiceRequestDialog } from '@/components/srm';
import { WmsOperationWizardDialog } from '@/components/wms';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, formatDate } from '@ems/shared';

interface DashboardStats {
  eps: {
    total: number;
    active: number;
    underRepair: number;
    inStorage: number;
    decommissioned: number;
  };
  wms: {
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
  };
}

export default function ExecutiveDashboardPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Wizards State
  const [isEqWizardOpen, setIsEqWizardOpen] = useState(false);
  const [isSrmDialogOpen, setIsSrmDialogOpen] = useState(false);
  const [isWmsWizardOpen, setIsWmsWizardOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [eqRes, wmsRes, srmRes, mroRes, appRes] = await Promise.allSettled([
        fetch('/api/eps/equipment?pageSize=1'),
        fetch('/api/wms/stats'),
        fetch('/api/srm/stats'),
        fetch('/api/mro/schedules'),
        fetch('/api/eps/approvals?pageSize=1'),
      ]);

      const newStats: DashboardStats = {
        eps: { total: 0, active: 0, underRepair: 0, inStorage: 0, decommissioned: 0 },
        wms: { warehousesCount: 0, nomenclatureCount: 0, lowStockCount: 0, activeInventoriesCount: 0, lowStockItems: [] },
        srm: { openIssues: 0, inProgressIssues: 0, resolvedIssues: 0, totalIssues: 0, recentIssues: [] },
        mro: { overdueCount: 0, plannedCount: 0, completedCount: 0, totalCount: 0, nextSchedules: [] },
        approvals: { pending: 0 },
      };

      if (eqRes.status === 'fulfilled' && eqRes.value.ok) {
        const json = await eqRes.value.json();
        if (json.success && json.data) {
          const sc = json.data.statusCounts || {};
          newStats.eps = {
            total: json.data.total || (sc.active || 0) + (sc.underRepair || 0) + (sc.inStorage || 0) + (sc.decommissioned || 0),
            active: sc.active || 0,
            underRepair: sc.underRepair || 0,
            inStorage: sc.inStorage || 0,
            decommissioned: sc.decommissioned || 0,
          };
        }
      }

      if (wmsRes.status === 'fulfilled' && wmsRes.value.ok) {
        const json = await wmsRes.value.json();
        if (json.success && json.data) {
          newStats.wms = {
            warehousesCount: json.data.warehousesCount || 0,
            nomenclatureCount: json.data.nomenclatureCount || 0,
            lowStockCount: json.data.lowStockCount || 0,
            activeInventoriesCount: json.data.activeInventoriesCount || 0,
            lowStockItems: (json.data.lowStockItems || []).slice(0, 4),
          };
        }
      }

      if (srmRes.status === 'fulfilled' && srmRes.value.ok) {
        const json = await srmRes.value.json();
        if (json.success && json.data) {
          newStats.srm = {
            openIssues: json.data.openIssues || 0,
            inProgressIssues: json.data.inProgressIssues || 0,
            resolvedIssues: json.data.resolvedIssues || 0,
            totalIssues: json.data.totalIssues || 0,
            recentIssues: (json.data.recentIssues || []).slice(0, 4),
          };
        }
      }

      if (mroRes.status === 'fulfilled' && mroRes.value.ok) {
        const json = await mroRes.value.json();
        if (json.success && Array.isArray(json.data)) {
          const now = new Date();
          const overdue = json.data.filter(
            (s: any) => s.status === 'MISSED' || (s.status === 'PLANNED' && new Date(s.scheduledDate) < now)
          ).length;
          const planned = json.data.filter(
            (s: any) => s.status === 'PLANNED' && new Date(s.scheduledDate) >= now
          ).length;
          const completed = json.data.filter((s: any) => s.status === 'COMPLETED').length;

          newStats.mro = {
            overdueCount: overdue,
            plannedCount: planned,
            completedCount: completed,
            totalCount: json.data.length,
            nextSchedules: json.data
              .filter((s: any) => s.status === 'PLANNED')
              .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
              .slice(0, 4),
          };
        }
      }

      if (appRes.status === 'fulfilled' && appRes.value.ok) {
        const json = await appRes.value.json();
        if (json.success && json.data?.stats) {
          newStats.approvals.pending = json.data.stats.pending || json.data.stats.toReview || 0;
        }
      }

      setStats(newStats);
    } catch {
      // keep previous
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !stats) {
    return <PageLoading text="Загрузка сводной панели EMS-Platform..." />;
  }

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
      description: 'Требуется контроль проведения ремонтных работ и восстановления работоспособности.',
      count: stats.eps.underRepair,
      actionLabel: 'К ремонту',
      onAction: () => router.push('/eps?status=UNDER_REPAIR'),
    });
  }
  if (stats?.wms.lowStockCount && stats.wms.lowStockCount > 0) {
    criticalAlerts.push({
      id: 'wms-deficit',
      severity: 'CRITICAL',
      title: `${stats.wms.lowStockCount} позиций ТМЦ ниже неснижаемого остатка (дефицит)`,
      description: 'Критический дефицит расходных материалов и ЗИП на складах предприятия.',
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
      description: 'Превышен плановый срок выполнения планово-предупредительных ремонтов.',
      count: stats.mro.overdueCount,
      actionLabel: 'К графику ППР',
      onAction: () => router.push('/mro'),
    });
  }
  if (stats?.approvals.pending && stats.approvals.pending > 0) {
    criticalAlerts.push({
      id: 'eps-approvals',
      severity: 'WARNING',
      title: `${stats.approvals.pending} заявок ожидает утверждения`,
      description: 'Заявки на ввод, изменение статуса или списание оборудования в очереди согласования.',
      count: stats.approvals.pending,
      actionLabel: 'Согласовать',
      onAction: () => router.push('/eps/approvals'),
    });
  }

  const hasCriticalRepairs = (stats?.eps.underRepair || 0) > 0;
  const hasDeficit = (stats?.wms.lowStockCount || 0) > 0;
  const hasOverdueMro = (stats?.mro.overdueCount || 0) > 0;
  const hasPendingApprovals = (stats?.approvals.pending || 0) > 0;
  const hasOpenIncidents = (stats?.srm.openIssues || 0) > 0;

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* 1. Header */}
      <PageHeader
        title="Панель управления"
        subtitle="Единый центр мониторинга парка оборудования, складских запасов, регламентов ТО и инцидентов"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Панель управления' }]}
        actions={
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              startIcon={<RefreshIcon className={refreshing ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
              sx={{ fontWeight: 600, borderRadius: '8px', minHeight: 36 }}
            >
              Обновить
            </Button>
            {hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE) && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={() => setIsEqWizardOpen(true)}
                sx={{ fontWeight: 700, borderRadius: '8px', minHeight: 36, backgroundColor: '#0284c7' }}
              >
                Новое оборудование
              </Button>
            )}
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
            title="Парк оборудования (EPS)"
            value={stats?.eps.total || 0}
            subtitle={`${stats?.eps.active || 0} в работе • ${stats?.eps.underRepair || 0} в ремонте`}
            icon={<BadgeOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            onClick={() => router.push('/eps')}
            trend={{
              value: `${availabilityRate}% готовность`,
              direction: availabilityRate >= 85 ? 'up' : 'down',
              label: 'КТГ парка',
            }}
          />
        </Grid>

        {/* WMS */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Складской учёт (WMS)"
            value={stats?.wms.nomenclatureCount || 0}
            subtitle={`${stats?.wms.warehousesCount || 0} складов • ${stats?.wms.lowStockCount || 0} дефицит ТМЦ`}
            icon={<WarehouseOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#0f766e"
            iconBgColor="rgba(15, 118, 110, 0.08)"
            accentColor={hasDeficit ? '#ef4444' : undefined}
            onClick={() => router.push('/wms/stock')}
          />
        </Grid>

        {/* SRM */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Сервисные заявки (SRM)"
            value={stats?.srm.totalIssues || 0}
            subtitle={`${stats?.srm.openIssues || 0} открыто • ${stats?.srm.inProgressIssues || 0} в работе`}
            icon={<BugReportOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#d97706"
            iconBgColor="rgba(217, 119, 6, 0.08)"
            accentColor={hasOpenIncidents ? '#f59e0b' : undefined}
            onClick={() => router.push('/srm')}
          />
        </Grid>

        {/* MRO */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="График ППР и ТО (MRO)"
            value={stats?.mro.plannedCount || 0}
            subtitle={`${stats?.mro.overdueCount || 0} просрочено • ${stats?.mro.completedCount || 0} выполнено`}
            icon={<BuildOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#7c3aed"
            iconBgColor="rgba(124, 58, 237, 0.08)"
            accentColor={hasOverdueMro ? '#ef4444' : undefined}
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
              Оперативное создание документов, заявок и перемещений без лишних переходов
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<BugReportOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => setIsSrmDialogOpen(true)}
            sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem', borderColor: '#e2e8f0' }}
          >
            Подать заявку в ServiceDesk
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<MoveToInboxIcon sx={{ fontSize: 16 }} />}
            onClick={() => setIsWmsWizardOpen(true)}
            sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem', borderColor: '#e2e8f0' }}
          >
            Оформить приход ТМЦ
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<BuildOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => router.push('/mro')}
            sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem', borderColor: '#e2e8f0' }}
          >
            Запланировать ТО
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<FactCheckOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => router.push('/eps/approvals')}
            sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem', borderColor: '#e2e8f0' }}
          >
            Согласования ({stats?.approvals.pending || 0})
          </Button>
        </Stack>
      </Paper>

      {/* 5. Main 2-Column Operational Grid */}
      <Grid container spacing={3}>
        {/* Left Column: Urgent ServiceDesk Issues & Maintenance Schedules */}
        <Grid item xs={12} lg={7}>
          <Stack spacing={3}>
            {/* Service Requests Card */}
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BugReportOutlinedIcon sx={{ color: '#0284c7', fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                      Оперативные сервисные заявки и инциденты
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={() => router.push('/srm')}
                    sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Все заявки
                  </Button>
                </Box>

                {stats?.srm.recentIssues && stats.srm.recentIssues.length > 0 ? (
                  <Stack spacing={1.25}>
                    {stats.srm.recentIssues.map((issue) => (
                      <Paper
                        key={issue.id}
                        variant="outlined"
                        onClick={() => router.push('/srm')}
                        sx={{
                          p: 1.5,
                          borderRadius: '8px',
                          borderColor: '#f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            bgcolor: '#f8fafc',
                            borderColor: '#cbd5e1',
                          },
                        }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                              {issue.key}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} noWrap color="#0f172a">
                              {issue.title}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {issue.equipment ? `${issue.equipment.name} (${issue.equipment.inventoryNumber || '—'})` : 'Общесистемная заявка'} • {formatDate(issue.createdAt)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <StatusBadge status={issue.priority} size="small" />
                          <StatusBadge status={issue.status} size="small" />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState
                    icon={<CheckCircleOutlineIcon sx={{ fontSize: 36, color: '#16a34a' }} />}
                    title="Все заявки урегулированы"
                    description="Нет открытых инцидентов, требующих немедленного вмешательства."
                  />
                )}
              </CardContent>
            </Card>

            {/* MRO Schedules Card */}
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BuildOutlinedIcon sx={{ color: '#0f766e', fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                      Ближайшие регламенты ТО и ППР
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={() => router.push('/mro')}
                    sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    График ТОиР
                  </Button>
                </Box>

                {stats?.mro.nextSchedules && stats.mro.nextSchedules.length > 0 ? (
                  <Stack spacing={1.25}>
                    {stats.mro.nextSchedules.map((sch) => (
                      <Paper
                        key={sch.id}
                        variant="outlined"
                        onClick={() => router.push('/mro')}
                        sx={{
                          p: 1.5,
                          borderRadius: '8px',
                          borderColor: '#f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            bgcolor: '#f8fafc',
                            borderColor: '#cbd5e1',
                          },
                        }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                          <Typography variant="body2" fontWeight={600} noWrap color="#0f172a">
                            {sch.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Оборудование: {sch.equipmentName} • План: {formatDate(sch.scheduledDate)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <StatusBadge status={sch.periodicity} size="small" variant="outlined" />
                          <StatusBadge status={sch.status} size="small" />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState
                    icon={<CheckCircleOutlineIcon sx={{ fontSize: 36, color: '#16a34a' }} />}
                    title="График ТО в актуальном состоянии"
                    description="Нет запланированных регламентов на ближайшие дни."
                  />
                )}
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
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ mb: 1, textAlign: 'left' }}>
                  Коэффициент технической готовности (КТГ)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'left' }}>
                  Доля исправного оборудования, готового к бесперебойной эксплуатации
                </Typography>

                <Box sx={{ py: 1 }}>
                  <HealthScoreGauge score={availabilityRate} size="md" />
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

            {/* WMS Critical Stock Deficit */}
            <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmberIcon sx={{ color: '#dc2626', fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                      Критический дефицит ТМЦ (WMS)
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={() => router.push('/wms/stock')}
                    sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Все остатки
                  </Button>
                </Box>

                {stats?.wms.lowStockItems && stats.wms.lowStockItems.length > 0 ? (
                  <Stack spacing={1.25}>
                    {stats.wms.lowStockItems.map((item) => {
                      const fillPct = item.minStock > 0 ? Math.min((item.quantity / item.minStock) * 100, 100) : 0;
                      return (
                        <Box
                          key={item.id}
                          sx={{
                            p: 1.25,
                            borderRadius: '8px',
                            border: '1px solid #fecaca',
                            bgcolor: '#fff5f5',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={600} color="#0f172a" noWrap sx={{ maxWidth: 220 }}>
                              {item.name}
                            </Typography>
                            <Chip
                              label={item.warehouseCode}
                              size="small"
                              sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700, bgcolor: '#ffffff' }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: '#fee2e2', overflow: 'hidden' }}>
                              <Box sx={{ width: `${fillPct}%`, height: '100%', bgcolor: '#ef4444' }} />
                            </Box>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>
                              {item.quantity} / {item.minStock} {item.unit}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                ) : (
                  <EmptyState
                    icon={<CheckCircleOutlineIcon sx={{ fontSize: 36, color: '#16a34a' }} />}
                    title="Все запасы в норме"
                    description="Нет ТМЦ ниже неснижаемого уровня остатков."
                  />
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Dialogs */}
      {isEqWizardOpen && (
        <EquipmentWizardDialog
          open={isEqWizardOpen}
          onClose={() => setIsEqWizardOpen(false)}
          onSuccess={() => {
            setIsEqWizardOpen(false);
            fetchDashboardData();
          }}
        />
      )}

      {isSrmDialogOpen && (
        <CreateServiceRequestDialog
          open={isSrmDialogOpen}
          onClose={() => setIsSrmDialogOpen(false)}
          onSuccess={() => {
            setIsSrmDialogOpen(false);
            fetchDashboardData();
          }}
        />
      )}

      {isWmsWizardOpen && (
        <WmsOperationWizardDialog
          open={isWmsWizardOpen}
          initialType="RECEIPT"
          onClose={() => setIsWmsWizardOpen(false)}
          onSuccess={() => {
            setIsWmsWizardOpen(false);
            fetchDashboardData();
          }}
        />
      )}
    </Box>
  );
}
