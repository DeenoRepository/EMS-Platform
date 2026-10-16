'use client';

import React, { useState, Suspense } from 'react';
import { Box } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import {
  EmptyState,
  DataTableWrapper,
  CriticalAlertBanner,
  BulkActionBar,
  PageLoading,
  ModuleMaintenanceState,
  TableDensity,
} from '@/components/ui';
import {
  EquipmentItem,
  useEquipmentRegistry,
  EquipmentKpiBar,
  EquipmentRegistryHeader,
  EquipmentRegistryToolbar,
  EquipmentRegistryCards,
  EquipmentRegistryTable,
  EquipmentRegistryDialogs,
} from '@/components/eps/registry';

function EquipmentListContent() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  const canAccessEquipment =
    Boolean(user?.roles?.includes('admin')) ||
    hasPermission(PERMISSIONS.EPS_EQUIPMENT_VIEW) ||
    hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);

  const {
    items,
    sortedEquipmentList,
    total,
    page,
    pageSize,
    loading,
    filters,
    sortField,
    sortDirection,
    statusCounts,
    maintStatus,
    selectedIds,
    sections,
    tableColumns,
    visibleColumns,
    activeFilterCount,
    activeBadges,
    setPage,
    setPageSize,
    setVisibleColumns,
    setSelectedIds,
    fetchEquipment,
    handleFilterChange,
    handleApplyFilters,
    handleResetFilters,
    handleResetSingleFilter,
    handleKpiFilter,
    handleRequestSort,
    handleSelectAll,
    handleToggleSelect,
    handleBulkExport,
  } = useEquipmentRegistry(canAccessEquipment);

  const [density, setDensity] = useState<TableDensity>('standard');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showKpiCards, setShowKpiCards] = useState<boolean>(true);
  const [showColumnFilters, setShowColumnFilters] = useState<boolean>(false);

  // Dialogs
  const [openCreateWizard, setOpenCreateWizard] = useState(false);
  const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
  const [openBatchEditDialog, setOpenBatchEditDialog] = useState(false);
  const [openPurgeDialog, setOpenPurgeDialog] = useState(false);

  const isAdmin = Boolean(user?.roles?.includes('admin') || user?.roles?.includes('administrator'));
  const isModuleInMaintenance = Boolean(maintStatus?.modules.eps?.enabled);

  if (isModuleInMaintenance && !isAdmin) {
    return (
      <ModuleMaintenanceState
        moduleName="Паспортизация оборудования (EPS)"
        message={maintStatus?.modules.eps.message}
        estimatedUntil={maintStatus?.modules.eps.estimatedUntil}
        onRefresh={fetchEquipment}
      />
    );
  }

  if (!canAccessEquipment) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Реестр технологического оборудования"
          subtitle="Паспортизация, технические характеристики, эксплуатационный статус и жизненный цикл оборудования"
          breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Реестр оборудования' }]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет полномочий для просмотра реестра оборудования."
          icon={<PrecisionManufacturingIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 0.5 }}>
      {/* 1. Header with Role & Action Controls */}
      <EquipmentRegistryHeader
        isModuleInMaintenance={isModuleInMaintenance}
        showKpiCards={showKpiCards}
        canBatchEdit={hasPermission(PERMISSIONS.EPS_EQUIPMENT_BATCH_EDIT)}
        canPurge={hasPermission(PERMISSIONS.EPS_DATABASE_PURGE)}
        canCreate={hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE)}
        onToggleKpi={() => setShowKpiCards((prev) => !prev)}
        onExport={handleBulkExport}
        onOpenBatchEdit={() => setOpenBatchEditDialog(true)}
        onOpenPurge={() => setOpenPurgeDialog(true)}
        onOpenCreate={() => setOpenCreateWizard(true)}
      />

      {/* 2. Critical Equipment Alert Banner */}
      {statusCounts.underRepair > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <CriticalAlertBanner
            alerts={[
              {
                id: 'under-repair-alert',
                severity: 'WARNING',
                title: 'Оборудование требует завершения ремонта',
                description: `${statusCounts.underRepair} единиц оборудования находится в статусе ремонта или отказа.`,
                actionLabel: 'Показать список',
                onAction: () => handleKpiFilter('UNDER_REPAIR'),
                count: statusCounts.underRepair,
              },
            ]}
          />
        </Box>
      )}

      {/* 3. Top Interactive KPI Metric Cards */}
      <EquipmentKpiBar
        show={showKpiCards}
        statusCounts={statusCounts}
        activeStatus={filters.status || ''}
        loading={loading}
        onKpiFilter={handleKpiFilter}
      />

      {/* 4. Unified Filter Toolbar & Data Table Wrapper */}
      <DataTableWrapper
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => setPageSize(parseInt(e.target.value, 10))}
        density={density}
        onDensityChange={setDensity}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        columns={tableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        loading={loading}
        toolbar={
          <EquipmentRegistryToolbar
            filters={filters}
            activeFilterCount={activeFilterCount}
            activeBadges={activeBadges}
            showColumnFilters={showColumnFilters}
            viewMode={viewMode}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            onResetSingleFilter={handleResetSingleFilter}
            onOpenFilterDrawer={() => setOpenFilterDrawer(true)}
            onToggleColumnFilters={() => setShowColumnFilters((prev) => !prev)}
            onViewModeChange={setViewMode}
          />
        }
        gridContent={
          <EquipmentRegistryCards
            items={sortedEquipmentList}
            onRowClick={(eq: EquipmentItem) => router.push(`/eps/${eq.id}`)}
          />
        }
      >
        <EquipmentRegistryTable
          items={sortedEquipmentList}
          selectedIds={selectedIds}
          tableColumns={tableColumns}
          visibleColumns={visibleColumns}
          sortField={sortField}
          sortDirection={sortDirection}
          showColumnFilters={showColumnFilters}
          filters={filters}
          sections={sections}
          onSelectAll={handleSelectAll}
          onToggleSelect={handleToggleSelect}
          onRowClick={(eq: EquipmentItem) => router.push(`/eps/${eq.id}`)}
          onRequestSort={handleRequestSort}
          onFilterChange={handleFilterChange}
        />
      </DataTableWrapper>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={total}
        onClearSelection={() => setSelectedIds([])}
        actions={[
          {
            label: 'Экспорт в Excel',
            icon: <FileDownloadOutlinedIcon fontSize="small" />,
            onClick: handleBulkExport,
            color: 'primary',
          },
        ]}
      />

      {/* Dialogs */}
      <EquipmentRegistryDialogs
        openCreateWizard={openCreateWizard}
        openFilterDrawer={openFilterDrawer}
        openBatchEditDialog={openBatchEditDialog}
        openPurgeDialog={openPurgeDialog}
        selectedIds={selectedIds}
        filters={filters}
        sections={sections}
        onCloseCreateWizard={() => setOpenCreateWizard(false)}
        onSuccessCreateWizard={(createdId) => {
          setOpenCreateWizard(false);
          fetchEquipment();
          if (createdId) router.push(`/eps/${createdId}`);
        }}
        onCloseFilterDrawer={() => setOpenFilterDrawer(false)}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        onCloseBatchEdit={() => setOpenBatchEditDialog(false)}
        onSuccessBatchEdit={() => {
          setSelectedIds([]);
          fetchEquipment();
        }}
        onClosePurge={() => setOpenPurgeDialog(false)}
        onSuccessPurge={() => {
          setSelectedIds([]);
          fetchEquipment();
        }}
      />
    </Box>
  );
}

export default function EquipmentListPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка реестра оборудования..." />}>
      <EquipmentListContent />
    </Suspense>
  );
}
