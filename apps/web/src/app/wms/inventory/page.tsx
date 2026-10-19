'use client';

import React, { useState, Suspense, useCallback } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, INVENTORY_STATUS_MAP } from '@ems/shared';
import PageHeader from '@/components/layout/PageHeader';
import {
  DataTableWrapper,
  EmptyState,
  FilterToolbar,
  SearchInput,
  PageLoading,
} from '@/components/ui';
import {
  INVENTORY_COLUMNS,
  useInventoryRegistry,
  InventoryKpiBar,
  InventoryRegistryTable,
  CreateInventoryDialog,
} from '@/components/wms';

const FONT_SEMI_BOLD = 600;

function WmsInventoryListContent() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();

  const canAccessInventory =
    Boolean(user?.roles?.includes('admin')) ||
    hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE) ||
    hasPermission(PERMISSIONS.WMS_STOCK_VIEW);
  const canManage = Boolean(user?.roles?.includes('admin')) || hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE);

  const {
    filteredInventories,
    paginatedInventories,
    warehouses,
    isLoading,
    search,
    selectedWarehouse,
    selectedStatus,
    sortField,
    sortDirection,
    page,
    rowsPerPage,
    activeFilterCount,
    kpiStats,
    setSearch,
    setSelectedWarehouse,
    setSelectedStatus,
    setPage,
    setRowsPerPage,
    fetchInventories,
    handleRequestSort,
    handleResetFilters,
  } = useInventoryRegistry(canAccessInventory, user?.userId);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    INVENTORY_COLUMNS.map((c) => c.id)
  );

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreateModal = useCallback(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
    setIsModalOpen(true);
  }, [warehouses, selectedWarehouseId]);

  const handleCreateSubmit = useCallback(async () => {
    if (!selectedWarehouseId) {
      enqueueSnackbar('Выберите склад для проведения инвентаризации', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wms/inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          comment: comment.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Акт инвентаризации создан', { variant: 'success' });
        setIsModalOpen(false);
        router.push(`/wms/inventory/${json.data.id}`);
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания акта', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при создании инвентаризации', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedWarehouseId, comment, enqueueSnackbar, router]);

  if (!canAccessInventory) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Инвентаризация складов"
          subtitle="Сверка фактического наличия ТМЦ с учетными остатками и автоматическая корректировка"
          breadcrumbs={[
            { label: 'Главная', href: '/' },
            { label: 'Складской учёт', href: '/wms' },
            { label: 'Инвентаризация' },
          ]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет полномочий для доступа к разделу инвентаризации."
          icon={<FactCheckOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* 1. Header */}
      <PageHeader
        title="Инвентаризация складов"
        subtitle="Сверка фактического наличия ТМЦ с учетными остатками и автоматическая корректировка"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Инвентаризация' },
        ]}
        actions={
          canManage && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: FONT_SEMI_BOLD,
                textTransform: 'none',
                px: 2,
              }}
            >
              Новая инвентаризация
            </Button>
          )
        }
      />

      {/* 2. Top KPI Cards */}
      <InventoryKpiBar
        stats={kpiStats}
        selectedStatus={selectedStatus}
        loading={isLoading}
        onKpiFilter={(st) => {
          setSelectedStatus(st);
          setPage(0);
        }}
      />

      {/* 3. Table with Toolbar */}
      <DataTableWrapper
        total={filteredInventories.length}
        page={page + 1}
        pageSize={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage - 1)}
        onPageSizeChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        columns={INVENTORY_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        loading={isLoading}
        stickyHeader
        toolbar={
          <FilterToolbar
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            actions={
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={selectedWarehouse}
                  onChange={(e) => {
                    setSelectedWarehouse(e.target.value);
                    setPage(0);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 160,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все склады</MenuItem>
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id} sx={{ fontSize: '0.8125rem' }}>
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(0);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 160,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все статусы</MenuItem>
                  {Object.entries(INVENTORY_STATUS_MAP).map(([key, info]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {info.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по номеру акта, складу, автору..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(0);
                }}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <InventoryRegistryTable
          items={paginatedInventories}
          visibleColumns={visibleColumns}
          sortField={sortField}
          sortDirection={sortDirection}
          loading={isLoading}
          onRequestSort={handleRequestSort}
          onOpenDetails={(id) => router.push(`/wms/inventory/${id}`)}
          onOpenCountSheet={() => {}}
          onResetFilters={handleResetFilters}
          hasFilters={Boolean(search || selectedWarehouse || selectedStatus)}
          canManage={canManage}
          onOpenCreate={handleOpenCreateModal}
        />
      </DataTableWrapper>

      {/* Create Dialog */}
      <CreateInventoryDialog
        open={isModalOpen}
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        comment={comment}
        isSubmitting={isSubmitting}
        onClose={() => setIsModalOpen(false)}
        onWarehouseChange={setSelectedWarehouseId}
        onCommentChange={setComment}
        onSubmit={handleCreateSubmit}
      />
    </Box>
  );
}

export default function WmsInventoryListPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка журнала инвентаризаций..." />}>
      <WmsInventoryListContent />
    </Suspense>
  );
}
