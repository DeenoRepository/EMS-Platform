'use client';

import React, { useState, useCallback, Suspense } from 'react';
import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import PrintIcon from '@mui/icons-material/Print';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';
import {
  DataTableWrapper,
  CriticalAlertBanner,
  BulkActionBar,
  PageLoading,
  EmptyState,
} from '@/components/ui';
import {
  StockRow,
  ZoneOption,
  PrintableLabelItem,
  OperationType,
} from '@/components/wms';
import {
  useStockRegistry,
  StockKpiSummary,
  StockRegistryHeader,
  StockRegistryToolbar,
  StockRegistryCards,
  StockRegistryTable,
  StockRegistryDialogs,
} from '@/components/wms/stock';

function WmsStockContent() {
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();
  const router = useRouter();

  const {
    items,
    sortedItems,
    warehouses,
    zones,
    categories,
    selectedIds,
    isLoading,
    sortField,
    sortDirection,
    visibleColumns,
    selectedWarehouse,
    selectedZone,
    selectedCategory,
    search,
    lowStockOnly,
    page,
    rowsPerPage,
    totalCount,
    globalLowStockCount,
    viewMode,
    activeFilterCount,
    kpiStats,
    setPage,
    setRowsPerPage,
    setSelectedIds,
    setVisibleColumns,
    setSelectedWarehouse,
    setSelectedZone,
    setSelectedCategory,
    setSearch,
    setLowStockOnly,
    setViewMode,
    fetchStock,
    handleRequestSort,
    handleResetFilters,
  } = useStockRegistry();

  // Dialogs States
  const [isNomenclatureModalOpen, setIsNomenclatureModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locStockItem, setLocStockItem] = useState<StockRow | null>(null);
  const [warehouseZonesForLoc, setWarehouseZonesForLoc] = useState<ZoneOption[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>('');
  const [isSavingLoc, setIsSavingLoc] = useState(false);
  const [isBulkLocationOpen, setIsBulkLocationOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<StockRow | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printItems, setPrintItems] = useState<PrintableLabelItem[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<OperationType>('RECEIPT');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const isAdmin = Boolean(
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
  );

  const canEditStockLocation = useCallback(
    (row?: StockRow | null) => {
      if (!row) return false;
      if (isAdmin) return true;
      return Boolean(user?.userId && row.warehouseResponsibleUserId === user.userId);
    },
    [isAdmin, user?.userId]
  );

  const handleOpenLocationModal = useCallback(
    async (row: StockRow) => {
      setLocStockItem(row);
      setSelectedCellId(row.cellId || '');
      setIsLocationModalOpen(true);
      try {
        const res = await fetch(`/api/wms/warehouses/${row.warehouseId}/zones`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setWarehouseZonesForLoc(json.data);
        }
      } catch {
        setWarehouseZonesForLoc([]);
      }
    },
    []
  );

  const handleSaveLocation = useCallback(async () => {
    if (!locStockItem) return;
    setIsSavingLoc(true);
    try {
      const res = await fetch(`/api/wms/stock/${locStockItem.id}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellId: selectedCellId || null }),
      });
      if (res.ok) {
        enqueueSnackbar('Место хранения ТМЦ успешно обновлено', { variant: 'success' });
        setIsLocationModalOpen(false);
        fetchStock();
      } else {
        const json = await res.json();
        enqueueSnackbar(json.error || 'Ошибка при сохранении ячейки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера при обновлении места хранения', { variant: 'error' });
    } finally {
      setIsSavingLoc(false);
    }
  }, [locStockItem, selectedCellId, enqueueSnackbar, fetchStock]);

  const handleRecalculateStock = useCallback(async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch('/api/wms/stock/recalculate', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        enqueueSnackbar(json.message || 'Остатки успешно пересчитаны', { variant: 'success' });
        fetchStock();
      } else {
        enqueueSnackbar('Ошибка пересчета складских остатков', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при пересчете остатков', { variant: 'error' });
    } finally {
      setIsRecalculating(false);
    }
  }, [enqueueSnackbar, fetchStock]);

  const handleBulkPrint = useCallback(() => {
    const selectedRows = items.filter((i) => selectedIds.includes(i.id));
    if (selectedRows.length === 0) return;
    setPrintItems(
      selectedRows.map((r) => ({
        id: r.id,
        nomenclatureId: r.nomenclatureId,
        name: r.name,
        article: r.article,
        warehouseCode: r.warehouseCode,
        cellCode: r.cellCode,
        quantity: r.quantity,
        unit: r.unit,
      }))
    );
    setIsPrintModalOpen(true);
  }, [items, selectedIds]);

  return (
    <Box sx={{ pb: 3 }}>
      {/* 1. Шапка страницы */}
      <StockRegistryHeader
        canCreateOperation={hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE)}
        canManageNomenclature={hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE)}
        canRecalculate={hasPermission(PERMISSIONS.WMS_STOCK_VIEW)}
        isRecalculating={isRecalculating}
        onOpenOperationWizard={() => {
          setWizardType('RECEIPT');
          setIsWizardOpen(true);
        }}
        onOpenCreateNomenclature={() => setIsNomenclatureModalOpen(true)}
        onRecalculate={handleRecalculateStock}
      />

      {/* 2. Предупреждение о дефиците ТМЦ */}
      {globalLowStockCount > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <CriticalAlertBanner
            alerts={[
              {
                id: 'wms-stock-low-warning',
                severity: 'WARNING',
                title: `Обнаружен дефицит по ${globalLowStockCount} позициям ТМЦ`,
                description: 'Фактический остаток некоторых позиций на складах упал ниже неснижаемого порога.',
                actionLabel: lowStockOnly ? 'Показать все позиции' : 'Показать только дефицит',
                onAction: () => setLowStockOnly((prev) => !prev),
                count: globalLowStockCount,
              },
            ]}
          />
        </Box>
      )}

      {/* 3. KPI Карточки остатков ТМЦ */}
      <StockKpiSummary
        totalCount={kpiStats.totalCount}
        totalPhysical={kpiStats.totalPhysical}
        lowStockCount={kpiStats.globalLowStockCount}
        totalInTransit={kpiStats.totalInTransit}
        loading={isLoading}
        lowStockOnly={lowStockOnly}
        onToggleLowStock={() => setLowStockOnly((prev) => !prev)}
        onNavigate={(path) => router.push(path)}
      />

      {/* 4. Таблица и панель фильтрации */}
      <DataTableWrapper
        total={totalCount}
        page={page + 1}
        pageSize={rowsPerPage}
        onPageChange={(_, p) => setPage(p - 1)}
        onPageSizeChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        columns={visibleColumns.map((colId) => ({ id: colId, label: colId }))}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        loading={isLoading}
        toolbar={
          <StockRegistryToolbar
            search={search}
            selectedWarehouse={selectedWarehouse}
            selectedZone={selectedZone}
            selectedCategory={selectedCategory}
            lowStockOnly={lowStockOnly}
            viewMode={viewMode}
            activeFilterCount={activeFilterCount}
            warehouses={warehouses}
            zones={zones}
            categories={categories}
            isAdmin={isAdmin}
            currentUserId={user?.userId}
            onSearchChange={setSearch}
            onWarehouseChange={setSelectedWarehouse}
            onZoneChange={setSelectedZone}
            onCategoryChange={setSelectedCategory}
            onToggleLowStock={setLowStockOnly}
            onViewModeChange={setViewMode}
            onResetFilters={handleResetFilters}
          />
        }
        gridContent={
          <StockRegistryCards
            items={sortedItems}
            onOpenDrawer={(item) => {
              setSelectedDrawerItem(item);
              setIsDrawerOpen(true);
            }}
          />
        }
      >
        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon={<Inventory2OutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
            title="Позиции ТМЦ не найдены"
            description={
              activeFilterCount > 0
                ? 'По заданным критериям фильтрации позиции не найдены.'
                : 'Номенклатурные позиции еще не оприходованы на склады.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : undefined}
            onAction={activeFilterCount > 0 ? handleResetFilters : undefined}
          />
        ) : (
          <StockRegistryTable
            items={sortedItems}
            selectedIds={selectedIds}
            visibleColumns={visibleColumns}
            sortField={sortField}
            sortDirection={sortDirection}
            canEditStockLocation={canEditStockLocation}
            onToggleSelect={(id) =>
              setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
              )
            }
            onSelectAll={(checked) =>
              setSelectedIds(checked ? items.map((i) => i.id) : [])
            }
            onRequestSort={handleRequestSort}
            onOpenDrawer={(item) => {
              setSelectedDrawerItem(item);
              setIsDrawerOpen(true);
            }}
            onOpenLocationModal={handleOpenLocationModal}
            onNavigate={(path) => router.push(path)}
          />
        )}
      </DataTableWrapper>

      {/* 5. Плавающая панель массовых действий */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={totalCount}
        onClearSelection={() => setSelectedIds([])}
        actions={[
          {
            label: 'Печать этикеток',
            icon: <PrintIcon fontSize="small" />,
            onClick: handleBulkPrint,
            color: 'primary',
          },
          {
            label: 'Переместить в ячейку',
            icon: <PlaceOutlinedIcon fontSize="small" />,
            onClick: () => setIsBulkLocationOpen(true),
            color: 'secondary',
          },
        ]}
      />

      {/* 6. Диалоговые окна (включая BulkLocationModal) */}
      <StockRegistryDialogs
        isLocationModalOpen={isLocationModalOpen}
        locStockItem={locStockItem}
        warehouseZonesForLoc={warehouseZonesForLoc}
        selectedCellId={selectedCellId}
        isSavingLoc={isSavingLoc}
        canEditLocation={canEditStockLocation(locStockItem)}
        onCloseLocationModal={() => setIsLocationModalOpen(false)}
        onSaveLocation={handleSaveLocation}
        onCellIdChange={setSelectedCellId}
        onNavigateToWarehouses={() => {
          setIsLocationModalOpen(false);
          router.push('/wms/warehouses');
        }}
        isNomenclatureModalOpen={isNomenclatureModalOpen}
        categories={categories}
        onCloseNomenclatureModal={() => setIsNomenclatureModalOpen(false)}
        onNomenclatureCreated={fetchStock}
        isEditDialogOpen={isEditDialogOpen}
        editItem={editItem}
        onCloseEditDialog={() => setIsEditDialogOpen(false)}
        onEditSaved={() => {
          setIsEditDialogOpen(false);
          fetchStock();
        }}
        isBulkLocationOpen={isBulkLocationOpen}
        selectedIds={selectedIds}
        items={items}
        onCloseBulkLocation={() => setIsBulkLocationOpen(false)}
        onBulkLocationSaved={() => {
          setIsBulkLocationOpen(false);
          fetchStock();
        }}
        isPrintModalOpen={isPrintModalOpen}
        printItems={printItems}
        onClosePrintModal={() => setIsPrintModalOpen(false)}
        isWizardOpen={isWizardOpen}
        wizardType={wizardType}
        onCloseWizard={() => setIsWizardOpen(false)}
        onWizardSuccess={() => {
          setIsWizardOpen(false);
          fetchStock();
        }}
        isDrawerOpen={isDrawerOpen}
        selectedDrawerItem={selectedDrawerItem}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onOpenEditFromDrawer={(item) => {
          setEditItem(item);
          setIsEditDialogOpen(true);
        }}
      />
    </Box>
  );
}

export default function WmsStockPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка остатков ТМЦ..." />}>
      <WmsStockContent />
    </Suspense>
  );
}
