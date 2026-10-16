'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  CriticalAlertBanner,
  PageLoading,
  ErrorBoundary,
  ErrorState,
} from '@/components/ui';
import {
  buildCriticalAlerts,
  useDashboardData,
  DashboardHeader,
  DashboardKpiGrid,
  DashboardQuickActions,
  DashboardMainGrid,
} from '@/components/dashboard';
import { CreateServiceRequestDialog } from '@/components/srm';
import { WmsOperationWizardDialog } from '@/components/wms';
import { useAuth } from '@/lib/auth-client';

const FULL_PERCENT = 100;

function ExecutiveDashboardContent() {
  const router = useRouter();
  const { user: authUser, hasPermission } = useAuth();
  const {
    stats,
    selectedScope,
    loading,
    refreshing,
    error,
    hasLoadedOnce,
    handleRefresh,
    handleScopeChange,
  } = useDashboardData();

  const [isSrmDialogOpen, setIsSrmDialogOpen] = useState(false);
  const [isWmsWizardOpen, setIsWmsWizardOpen] = useState(false);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const isPersonalScope = stats.scope === 'PERSONAL';
  const totalEquip = stats.eps.total || 0;
  const activeEquip = stats.eps.active || 0;
  const availabilityRate = totalEquip > 0 ? Math.round((activeEquip / totalEquip) * FULL_PERCENT) : FULL_PERCENT;
  const currentDisplayName = stats.user?.displayName || authUser?.displayName || 'Сотрудник';

  const criticalAlerts = useMemo(
    () => buildCriticalAlerts(stats, isPersonalScope, handleNavigate),
    [stats, isPersonalScope, handleNavigate]
  );

  if (loading && !hasLoadedOnce) {
    return <PageLoading text="Загрузка панели управления EMS-Platform..." />;
  }

  if (error && !hasLoadedOnce) {
    return (
      <Box sx={{ p: 4 }}>
        <ErrorState
          title="Ошибка загрузки сводной панели"
          description={error}
          onRetry={handleRefresh}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <DashboardHeader
        isPersonalScope={isPersonalScope}
        currentDisplayName={currentDisplayName}
        canToggleScope={Boolean(stats.canToggleScope)}
        selectedScope={selectedScope}
        refreshing={refreshing}
        onScopeChange={handleScopeChange}
        onRefresh={handleRefresh}
      />

      {criticalAlerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <CriticalAlertBanner alerts={criticalAlerts} />
        </Box>
      )}

      <DashboardKpiGrid
        stats={stats}
        isPersonalScope={isPersonalScope}
        availabilityRate={availabilityRate}
        loading={refreshing}
        onNavigate={handleNavigate}
      />

      <DashboardQuickActions
        hasPermission={hasPermission}
        onAddEquipment={() => handleNavigate('/eps/new')}
        onOpenSrmDialog={() => setIsSrmDialogOpen(true)}
        onOpenWmsWizard={() => setIsWmsWizardOpen(true)}
        onOpenMro={() => handleNavigate('/mro')}
      />

      <DashboardMainGrid
        stats={stats}
        isPersonalScope={isPersonalScope}
        availabilityRate={availabilityRate}
        refreshing={refreshing}
        onNavigate={handleNavigate}
        onOpenSrmDialog={() => setIsSrmDialogOpen(true)}
      />

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
