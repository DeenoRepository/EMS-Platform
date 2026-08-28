'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import RefreshIcon from '@mui/icons-material/Refresh';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import {
  CriticalAlertBanner,
  PageLoading,
  ErrorBoundary,
} from '@/components/ui';
import { CreateServiceRequestDialog } from '@/components/srm';
import { WmsOperationWizardDialog } from '@/components/wms';
import { useAuth } from '@/lib/auth-client';
import DashboardKpiSection, { DashboardStatsData } from '@/components/dashboard/DashboardKpiSection';
import DashboardRecentActivity from '@/components/dashboard/DashboardRecentActivity';

const DEFAULT_STATS: DashboardStatsData = {
  scope: 'ENTERPRISE',
  canToggleScope: false,
  eps: { total: 0, active: 0, underRepair: 0, inStorage: 0, decommissioned: 0 },
  wms: { accessible: true, warehousesCount: 0, nomenclatureCount: 0, lowStockCount: 0, activeInventoriesCount: 0, lowStockItems: [] },
  srm: { openIssues: 0, inProgressIssues: 0, resolvedIssues: 0, totalIssues: 0, recentIssues: [] },
  mro: { overdueCount: 0, plannedCount: 0, completedCount: 0, totalCount: 0, nextSchedules: [] },
};

function ExecutiveDashboardContent() {
  const router = useRouter();
  const { user: authUser, hasPermission } = useAuth();

  const [selectedScope, setSelectedScope] = useState<'enterprise' | 'personal'>('enterprise');
  const [stats, setStats] = useState<DashboardStatsData>(DEFAULT_STATS);
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

  const isPersonalScope = stats.scope === 'PERSONAL';

  const totalEquip = stats?.eps.total || 0;
  const activeEquip = stats?.eps.active || 0;
  const availabilityRate = totalEquip > 0 ? Math.round((activeEquip / totalEquip) * 100) : 100;

  const criticalAlerts = useMemo(() => {
    const alerts: any[] = [];
    if (stats?.eps.underRepair && stats.eps.underRepair > 0) {
      alerts.push({
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
      alerts.push({
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
      alerts.push({
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
    return alerts;
  }, [stats, isPersonalScope, router]);

  const hasDeficit = stats.wms.accessible !== false && (stats?.wms.lowStockCount || 0) > 0;
  const hasOverdueMro = (stats?.mro.overdueCount || 0) > 0;
  const hasOpenIncidents = (stats?.srm.openIssues || 0) > 0;

  const currentDisplayName = authUser?.displayName || 'Сотрудник';

  if (loading && !hasLoadedOnce) {
    return <PageLoading text="Загрузка панели управления EMS-Platform..." />;
  }

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* Header with Scope Controls */}
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
                  border: '1px solid',
                  borderColor: 'divider',
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
                      '&.Mui-selected': {
                        bgcolor: 'background.paper',
                        color: 'primary.main',
                        fontWeight: 700,
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
              }}
            >
              Обновить данные
            </Button>
          </Stack>
        }
      />

      {/* Critical Alert Banners */}
      {criticalAlerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <CriticalAlertBanner alerts={criticalAlerts} />
        </Box>
      )}

      {/* Hero KPI Grid & Quick Actions */}
      <DashboardKpiSection
        stats={stats}
        isPersonalScope={isPersonalScope}
        availabilityRate={availabilityRate}
        hasDeficit={hasDeficit}
        hasOpenIncidents={hasOpenIncidents}
        hasOverdueMro={hasOverdueMro}
        hasPermission={hasPermission}
        onOpenSrmDialog={() => setIsSrmDialogOpen(true)}
        onOpenWmsWizard={() => setIsWmsWizardOpen(true)}
      />

      {/* Operational Split Feeds & Health Gauge */}
      <DashboardRecentActivity
        stats={stats}
        isPersonalScope={isPersonalScope}
        availabilityRate={availabilityRate}
      />

      {/* Dialogs */}
      <CreateServiceRequestDialog
        open={isSrmDialogOpen}
        onClose={() => setIsSrmDialogOpen(false)}
        onSuccess={() => {
          setIsSrmDialogOpen(false);
          handleRefresh();
        }}
      />

      <WmsOperationWizardDialog
        open={isWmsWizardOpen}
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
