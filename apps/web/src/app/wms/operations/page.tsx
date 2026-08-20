'use client';

import React, { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { useWarehouseAccess } from '@/hooks/useWarehouseAccess';

import { PERMISSIONS, formatDateTime } from '@ems/shared';
import {
  StatCard,
  FilterToolbar,
  DataTableWrapper,
  EmptyState,
  StatusBadge,
  PageLoading,
  SearchInput,
  NavTabsContainer,
  type TableColumnOption,
  type TabItem,
} from '@/components/ui';
import {
  WmsOperationWizardDialog,
  WarehouseSelect,
  TransferReceiveDialog,
  TransferRejectDialog,
  TransferRequestDialog,
  type OperationType,
} from '@/components/wms';

const OPERATIONS_COLUMNS: TableColumnOption[] = [
  { id: 'date', label: 'Дата / Время', defaultVisible: true },
  { id: 'type', label: 'Тип операции', defaultVisible: true },
  { id: 'warehouse', label: 'Склад', defaultVisible: true },
  { id: 'items', label: 'Позиции и количество', defaultVisible: true, required: true },
  { id: 'recipient', label: 'Получатель / Назначение / Причина', defaultVisible: true },
  { id: 'comment', label: 'Примечание / Комментарий', defaultVisible: true },
  { id: 'executor', label: 'Исполнитель', defaultVisible: true },
];

interface StockOperation {
  id: string;
  type: string;
  date: string;
  counterparty?: string | null;
  document?: string | null;
  comment?: string | null;
  warehouse: { id: string; name: string; code: string };
  createdBy: { displayName: string; ldapLogin: string };
  items: Array<{
    id: string;
    quantity: number;
    nomenclature: { id: string; name: string; article?: string | null; unit: string };
    equipment?: { id: string; name: string; inventoryNumber: string } | null;
  }>;
}

interface TransferItemRecord {
  id: string;
  nomenclatureId: string;
  quantity: string | number;
  targetCellId?: string | null;
  targetCell?: { code: string; name?: string } | null;
  nomenclature?: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
  };
}

interface StockTransferRecord {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  status: 'REQUESTED' | 'IN_TRANSIT' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  requestReason?: string | null;
  rejectionReason?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  sourceWarehouse: {
    id: string;
    name: string;
    code: string;
    responsibleUser?: { id: string; displayName: string } | null;
  };
  targetWarehouse: {
    id: string;
    name: string;
    code: string;
    responsibleUser?: { id: string; displayName: string } | null;
  };
  createdBy?: { id: string; displayName: string } | null;
  dispatchedBy?: { id: string; displayName: string } | null;
  receivedBy?: { id: string; displayName: string } | null;
  rejectedBy?: { id: string; displayName: string } | null;
  items: TransferItemRecord[];
}

function WmsOperationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();
  const { warehouses, availableWarehouses, isAdmin, isLoading: isLoadingWarehouses } = useWarehouseAccess();

  // Active Main Tab: 'operations' | 'transfers'
  const [activeMainTab, setActiveMainTab] = useState<'operations' | 'transfers'>(
    searchParams.get('tab') === 'transfers' ? 'transfers' : 'operations'
  );

  // Transfers sub-tab
  const [transferTab, setTransferTab] = useState<'inbound' | 'requests' | 'outbound' | 'my_requests' | 'all'>('inbound');

  // Operations Data State
  const [operations, setOperations] = useState<StockOperation[]>([]);
  const [isLoadingOps, setIsLoadingOps] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('action') || '');
  const [opsPage, setOpsPage] = useState<number>(0);
  const [opsRowsPerPage, setOpsRowsPerPage] = useState<number>(25);
  const [opsTotalCount, setOpsTotalCount] = useState<number>(0);

  // Transfers Data State
  const [transfers, setTransfers] = useState<StockTransferRecord[]>([]);
  const [transferCounts, setTransferCounts] = useState({ inbound: 0, requests: 0, outbound: 0, total: 0 });
  const [transferTotal, setTransferTotal] = useState(0);
  const [transfersPage, setTransfersPage] = useState(0);
  const [transfersRowsPerPage, setTransfersRowsPerPage] = useState(25);
  const [transfersSearch, setTransfersSearch] = useState('');
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(true);

  // Dialog States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<OperationType>('RECEIPT');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<StockTransferRecord | null>(null);
  const [selectedTransferForReject, setSelectedTransferForReject] = useState<StockTransferRecord | null>(null);
  const [isDispatchingId, setIsDispatchingId] = useState<string | null>(null);

  // Columns visibility for Operations
  const [visibleOpsColumns, setVisibleOpsColumns] = useState<string[]>(
    OPERATIONS_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
  );

  // Handle URL actions
  useEffect(() => {
    const action = searchParams.get('action') || searchParams.get('create');
    if (action) {
      if (action === 'RECEIPT') {
        setWizardType('RECEIPT');
        setIsWizardOpen(true);
      } else if (action === 'ISSUE' || action === 'ISSUE_EMPLOYEE') {
        setWizardType('ISSUE_EMPLOYEE');
        setIsWizardOpen(true);
      } else if (action === 'ISSUE_WRITE_OFF' || action === 'WRITE_OFF') {
        setWizardType('ISSUE_WRITE_OFF');
        setIsWizardOpen(true);
      } else if (action === 'TRANSFER') {
        setWizardType('TRANSFER');
        setIsWizardOpen(true);
      }
    }
  }, [searchParams]);

  // Fetch Operations
  const fetchOperations = useCallback(async () => {
    setIsLoadingOps(true);
    try {
      const params = new URLSearchParams();
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse);
      if (selectedType) params.set('type', selectedType);
      params.set('page', String(opsPage + 1));
      params.set('pageSize', String(opsRowsPerPage));

      const res = await fetch(`/api/wms/operations?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOperations(json.data.items || []);
          setOpsTotalCount(json.data.total || 0);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки журнала операций', { variant: 'error' });
    } finally {
      setIsLoadingOps(false);
    }
  }, [selectedWarehouse, selectedType, opsPage, opsRowsPerPage, enqueueSnackbar]);

  // Fetch Transfers
  const fetchTransfers = useCallback(async () => {
    setIsLoadingTransfers(true);
    try {
      const params = new URLSearchParams({
        mode: transferTab,
        page: String(transfersPage + 1),
        pageSize: String(transfersRowsPerPage),
        search: transfersSearch,
      });
      if (selectedWarehouse) {
        params.set('warehouseId', selectedWarehouse);
      }

      const res = await fetch(`/api/wms/transfers?${params.toString()}`);
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

  // Quick Dispatch Handler for transfers
  const handleQuickDispatch = async (t: StockTransferRecord) => {
    setIsDispatchingId(t.id);
    try {
      const res = await fetch(`/api/wms/transfers/${t.id}/dispatch`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(`Запрос ${t.transferNumber} успешно согласован и отгружен`, { variant: 'success' });
        fetchTransfers();
      } else {
        enqueueSnackbar(json.error || 'Ошибка отгрузки', { variant: 'error' });
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
      badge: (transferCounts.inbound + transferCounts.requests) > 0 ? (transferCounts.inbound + transferCounts.requests) : undefined,
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
      label: 'Исходящие (В пути)',
      icon: <LocalShippingOutlinedIcon sx={{ fontSize: 16 }} />,
      badge: transferCounts.outbound || undefined,
    },
    {
      value: 'my_requests',
      label: 'Мои заявки',
      icon: <AssignmentOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      value: 'all',
      label: 'Все перемещения',
      icon: <SwapHorizIcon sx={{ fontSize: 16 }} />,
    },
  ];

  const renderRecipientBadge = (op: StockOperation) => {
    if (op.type === 'RECEIPT') {
      return (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <MoveToInboxIcon sx={{ fontSize: 16, color: '#16a34a' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#15803d', fontWeight: 600 }}>
            {op.counterparty ? `Поставщик: ${op.counterparty}` : 'Приход ТМЦ на склад'}
          </Typography>
        </Stack>
      );
    }

    if (op.type === 'ISSUE_EMPLOYEE') {
      return (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <PersonIcon sx={{ fontSize: 16, color: '#1d4ed8' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#1d4ed8', fontWeight: 600 }}>
            {op.counterparty || 'Сотрудник в подотчет'}
          </Typography>
        </Stack>
      );
    }

    if (op.type === 'ISSUE_WRITE_OFF') {
      const firstItemWithEq = op.items.find((it) => it.equipment);
      if (firstItemWithEq && firstItemWithEq.equipment) {
        return (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <PrecisionManufacturingIcon sx={{ fontSize: 16, color: '#b45309' }} />
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#b45309', fontWeight: 600 }}>
              Оборудование: {firstItemWithEq.equipment.name} ({firstItemWithEq.equipment.inventoryNumber})
            </Typography>
          </Stack>
        );
      }
      return (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <DeleteSweepIcon sx={{ fontSize: 16, color: '#dc2626' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#b91c1c', fontWeight: 600 }}>
            {op.counterparty || 'Списание в неликвид/брак'}
          </Typography>
        </Stack>
      );
    }

    if (op.type === 'TRANSFER') {
      return (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <SwapHorizIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#6d28d9', fontWeight: 600 }}>
            {op.counterparty ? `Целевой склад: ${op.counterparty}` : 'Перемещение между складами'}
          </Typography>
        </Stack>
      );
    }

    return (
      <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#475569' }}>
        {op.counterparty || '—'}
      </Typography>
    );
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Движение ТМЦ и складские операции"
        subtitle="Единый реестр приходов, списаний, выдач сотрудникам и межскладских перемещений ТМЦ"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: activeMainTab === 'operations' ? 'Операции' : 'Перемещения' },
        ]}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<SendIcon />}
              onClick={() => setIsRequestDialogOpen(true)}
              sx={{ fontWeight: 600, borderRadius: '8px' }}
            >
              Запросить перевод ТМЦ
            </Button>
            {hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => {
                  setWizardType('RECEIPT');
                  setIsWizardOpen(true);
                }}
                sx={{
                  fontWeight: 700,
                  borderRadius: '8px',
                  bgcolor: '#0284c7',
                  '&:hover': { bgcolor: '#0369a1' },
                }}
              >
                Мастер складских операций
              </Button>
            )}
          </Stack>
        }
      />

      {/* Main Section Navigation Tabs */}
      <Box sx={{ mb: 2.5 }}>
        <NavTabsContainer
          tabs={mainTabs}
          value={activeMainTab}
          onChange={(val) => {
            setActiveMainTab(val as 'operations' | 'transfers');
            router.push(`/wms/operations?tab=${val}`, { scroll: false });
          }}
        />
      </Box>

      {/* ─── TAB 1: ЖУРНАЛ ОПЕРАЦИЙ ─── */}
      {activeMainTab === 'operations' && (
        <>
          {/* KPI Metrics */}
          <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Всего операций"
                value={opsTotalCount}
                subtitle="В журнале движения ТМЦ"
                icon={<SwapHorizIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(2, 132, 199, 0.08)"
                iconColor="#0284c7"
                accentColor="#0284c7"
                active={selectedType === ''}
                onClick={() => setSelectedType('')}
                loading={isLoadingOps && opsTotalCount === 0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Поступления (Приход)"
                value={operations.filter((o) => o.type === 'RECEIPT').length}
                subtitle="От поставщиков"
                icon={<MoveToInboxIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(22, 163, 74, 0.08)"
                iconColor="#16a34a"
                accentColor="#16a34a"
                active={selectedType === 'RECEIPT'}
                onClick={() => setSelectedType((prev) => (prev === 'RECEIPT' ? '' : 'RECEIPT'))}
                loading={isLoadingOps && opsTotalCount === 0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Выдачи и Списания"
                value={operations.filter((o) => o.type === 'ISSUE_EMPLOYEE' || o.type === 'ISSUE_WRITE_OFF').length}
                subtitle="В подотчет и на станки ТОиР"
                icon={<OutboxIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(217, 119, 6, 0.08)"
                iconColor="#d97706"
                accentColor="#d97706"
                active={selectedType === 'ISSUE_EMPLOYEE' || selectedType === 'ISSUE_WRITE_OFF'}
                onClick={() => setSelectedType((prev) => (prev === 'ISSUE_WRITE_OFF' ? '' : 'ISSUE_WRITE_OFF'))}
                loading={isLoadingOps && opsTotalCount === 0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Межскладские трансферы"
                value={operations.filter((o) => o.type === 'TRANSFER').length}
                subtitle="Перемещения ТМЦ"
                icon={<SwapHorizIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(124, 58, 237, 0.08)"
                iconColor="#7c3aed"
                accentColor="#7c3aed"
                active={selectedType === 'TRANSFER'}
                onClick={() => setSelectedType((prev) => (prev === 'TRANSFER' ? '' : 'TRANSFER'))}
                loading={isLoadingOps && opsTotalCount === 0}
              />
            </Grid>
          </Grid>

          {/* Operations Table */}
          <DataTableWrapper
            loading={isLoadingOps}
            page={opsPage}
            pageSize={opsRowsPerPage}
            total={opsTotalCount}
            onPageChange={(_, newPage) => setOpsPage(newPage)}
            onPageSizeChange={(e) => {
              setOpsRowsPerPage(parseInt(e.target.value, 10));
              setOpsPage(0);
            }}
            columns={OPERATIONS_COLUMNS}
            visibleColumns={visibleOpsColumns}
            onVisibleColumnsChange={setVisibleOpsColumns}
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
                    minWidth: 200,
                    backgroundColor: '#ffffff',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: '#e2e8f0' },
                      '&:hover fieldset': { borderColor: '#cbd5e1' },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все типы операций</MenuItem>
                  <MenuItem value="RECEIPT" sx={{ fontSize: '0.8125rem' }}>Поступление (Приход)</MenuItem>
                  <MenuItem value="ISSUE_EMPLOYEE" sx={{ fontSize: '0.8125rem' }}>Выдача сотруднику</MenuItem>
                  <MenuItem value="ISSUE_WRITE_OFF" sx={{ fontSize: '0.8125rem' }}>Списание ТМЦ (ТОиР / брак / неликвид)</MenuItem>
                  <MenuItem value="TRANSFER" sx={{ fontSize: '0.8125rem' }}>Перемещение (Трансфер)</MenuItem>
                </TextField>
              </FilterToolbar>
            }
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  {visibleOpsColumns.includes('date') && (
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                      Дата / Время
                    </TableCell>
                  )}
                  {visibleOpsColumns.includes('type') && (
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                      Тип операции
                    </TableCell>
                  )}
                  {visibleOpsColumns.includes('warehouse') && (
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                      Склад
                    </TableCell>
                  )}
                  {visibleOpsColumns.includes('items') && (
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                      Позиции ТМЦ и количество
                    </TableCell>
                  )}
                  {visibleOpsColumns.includes('recipient') && (
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                      Назначение / Получатель / Оборудование
                    </TableCell>
                  )}
                  {visibleOpsColumns.includes('comment') && (
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                      Примечание
                    </TableCell>
                  )}
                  {visibleOpsColumns.includes('executor') && (
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                      Исполнитель
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleOpsColumns.length} sx={{ py: 6 }}>
                      <EmptyState
                        icon={<SwapHorizIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
                        title="Операций не найдено"
                        description="В журнале пока нет записей о движении ТМЦ, соответствующих выбранным фильтрам."
                        actionText={hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) ? "Оформить операцию через мастер" : undefined}
                        actionIcon={<AutoAwesomeIcon />}
                        onAction={hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) ? () => {
                          setWizardType('RECEIPT');
                          setIsWizardOpen(true);
                        } : undefined}
                        minHeight={200}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  operations.map((op) => (
                    <TableRow key={op.id} hover>
                      {visibleOpsColumns.includes('date') && (
                        <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#475569' }}>
                          {formatDateTime(op.date)}
                        </TableCell>
                      )}
                      {visibleOpsColumns.includes('type') && (
                        <TableCell>
                          <StatusBadge status={op.type} />
                        </TableCell>
                      )}
                      {visibleOpsColumns.includes('warehouse') && (
                        <TableCell>
                          <Chip
                            label={op.warehouse.code}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              backgroundColor: '#ffffff',
                              color: '#475569',
                              border: '1px solid #e2e8f0',
                              height: 20,
                            }}
                          />
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: '#64748b', fontSize: '0.75rem' }}>
                            {op.warehouse.name}
                          </Typography>
                        </TableCell>
                      )}
                      {visibleOpsColumns.includes('items') && (
                        <TableCell>
                          <Stack spacing={0.5}>
                            {op.items.map((it) => (
                              <Typography key={it.id} variant="body2" sx={{ fontSize: '0.8125rem', color: '#0f172a' }}>
                                <b>{it.nomenclature.name}</b>: {it.quantity} {it.nomenclature.unit}
                              </Typography>
                            ))}
                          </Stack>
                        </TableCell>
                      )}
                      {visibleOpsColumns.includes('recipient') && (
                        <TableCell>
                          {renderRecipientBadge(op)}
                        </TableCell>
                      )}
                      {visibleOpsColumns.includes('comment') && (
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                            {op.comment || '—'}
                          </Typography>
                        </TableCell>
                      )}
                      {visibleOpsColumns.includes('executor') && (
                        <TableCell sx={{ fontSize: '0.8125rem' }}>
                          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem', color: '#334155' }}>
                            {op.createdBy?.displayName}
                          </Typography>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableWrapper>
        </>
      )}

      {/* ─── TAB 2: МЕЖСКЛАДСКИЕ ПЕРЕМЕЩЕНИЯ ─── */}
      {activeMainTab === 'transfers' && (
        <>
          {/* Transfer KPI Cards */}
          <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Требуют приемки"
                value={transferCounts.inbound}
                subtitle="Входящие ТМЦ в пути"
                icon={<MoveToInboxIcon sx={{ fontSize: 20 }} />}
                iconBgColor="rgba(2, 132, 199, 0.08)"
                iconColor="#0284c7"
                accentColor="#0284c7"
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
                iconColor="#d97706"
                accentColor="#d97706"
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
                iconColor="#7c3aed"
                accentColor="#7c3aed"
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
                iconColor="#16a34a"
                accentColor="#16a34a"
                loading={isLoadingTransfers}
                active={transferTab === 'all'}
                onClick={() => setTransferTab('all')}
              />
            </Grid>
          </Grid>

          {/* Transfers Table with Sub-Tabs */}
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
            page={transfersPage}
            pageSize={transfersRowsPerPage}
            onPageChange={(_, newPage) => setTransfersPage(newPage)}
            onPageSizeChange={(e) => {
              setTransfersRowsPerPage(parseInt(e.target.value, 10));
              setTransfersPage(0);
            }}
            loading={isLoadingTransfers}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Номер</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 180 }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Маршрут (Откуда → Куда)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Позиции ТМЦ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Обоснование / Отказ</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 130 }}>Дата</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: 220 }}>
                    Действия
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.length === 0 && !isLoadingTransfers ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                      <EmptyState
                        title="Перемещений не найдено"
                        description={
                          transferTab === 'inbound'
                            ? 'На ваш склад сейчас нет входящих перемещений, ожидающих приемки.'
                            : transferTab === 'requests'
                            ? 'Нет активных запросов на перевод ТМЦ с вашего склада.'
                            : 'В выбранной категории записей нет.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((t) => {
                    const isTargetStorekeeper = t.targetWarehouse.responsibleUser?.id === user?.userId;
                    const isSourceStorekeeper = t.sourceWarehouse.responsibleUser?.id === user?.userId;
                    const canReceive = (isTargetStorekeeper || isAdmin) && t.status === 'IN_TRANSIT';
                    const canDispatch = (isSourceStorekeeper || isAdmin) && t.status === 'REQUESTED';

                    return (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ py: 1.25, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {t.transferNumber}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                {t.sourceWarehouse.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                МОЛ: {t.sourceWarehouse.responsibleUser?.displayName || 'Не назначен'}
                              </Typography>
                            </Box>
                            <ArrowForwardIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                                {t.targetWarehouse.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                МОЛ: {t.targetWarehouse.responsibleUser?.displayName || 'Не назначен'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <Stack spacing={0.5}>
                            {t.items.map((it) => (
                              <Typography key={it.id} variant="caption" sx={{ color: '#334155', display: 'block' }}>
                                • <b>{it.nomenclature?.name}</b>: {it.quantity} {it.nomenclature?.unit || 'шт'}
                                {it.targetCell && (
                                  <Chip
                                    size="small"
                                    label={`Ячейка: ${it.targetCell.code}`}
                                    sx={{ height: 18, fontSize: '0.65rem', ml: 0.75 }}
                                  />
                                )}
                              </Typography>
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          {t.rejectionReason ? (
                            <Box sx={{ p: 0.75, bgcolor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                              <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block' }}>
                                Отказ:
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#991b1b' }}>
                                {t.rejectionReason}
                              </Typography>
                            </Box>
                          ) : t.requestReason ? (
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              {t.requestReason}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.25, fontSize: '0.75rem', color: '#64748b' }}>
                          {formatDateTime(t.createdAt)}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.25 }}>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {canReceive && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckIcon />}
                                  onClick={() => setSelectedTransferForReceive(t)}
                                  sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                                >
                                  Принять
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<BlockIcon />}
                                  onClick={() => setSelectedTransferForReject(t)}
                                  sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                                >
                                  Отклонить
                                </Button>
                              </>
                            )}
                            {canDispatch && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={isDispatchingId === t.id ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
                                  onClick={() => handleQuickDispatch(t)}
                                  disabled={isDispatchingId === t.id}
                                  sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                                >
                                  Отгрузить
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<BlockIcon />}
                                  onClick={() => setSelectedTransferForReject(t)}
                                  sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                                >
                                  Отказать
                                </Button>
                              </>
                            )}
                            {!canReceive && !canDispatch && (
                              <Typography variant="caption" color="text.secondary">
                                {t.status === 'COMPLETED' ? '✓ Проведено' : t.status === 'REJECTED' ? '✕ Закрыто' : 'Ожидание МОЛ'}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </DataTableWrapper>
        </>
      )}

      {/* Modal: Мастер складских операций */}
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

      {/* Modal: Запрос перевода ТМЦ */}
      <TransferRequestDialog
        open={isRequestDialogOpen}
        onClose={() => setIsRequestDialogOpen(false)}
        onSuccess={() => {
          fetchTransfers();
          setActiveMainTab('transfers');
        }}
      />

      {/* Modal: Приемка ТМЦ */}
      <TransferReceiveDialog
        open={Boolean(selectedTransferForReceive)}
        transfer={selectedTransferForReceive}
        onClose={() => setSelectedTransferForReceive(null)}
        onSuccess={() => {
          fetchTransfers();
          enqueueSnackbar('Приемка ТМЦ успешно подтверждена', { variant: 'success' });
        }}
      />

      {/* Modal: Отклонение перемещения */}
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
