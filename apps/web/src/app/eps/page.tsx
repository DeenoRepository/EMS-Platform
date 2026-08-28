'use client';

import React, { Suspense } from 'react';
import { Box, Alert } from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PageHeader from '@/components/layout/PageHeader';
import {
  EmptyState,
  DataTableWrapper,
  CriticalAlertBanner,
  BulkActionBar,
  PageLoading,
  ModuleMaintenanceState,
} from '@/components/ui';
import {
  EquipmentWizardDialog,
  EquipmentKpiCards,
  EquipmentGridView,
  EquipmentTableView,
  EquipmentToolbar,
  EquipmentHeaderActions,
  useEquipmentRegistry,
  EPS_COLUMNS,
} from '@/components/eps';

function EquipmentListContent() {
  const {
    items,
    tags,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    loading,
    viewMode,
    setViewMode,
    openCreateWizard,
    setOpenCreateWizard,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    tagFilter,
    setTagFilter,
    statusCounts,
    maintStatus,
    fetchEquipment,
    canAccessEquipment,
    canCreate,
    activeFilterCount,
    handleResetFilters,
    handleKpiFilter,
    selectedIds,
    setSelectedIds,
    visibleColumns,
    setVisibleColumns,
    sortField,
    sortDirection,
    handleRequestSort,
    sortedEquipmentList,
    handleRowClick,
    handleToggleSelect,
    handleToggleSelectAll,
    handleBulkExport,
    isAdmin,
    isModuleInMaintenance,
    router,
  } = useEquipmentRegistry();

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
          breadcrumbs={[
            { label: 'Главная', href: '/' },
            { label: 'Реестр оборудования' },
          ]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет полномочий для просмотра реестра и паспортов оборудования (требуется право eps.equipment.view)."
          icon={<PrecisionManufacturingIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 2 }}>
      {isModuleInMaintenance && (
        <Alert
          severity="warning"
          sx={{
            mb: 2.5,
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'warning.light',
            backgroundColor: 'warning.light',
          }}
        >
          <strong>Режим предпросмотра администратора:</strong> Модуль переведен в режим технического обслуживания. Для обычных пользователей модуль временно закрыт.
        </Alert>
      )}

      <PageHeader
        title="Реестр технологического оборудования"
        subtitle="Паспортизация, технические характеристики, эксплуатационный статус и жизненный цикл оборудования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Реестр оборудования' },
        ]}
        actions={
          <EquipmentHeaderActions
            canCreate={canCreate}
            onExport={handleBulkExport}
            onCreateClick={() => setOpenCreateWizard(true)}
          />
        }
      />

      {statusCounts.underRepair > 0 && (
        <CriticalAlertBanner
          alerts={[
            {
              id: 'under-repair-alert',
              severity: 'WARNING',
              title: 'Оборудование требует завершения ремонта.',
              description: `Есть ${statusCounts.underRepair} запись с просроченным сроком технического обслуживания.`,
              actionLabel: 'Показать список',
              onAction: () => handleKpiFilter('UNDER_REPAIR'),
              count: statusCounts.underRepair,
            },
          ]}
        />
      )}

      <EquipmentKpiCards
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onFilterChange={handleKpiFilter}
        loading={loading}
      />

      <DataTableWrapper
        loading={loading}
        page={page - 1}
        pageSize={pageSize}
        total={total}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        stickyHeader
        storageKey="eps_equipment_table"
        columns={EPS_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        empty={items.length === 0 && !loading}
        emptyState={
          <EmptyState
            icon={<PrecisionManufacturingIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
            title="Оборудование не найдено"
            description={
              activeFilterCount > 0
                ? 'По заданным критериям фильтрации ничего не найдено. Попробуйте сбросить фильтры.'
                : 'В реестре пока нет зарегистрированного оборудования.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : (canCreate ? 'Добавить оборудование' : undefined)}
            onAction={activeFilterCount > 0 ? handleResetFilters : (canCreate ? () => router.push('/eps/new') : undefined)}
          />
        }
        toolbar={
          <EquipmentToolbar
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            tagFilter={tagFilter}
            onTagFilterChange={(val) => {
              setTagFilter(val);
              setPage(1);
            }}
            tags={tags}
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
          />
        }
        gridContent={
          <EquipmentGridView
            items={sortedEquipmentList}
            onItemClick={handleRowClick}
          />
        }
      >
        <EquipmentTableView
          items={sortedEquipmentList}
          visibleColumns={visibleColumns}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleRequestSort}
          selectedIds={selectedIds}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelect={handleToggleSelect}
          onRowClick={handleRowClick}
        />
      </DataTableWrapper>

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
          {
            label: 'Печать паспортов',
            icon: <QrCode2Icon fontSize="small" />,
            onClick: () => window.print(),
            color: 'info',
          },
        ]}
      />

      <EquipmentWizardDialog
        open={openCreateWizard}
        onClose={() => setOpenCreateWizard(false)}
        onSuccess={(newId) => {
          fetchEquipment();
          router.push(`/eps/${newId}`);
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
