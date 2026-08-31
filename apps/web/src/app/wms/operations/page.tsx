'use client';

import React, { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import { Box, Grid, Button } from '@mui/material';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { useWarehouseAccess } from '@/hooks/useWarehouseAccess';

import { PERMISSIONS } from '@ems/shared';
import {
  StatCard,
  PageLoading,
  NavTabsContainer,
  type TableColumnOption,
  type TabItem,
} from '@/components/ui';
import AddIcon from '@mui/icons-material/Add';
import {
  WmsOperationWizardDialog,
  WarehouseSelect,
  TransferReceiveDialog,
  TransferRejectDialog,
  TransferRequestDialog,
  type OperationType,
} from '@/components/wms';
import { StockOperationRecord } from '@/components/wms/WmsOperationsTable';
import WmsOperationsTablePanel from '@/components/wms/WmsOperationsTablePanel';
import WmsTransfersTablePanel from '@/components/wms/WmsTransfersTablePanel';
import type { StockTransferRecord } from '@/components/wms/WmsTransfersTable';
import { dispatchWmsTransfer } from './quick-dispatch';
import { countActiveOperationFilters } from './filter-state';

const OPERATIONS_COLUMNS: TableColumnOption[] = [
  { id: 'date', label: 'Дата / Время', defaultVisible: true },
  { id: 'type', label: 'Тип операции', defaultVisible: true },
  { id: 'warehouse', label: 'Склад', defaultVisible: true },
  { id: 'items', label: 'Позиции и количество', defaultVisible: true, required: true },
  { id: 'recipient', label: 'Получатель / Назначение / Причина', defaultVisible: true },
  { id: 'comment', label: 'Примечание / Комментарий', defaultVisible: true },
  { id: 'executor', label: 'Исполнитель', defaultVisible: true },
];

type MainTab = 'operations' | 'transfers';
type TransferTab = 'inbound' | 'requests' | 'outbound' | 'my_requests' | 'all';

function WmsOperationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();
  const { availableWarehouses, myWarehouses, isAdmin } = useWarehouseAccess();

  const tabParam = searchParams.get('tab') as MainTab | null;
  const initialMainTab: MainTab = tabParam === 'transfers' ? 'transfers' : 'operations';
  const [activeMainTab, setActiveMainTab] = useState<MainTab>(initialMainTab);

  // ── Operations Tab State ──
  const [operations, setOperations] = useState<StockOperationRecord[]>([]);
  const [isLoadingOps, setIsLoadingOps] = useState(true);
  const [opsPage, setOpsPage] = useState(0);
  const [opsRowsPerPage, setOpsRowsPerPage] = useState(25);
  const [opsTotal, setOpsTotal] = useState(0);
  const [selectedType, setSelectedType] = useState<string>('');
  const [opsSearch, setOpsSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [visibleOpsColumns, setVisibleOpsColumns] = useState<string[]>(
    OPERATIONS_COLUMNS.map((c) => c.id)
  );

  const [stats, setStats] = useState({
    receipts: 0,
    issues: 0,
    writeOffs: 0,
    transfers: 0,
    total: 0,
  });

  // ── Transfers Tab State ──
  const [transfers, setTransfers] = useState<StockTransferRecord[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [transferTab, setTransferTab] = useState<TransferTab>('inbound');
  const [transfersSearch, setTransfersSearch] = useState('');
  const [transfersPage, setTransfersPage] = useState(0);
  const [transfersRowsPerPage, setTransfersRowsPerPage] = useState(25);
  const [transferTotal, setTransferTotal] = useState(0);
  const [transferCounts, setTransferCounts] = useState({
    inbound: 0,
    requests: 0,
    outbound: 0,
    myRequests: 0,
    total: 0,
  });

  // Dialogs State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<OperationType>('RECEIPT');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [receiveTransfer, setReceiveTransfer] = useState<StockTransferRecord | null>(null);
  const [rejectTransfer, setRejectTransfer] = useState<StockTransferRecord | null>(null);
  const [isDispatchingId, setIsDispatchingId] = useState<string | null>(null);

  // Set default warehouse filter for storekeeper
  useEffect(() => {
    if (!isAdmin && myWarehouses.length > 0 && !selectedWarehouse) {
      setSelectedWarehouse(myWarehouses[0].id);
    }
  }, [isAdmin, myWarehouses, selectedWarehouse]);

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && (tabParam === 'operations' || tabParam === 'transfers')) {
      setActiveMainTab(tabParam);
    }
  }, [tabParam]);

  const handleMainTabChange = (newTab: string) => {
    const val = newTab as MainTab;
    setActiveMainTab(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', val);
    router.replace(`/wms/operations?${params.toString()}`, { scroll: false });
  };

  const fetchOperations = useCallback(async () => {
    setIsLoadingOps(true);
    try {
      const params = new URLSearchParams({
        page: String(opsPage + 1),
        pageSize: String(opsRowsPerPage),
      });
      if (selectedType) params.set('type', selectedType);
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse);
      if (opsSearch) params.set('search', opsSearch);

      const res = await fetch(`/api/wms/operations?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOperations(json.data.items || []);
          setOpsTotal(json.data.total || 0);
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки складских операций', { variant: 'error' });
    } finally {
      setIsLoadingOps(false);
    }
  }, [opsPage, opsRowsPerPage, selectedType, selectedWarehouse, opsSearch, enqueueSnackbar]);

  const fetchTransfers = useCallback(async () => {
    setIsLoadingTransfers(true);
    try {
      const params = new URLSearchParams({
        tab: transferTab,
        page: String(transfersPage + 1),
        pageSize: String(transfersRowsPerPage),
      });
      if (transfersSearch) params.set('search', transfersSearch);
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse);

      const res = await fetch(`/api/wms/transfers?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTransfers(json.data.items || []);
          setTransferTotal(json.data.total || 0);
          if (json.data.counts) {
            setTransferCounts(json.data.counts);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки перемещений', { variant: 'error' });
    } finally {
      setIsLoadingTransfers(false);
    }
  }, [transferTab, transfersPage, transfersRowsPerPage, transfersSearch, selectedWarehouse, enqueueSnackbar]);

  useEffect(() => {
    if (activeMainTab === 'operations') {
      fetchOperations();
    } else {
      fetchTransfers();
    }
  }, [activeMainTab, fetchOperations, fetchTransfers]);

  const handleQuickDispatch = async (t: StockTransferRecord) => {
    setIsDispatchingId(t.id);
    try {
      const result = await dispatchWmsTransfer(t.id);
      if (result.success) {
        enqueueSnackbar(`Запрос ${t.transferNumber} успешно согласован и отгружен`, { variant: 'success' });
        fetchTransfers();
      } else {
        enqueueSnackbar(result.error || 'Ошибка отгрузки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при отгрузке', { variant: 'error' });
    } finally {
      setIsDispatchingId(null);
    }
  };

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
      badge: transferCounts.inbound + transferCounts.requests > 0 ? transferCounts.inbound + transferCounts.requests : undefined,
      badgeColor: 'warning',
    },
  ];

  const activeFiltersCount = useMemo(() => {
    return countActiveOperationFilters(selectedType, selectedWarehouse, opsSearch);
  }, [selectedType, selectedWarehouse, opsSearch]);

  const canCreate = hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="Складские операции и перемещения"
        subtitle="Реестр приходов, списаний, выдачи в подотчет и межскладских трансферов ТМЦ"
        actions={
          activeMainTab === 'transfers' && canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsRequestDialogOpen(true)}
            >
              Создать перемещение
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ mb: 2.5 }}>
        <NavTabsContainer
          tabs={mainTabs}
          value={activeMainTab}
          onChange={handleMainTabChange}
        />
      </Box>

      {activeMainTab === 'operations' && (
        <>
          <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Приход ТМЦ"
                value={stats.receipts}
                subtitle="Поступления на склад"
                icon={<MoveToInboxIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(22, 163, 74, 0.08)"
                iconColor="success.main"
                accentColor="success.main"
                loading={isLoadingOps}
                active={selectedType === 'RECEIPT'}
                onClick={() => {
                  setSelectedType(selectedType === 'RECEIPT' ? '' : 'RECEIPT');
                  setOpsPage(0);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Выдача сотрудникам"
                value={stats.issues}
                subtitle="Расходники в подотчет"
                icon={<OutboxIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(2, 132, 199, 0.08)"
                iconColor="info.dark"
                accentColor="info.dark"
                loading={isLoadingOps}
                active={selectedType === 'ISSUE_EMPLOYEE'}
                onClick={() => {
                  setSelectedType(selectedType === 'ISSUE_EMPLOYEE' ? '' : 'ISSUE_EMPLOYEE');
                  setOpsPage(0);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Списания и ТОиР"
                value={stats.writeOffs}
                subtitle="Монтаж и утилизация"
                icon={<OutboxIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(217, 119, 6, 0.08)"
                iconColor="warning.main"
                accentColor="warning.main"
                loading={isLoadingOps}
                active={selectedType === 'ISSUE_WRITE_OFF'}
                onClick={() => {
                  setSelectedType(selectedType === 'ISSUE_WRITE_OFF' ? '' : 'ISSUE_WRITE_OFF');
                  setOpsPage(0);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Трансферы"
                value={stats.transfers}
                subtitle="Межскладские перемещения"
                icon={<SwapHorizIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(124, 58, 237, 0.08)"
                iconColor="secondary.main"
                accentColor="secondary.main"
                loading={isLoadingOps}
                active={selectedType === 'TRANSFER'}
                onClick={() => {
                  setSelectedType(selectedType === 'TRANSFER' ? '' : 'TRANSFER');
                  setOpsPage(0);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Всего операций"
                value={stats.total}
                subtitle="За все время"
                icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(15, 23, 42, 0.06)"
                iconColor="text.primary"
                accentColor="primary.main"
                loading={isLoadingOps}
                active={selectedType === ''}
                onClick={() => {
                  setSelectedType('');
                  setOpsPage(0);
                }}
              />
            </Grid>
          </Grid>

          <WmsOperationsTablePanel
            operations={operations}
            isLoading={isLoadingOps}
            columns={OPERATIONS_COLUMNS}
            visibleColumns={visibleOpsColumns}
            selectedType={selectedType}
            selectedWarehouse={selectedWarehouse}
            search={opsSearch}
            activeFilterCount={activeFiltersCount}
            page={opsPage}
            rowsPerPage={opsRowsPerPage}
            total={opsTotal}
            availableWarehouses={availableWarehouses}
            isAdmin={isAdmin}
            currentUserId={user?.userId}
            canCreateOperation={canCreate}
            onVisibleColumnsChange={setVisibleOpsColumns}
            onTypeChange={(value) => {
              setSelectedType(value);
              setOpsPage(0);
            }}
            onWarehouseChange={(value) => {
              setSelectedWarehouse(value);
              setOpsPage(0);
            }}
            onSearchChange={(value) => {
              setOpsSearch(value);
              setOpsPage(0);
            }}
            onResetFilters={() => {
              setSelectedType('');
              setSelectedWarehouse('');
              setOpsSearch('');
              setOpsPage(0);
            }}
            onPageChange={setOpsPage}
            onPageSizeChange={(pageSize) => {
              setOpsRowsPerPage(pageSize);
              setOpsPage(0);
            }}
            onOpenWizard={() => {
              setWizardType('RECEIPT');
              setIsWizardOpen(true);
            }}
          />
        </>
      )}

      {activeMainTab === 'transfers' && (
        <>
          <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Требуют приемки"
                value={transferCounts.inbound}
                subtitle="Входящие ТМЦ в пути"
                icon={<MoveToInboxIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(2, 132, 199, 0.08)"
                iconColor="primary.main"
                accentColor="primary.main"
                loading={isLoadingTransfers}
                active={transferTab === 'inbound'}
                onClick={() => setTransferTab('inbound')}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Запросы на отгрузку"
                value={transferCounts.requests}
                subtitle="Ожидают согласования"
                icon={<HourglassEmptyIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(217, 119, 6, 0.08)"
                iconColor="warning.main"
                accentColor="warning.main"
                loading={isLoadingTransfers}
                active={transferTab === 'requests'}
                onClick={() => setTransferTab('requests')}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Отправлено (В пути)"
                value={transferCounts.outbound}
                subtitle="Исходящие отгрузки"
                icon={<LocalShippingOutlinedIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(124, 58, 237, 0.08)"
                iconColor="secondary.main"
                accentColor="secondary.main"
                loading={isLoadingTransfers}
                active={transferTab === 'outbound'}
                onClick={() => setTransferTab('outbound')}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Всего перемещений"
                value={transferCounts.total}
                subtitle="Все записи реестра"
                icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(22, 163, 74, 0.08)"
                iconColor="success.main"
                accentColor="success.main"
                loading={isLoadingTransfers}
                active={transferTab === 'all'}
                onClick={() => setTransferTab('all')}
              />
            </Grid>
          </Grid>

          <WmsTransfersTablePanel
            transfers={transfers}
            isLoading={isLoadingTransfers}
            transferTab={transferTab}
            transfersSearch={transfersSearch}
            transfersPage={transfersPage}
            transfersRowsPerPage={transfersRowsPerPage}
            transferTotal={transferTotal}
            transferCounts={transferCounts}
            selectedWarehouse={selectedWarehouse}
            availableWarehouses={availableWarehouses}
            isAdmin={isAdmin}
            currentUserId={user?.userId}
            isDispatchingId={isDispatchingId}
            onTransferTabChange={(tab) => {
              setTransferTab(tab);
              setTransfersPage(0);
            }}
            onSearchChange={(value) => {
              setTransfersSearch(value);
              setTransfersPage(0);
            }}
            onWarehouseChange={(value) => {
              setSelectedWarehouse(value);
              setTransfersPage(0);
            }}
            onResetFilters={() => {
              setTransfersSearch('');
              setSelectedWarehouse('');
              setTransfersPage(0);
            }}
            onPageChange={setTransfersPage}
            onPageSizeChange={(pageSize) => {
              setTransfersRowsPerPage(pageSize);
              setTransfersPage(0);
            }}
            onReceive={setReceiveTransfer}
            onReject={setRejectTransfer}
            onQuickDispatch={handleQuickDispatch}
          />
        </>
      )}

      {/* Dialogs */}
      <WmsOperationWizardDialog
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialType={wizardType}
        onSuccess={() => {
          fetchOperations();
          if (activeMainTab === 'transfers') fetchTransfers();
        }}
      />

      <TransferRequestDialog
        open={isRequestDialogOpen}
        onClose={() => setIsRequestDialogOpen(false)}
        onSuccess={() => {
          fetchTransfers();
          enqueueSnackbar('Запрос на перевод ТМЦ успешно отправлен', { variant: 'success' });
        }}
      />

      {receiveTransfer && (
        <TransferReceiveDialog
          open={Boolean(receiveTransfer)}
          transfer={receiveTransfer}
          onClose={() => setReceiveTransfer(null)}
          onSuccess={() => {
            fetchTransfers();
            setReceiveTransfer(null);
            enqueueSnackbar(`Перемещение ${receiveTransfer.transferNumber} принято`, { variant: 'success' });
          }}
        />
      )}

      {rejectTransfer && (
        <TransferRejectDialog
          open={Boolean(rejectTransfer)}
          transfer={rejectTransfer}
          onClose={() => setRejectTransfer(null)}
          onSuccess={() => {
            fetchTransfers();
            setRejectTransfer(null);
            enqueueSnackbar(`Перемещение ${rejectTransfer.transferNumber} отклонено`, { variant: 'warning' });
          }}
        />
      )}
    </Box>
  );
}

export default function WmsOperationsPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка операций WMS..." />}>
      <WmsOperationsContent />
    </Suspense>
  );
}
