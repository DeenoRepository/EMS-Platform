'use client';

import React, { Suspense } from 'react';
import {
  Box,
  TextField,
  MenuItem,
} from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { useWarehouseAccess } from '@/hooks/useWarehouseAccess';
import { PERMISSIONS, OPERATION_TYPE_MAP } from '@ems/shared';
import {
  FilterToolbar,
  DataTableWrapper,
  PageLoading,
  SearchInput,
  NavTabsContainer,
  TabItem,
} from '@/components/ui';
import {
  WmsOperationWizardDialog,
  WarehouseSelect,
  TransferReceiveDialog,
  TransferRejectDialog,
  TransferRequestDialog,
  useWmsOperations,
  OperationsKpiSummary,
  OperationsRegistryHeader,
  OperationsTable,
  TransfersTable,
} from '@/components/wms';

function WmsOperationsContent() {
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();
  const { availableWarehouses, isAdmin } = useWarehouseAccess();

  const {
    activeMainTab,
    operations,
    isLoadingOps,
    selectedWarehouse,
    selectedType,
    opsPage,
    opsRowsPerPage,
    opsTotalCount,
    transfers,
    transferTab,
    transferCounts,
    transferTotal,
    transfersPage,
    transfersRowsPerPage,
    transfersSearch,
    isLoadingTransfers,
    visibleOpsColumns,
    isWizardOpen,
    wizardType,
    isRequestDialogOpen,
    selectedTransferForReceive,
    selectedTransferForReject,
    kpiStats,
    setActiveMainTab,
    setSelectedWarehouse,
    setSelectedType,
    setOpsPage,
    setOpsRowsPerPage,
    setTransferTab,
    setTransfersPage,
    setTransfersRowsPerPage,
    setTransfersSearch,
    setVisibleOpsColumns,
    setIsWizardOpen,
    setWizardType,
    setIsRequestDialogOpen,
    setSelectedTransferForReceive,
    setSelectedTransferForReject,
    fetchOperations,
    fetchTransfers,
    handleQuickDispatch,
  } = useWmsOperations();

  const canCreateOperation = hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE);
  const canCreateTransfer = hasPermission(PERMISSIONS.WMS_STOCK_VIEW);

  const mainTabs: TabItem[] = [
    {
      value: 'operations',
      label: 'Журнал складских операций',
      icon: <MoveToInboxIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: 'transfers',
      label: 'Межскладские перемещения',
      icon: <SwapHorizIcon sx={{ fontSize: 18 }} />,
      badge:
        transferCounts.inbound + transferCounts.requests > 0
          ? transferCounts.inbound + transferCounts.requests
          : undefined,
      badgeColor: 'warning',
    },
  ];

  const transferSubTabs: TabItem[] = [
    {
      value: 'inbound',
      label: 'Входящие на приемку',
      icon: <MoveToInboxIcon sx={{ fontSize: 16 }} />,
      badge: transferCounts.inbound || undefined,
      badgeColor: 'error',
    },
    {
      value: 'requests',
      label: 'Запросы на мой склад',
      icon: <HourglassEmptyIcon sx={{ fontSize: 16 }} />,
      badge: transferCounts.requests || undefined,
      badgeColor: 'warning',
    },
    {
      value: 'outbound',
      label: 'Отправлено (В пути)',
      icon: <LocalShippingOutlinedIcon sx={{ fontSize: 16 }} />,
      badge: transferCounts.outbound || undefined,
      badgeColor: 'info',
    },
    {
      value: 'all',
      label: 'Все перемещения',
      icon: <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />,
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* 1. Header with Role & Action Controls */}
      <OperationsRegistryHeader
        activeMainTab={activeMainTab}
        canCreateOperation={canCreateOperation}
        canCreateTransfer={canCreateTransfer}
        onOpenOperationWizard={() => {
          setWizardType('RECEIPT');
          setIsWizardOpen(true);
        }}
        onOpenTransferRequest={() => setIsRequestDialogOpen(true)}
      />

      {/* 2. Top Interactive KPI Metric Cards */}
      <OperationsKpiSummary
        totalCount={kpiStats.totalOps}
        receiptCount={kpiStats.receiptCount}
        issueCount={kpiStats.issueCount}
        transitCount={kpiStats.transitCount}
        loading={isLoadingOps && isLoadingTransfers}
        activeFilterType={selectedType}
        onFilterTypeChange={setSelectedType}
        onTabChange={setActiveMainTab}
      />

      {/* 3. Main Tabs (Операции vs Перемещения) */}
      <Box sx={{ mb: 2 }}>
        <NavTabsContainer
          tabs={mainTabs}
          value={activeMainTab}
          onChange={(val) => setActiveMainTab(val as 'operations' | 'transfers')}
        />
      </Box>

      {/* 4. Tab 1: Складские операции */}
      {activeMainTab === 'operations' && (
        <DataTableWrapper
          toolbar={
            <FilterToolbar
              variant="embedded"
              activeFilterCount={(selectedWarehouse ? 1 : 0) + (selectedType ? 1 : 0)}
              onResetFilters={() => {
                setSelectedWarehouse('');
                setSelectedType('');
                setOpsPage(0);
              }}
            >
              <WarehouseSelect
                value={selectedWarehouse}
                onChange={(val) => {
                  setSelectedWarehouse(val);
                  setOpsPage(0);
                }}
                warehouses={availableWarehouses}
                isAdmin={isAdmin}
                currentUserId={user?.userId}
              />

              <TextField
                select
                size="small"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setOpsPage(0);
                }}
                SelectProps={{ displayEmpty: true }}
                sx={{
                  minWidth: 180,
                  bgcolor: 'background.paper',
                  '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все типы операций</MenuItem>
                {Object.entries(OPERATION_TYPE_MAP).map(([key, info]) => (
                  <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                    {info.label}
                  </MenuItem>
                ))}
              </TextField>
            </FilterToolbar>
          }
          total={opsTotalCount}
          page={opsPage + 1}
          pageSize={opsRowsPerPage}
          onPageChange={(_, p) => setOpsPage(p - 1)}
          onPageSizeChange={(e) => setOpsRowsPerPage(parseInt(e.target.value, 10))}
          columns={visibleOpsColumns.map((colId) => ({ id: colId, label: colId }))}
          visibleColumns={visibleOpsColumns}
          onVisibleColumnsChange={setVisibleOpsColumns}
          loading={isLoadingOps}
          stickyHeader
        >
          <OperationsTable
            operations={operations}
            visibleColumns={visibleOpsColumns}
            loading={isLoadingOps}
            onOpenWizard={() => {
              setWizardType('RECEIPT');
              setIsWizardOpen(true);
            }}
          />
        </DataTableWrapper>
      )}

      {/* 5. Tab 2: Межскладские перемещения */}
      {activeMainTab === 'transfers' && (
        <DataTableWrapper
          tabs={
            <NavTabsContainer
              tabs={transferSubTabs}
              value={transferTab}
              onChange={(val) => {
                setTransferTab(val as any);
                setTransfersPage(0);
              }}
            />
          }
          toolbar={
            <FilterToolbar
              variant="embedded"
              activeFilterCount={(transfersSearch ? 1 : 0) + (selectedWarehouse ? 1 : 0)}
              onResetFilters={() => {
                setTransfersSearch('');
                setSelectedWarehouse('');
                setTransfersPage(0);
              }}
            >
              <Box sx={{ minWidth: { xs: '100%', sm: 280 } }}>
                <SearchInput
                  placeholder="Поиск по номеру, складу, ТМЦ..."
                  value={transfersSearch}
                  onSearch={(v: string) => {
                    setTransfersSearch(v);
                    setTransfersPage(0);
                  }}
                />
              </Box>
              <WarehouseSelect
                value={selectedWarehouse}
                onChange={(val) => {
                  setSelectedWarehouse(val);
                  setTransfersPage(0);
                }}
                warehouses={availableWarehouses}
                isAdmin={isAdmin}
                currentUserId={user?.userId}
              />
            </FilterToolbar>
          }
          total={transferTotal}
          page={transfersPage + 1}
          pageSize={transfersRowsPerPage}
          onPageChange={(_, p) => setTransfersPage(p - 1)}
          onPageSizeChange={(e) => setTransfersRowsPerPage(parseInt(e.target.value, 10))}
          loading={isLoadingTransfers}
          stickyHeader
        >
          <TransfersTable
            transfers={transfers}
            loading={isLoadingTransfers}
            transferTab={transferTab}
            currentUserId={user?.userId}
            isAdmin={isAdmin}
            onReceive={(t) => setSelectedTransferForReceive(t)}
            onReject={(t) => setSelectedTransferForReject(t)}
            onDispatch={handleQuickDispatch}
            onOpenTransferRequest={() => setIsRequestDialogOpen(true)}
          />
        </DataTableWrapper>
      )}

      {/* Dialogs */}
      <WmsOperationWizardDialog
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialType={wizardType}
        onSuccess={() => {
          if (activeMainTab === 'operations') {
            fetchOperations();
          } else {
            fetchTransfers();
          }
        }}
      />

      <TransferRequestDialog
        open={isRequestDialogOpen}
        onClose={() => setIsRequestDialogOpen(false)}
        onSuccess={() => {
          fetchTransfers();
          setActiveMainTab('transfers');
        }}
      />

      <TransferReceiveDialog
        open={Boolean(selectedTransferForReceive)}
        transfer={selectedTransferForReceive}
        onClose={() => setSelectedTransferForReceive(null)}
        onSuccess={() => {
          fetchTransfers();
          enqueueSnackbar('Приемка ТМЦ успешно подтверждена', { variant: 'success' });
        }}
      />

      <TransferRejectDialog
        open={Boolean(selectedTransferForReject)}
        transfer={selectedTransferForReject}
        onClose={() => setSelectedTransferForReject(null)}
        onSuccess={() => {
          fetchTransfers();
          enqueueSnackbar('Перемещение отклонено', { variant: 'info' });
        }}
      />
    </Box>
  );
}

export default function WmsOperationsPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка журнала складских операций..." />}>
      <WmsOperationsContent />
    </Suspense>
  );
}
