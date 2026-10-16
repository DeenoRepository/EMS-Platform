'use client';

import React, { useState, useCallback } from 'react';
import { Box, Grid, Stack } from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  CriticalAlertBanner,
  ModuleMaintenanceState,
  ErrorBoundary,
  ErrorState,
  PageLoading,
} from '@/components/ui';
import {
  useWmsDashboard,
  WmsDashboardHeader,
  WmsKpiGrid,
  WmsQuickActions,
  WmsRecentOperationsWidget,
  WmsDeficitWidget,
  WmsFlowBalanceWidget,
} from '@/components/wms/dashboard';
import { WmsOperationWizardDialog, type OperationType } from '@/components/wms';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';

function WmsDashboardContent() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const {
    stats,
    maintStatus,
    isLoading,
    refreshing,
    error,
    hasLoadedOnce,
    handleRefresh,
  } = useWmsDashboard();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<OperationType>('RECEIPT');

  const handleOpenWizard = useCallback((type: OperationType = 'RECEIPT') => {
    setWizardType(type);
    setIsWizardOpen(true);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const isAdmin = Boolean(user?.roles?.includes('admin') || user?.roles?.includes('administrator'));
  const isModuleInMaintenance = Boolean(maintStatus?.modules.wms?.enabled);

  if (isModuleInMaintenance && !isAdmin) {
    return (
      <ModuleMaintenanceState
        moduleName="Складской учёт (WMS)"
        message={maintStatus?.modules.wms.message}
        estimatedUntil={maintStatus?.modules.wms.estimatedUntil}
        onRefresh={handleRefresh}
      />
    );
  }

  if (isLoading && !hasLoadedOnce) {
    return <PageLoading text="Загрузка материальных потоков и остатков..." />;
  }

  if (error && !hasLoadedOnce) {
    return (
      <Box sx={{ p: 4 }}>
        <ErrorState
          title="Ошибка загрузки панели WMS"
          description={error}
          onRetry={handleRefresh}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 3, width: '100%' }}>
      {/* 1. Шапка страницы и статус обслуживания */}
      <WmsDashboardHeader
        isModuleInMaintenance={isModuleInMaintenance}
        canCreateOperations={hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE)}
        refreshing={refreshing}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onOpenWizard={handleOpenWizard}
      />

      {/* 2. Предупреждение о дефиците ТМЦ */}
      {stats.lowStockCount > 0 && (
        <Box sx={{ mb: 3 }}>
          <CriticalAlertBanner
            alerts={[
              {
                id: 'wms-low-stock-critical',
                severity: 'WARNING',
                title: `Обнаружен дефицит ТМЦ по ${stats.lowStockCount} позициям`,
                description: 'Текущий остаток номенклатурных позиций на складах упал ниже установленного неснижаемого порога.',
                actionLabel: `Показать дефицит (${stats.lowStockCount})`,
                onAction: () => handleNavigate('/wms/stock?lowStockOnly=true'),
                count: stats.lowStockCount,
              },
            ]}
          />
        </Box>
      )}

      {/* 3. KPI Карточки */}
      <WmsKpiGrid
        stats={stats}
        loading={refreshing}
        onNavigate={handleNavigate}
      />

      {/* 4. Панель быстрых складских операций */}
      <WmsQuickActions
        hasPermission={hasPermission}
        onOpenWizard={handleOpenWizard}
        onNavigate={handleNavigate}
      />

      {/* 5. Основная рабочая область: Потоки операций (8/12) + Дефицит и Баланс (4/12) */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <WmsRecentOperationsWidget
            operations={stats.recentOperations}
            loading={refreshing}
            onNavigate={handleNavigate}
            onOpenWizard={handleOpenWizard}
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <WmsDeficitWidget
              items={stats.lowStockItems}
              lowStockCount={stats.lowStockCount}
              loading={refreshing}
              onNavigate={handleNavigate}
            />

            <WmsFlowBalanceWidget
              stats={stats}
              onNavigate={handleNavigate}
            />
          </Stack>
        </Grid>
      </Grid>

      {/* Мастер складских операций */}
      <WmsOperationWizardDialog
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialType={wizardType}
        onSuccess={handleRefresh}
      />
    </Box>
  );
}

export default function WmsDashboardPage() {
  return (
    <ErrorBoundary>
      <WmsDashboardContent />
    </ErrorBoundary>
  );
}
