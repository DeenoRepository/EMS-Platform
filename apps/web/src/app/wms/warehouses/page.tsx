'use client';

import React, { useMemo, Suspense } from 'react';
import { Box, Button, Grid, Card, Skeleton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';
import {
  EmptyState,
  DataTableWrapper,
  PageLoading,
} from '@/components/ui';
import {
  WarehouseTopologyModal,
  useWarehouseManagement,
  WarehouseKpiBar,
  WarehouseToolbar,
  WarehouseGridCards,
  WarehouseTable,
  WarehouseFormDialog,
} from '@/components/wms';

const FONT_SEMI_BOLD = 600;

function WmsWarehousesContent() {
  const { user, hasPermission } = useAuth();

  const isAdmin = useMemo(() => {
    return Boolean(
      user?.roles?.includes('admin') ||
      hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
    );
  }, [user, hasPermission]);

  const canManage = Boolean(
    user?.roles?.includes('admin') || hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
  );

  const {
    filteredWarehouses,
    paginatedWarehouses,
    users,
    isLoading,
    viewMode,
    search,
    isModalOpen,
    editingId,
    name,
    code,
    location,
    responsibleUserId,
    isActive,
    isSubmitting,
    isTopologyOpen,
    selectedWarehouseForTopology,
    page,
    rowsPerPage,
    kpiStats,
    setViewMode,
    setSearch,
    setIsModalOpen,
    setName,
    setCode,
    setLocation,
    setResponsibleUserId,
    setIsActive,
    setIsTopologyOpen,
    setPage,
    setRowsPerPage,
    handleOpenCreate,
    handleGenerateWarehouseCode,
    handleOpenEdit,
    handleOpenTopology,
    handleSubmit,
    fetchWarehouses,
  } = useWarehouseManagement(isAdmin, user?.userId);

  return (
    <Box sx={{ width: '100%', pb: 3 }}>
      {/* 1. Header */}
      <PageHeader
        title="Склады и зоны хранения"
        subtitle="Справочник складских комплексов, топология зон и ячеек адресного хранения ТМЦ"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Склады' },
        ]}
        actions={
          canManage && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              aria-label="Создать новый склад"
              sx={{
                height: 38,
                px: 2,
                fontSize: '0.8125rem',
                fontWeight: FONT_SEMI_BOLD,
                borderRadius: '8px',
                textTransform: 'none',
              }}
            >
              Создать склад
            </Button>
          )
        }
      />

      {/* 2. KPI Cards Bar */}
      <WarehouseKpiBar stats={kpiStats} loading={isLoading} />

      {/* 3. Search and View Mode Toolbar */}
      <WarehouseToolbar
        search={search}
        viewMode={viewMode}
        onSearchChange={setSearch}
        onViewModeChange={setViewMode}
      />

      {/* 4. Content Area: Cards or Table */}
      {isLoading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card sx={{ height: '100%', p: 2.5, borderRadius: '12px' }}>
                <Skeleton variant="text" width={140} height={28} />
                <Skeleton variant="rounded" height={22} sx={{ my: 1.5 }} />
                <Skeleton variant="rounded" height={60} sx={{ mb: 1.5 }} />
                <Skeleton variant="rounded" height={36} />
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filteredWarehouses.length === 0 ? (
        <EmptyState
          paper
          icon={<WarehouseOutlinedIcon sx={{ fontSize: 36, color: 'text.secondary' }} />}
          title={search ? 'Склады не найдены' : 'Склады еще не зарегистрированы'}
          description={
            search
              ? 'Попробуйте изменить поисковый запрос'
              : 'Создайте первый складской комплекс для учета товарно-материальных ценностей и настройки адресного хранения.'
          }
          actionText={!search && canManage ? 'Создать склад' : undefined}
          onAction={!search && canManage ? handleOpenCreate : undefined}
        />
      ) : viewMode === 'grid' ? (
        <WarehouseGridCards
          warehouses={filteredWarehouses}
          canManage={canManage}
          currentUserId={user?.userId}
          onEdit={handleOpenEdit}
          onOpenTopology={handleOpenTopology}
        />
      ) : (
        <DataTableWrapper
          page={page}
          pageSize={rowsPerPage}
          total={filteredWarehouses.length}
          onPageChange={(_, newPage) => setPage(newPage)}
          onPageSizeChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          pageSizeOptions={[15, 25, 50, 100]}
          stickyHeader
        >
          <WarehouseTable
            warehouses={paginatedWarehouses}
            canManage={canManage}
            onEdit={handleOpenEdit}
            onOpenTopology={handleOpenTopology}
          />
        </DataTableWrapper>
      )}

      {/* 5. Modal: Add / Edit Warehouse */}
      <WarehouseFormDialog
        open={isModalOpen}
        editingId={editingId}
        name={name}
        code={code}
        location={location}
        responsibleUserId={responsibleUserId}
        isActive={isActive}
        users={users}
        isSubmitting={isSubmitting}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        onNameChange={setName}
        onCodeChange={setCode}
        onLocationChange={setLocation}
        onResponsibleChange={setResponsibleUserId}
        onIsActiveChange={setIsActive}
        onGenerateCode={handleGenerateWarehouseCode}
        onSubmit={handleSubmit}
      />

      {/* 6. 2D Topology Modal */}
      <WarehouseTopologyModal
        open={isTopologyOpen}
        onClose={() => setIsTopologyOpen(false)}
        warehouse={selectedWarehouseForTopology}
        onRefreshParent={fetchWarehouses}
      />
    </Box>
  );
}

export default function WmsWarehousesPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка складов..." />}>
      <WmsWarehousesContent />
    </Suspense>
  );
}
