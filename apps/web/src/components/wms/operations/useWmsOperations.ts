'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { OperationType } from '@/components/wms';
import {
  StockOperation,
  TransferRecord,
  OPERATIONS_COLUMNS,
} from './types';

export function useWmsOperations() {
  const { enqueueSnackbar } = useSnackbar();
  const searchParams = useSearchParams();

  const [activeMainTab, setActiveMainTab] = useState<'operations' | 'transfers'>(
    (searchParams?.get('tab') as any) || 'operations'
  );

  // Operations Data State
  const [operations, setOperations] = useState<StockOperation[]>([]);
  const [isLoadingOps, setIsLoadingOps] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(searchParams?.get('action') || '');
  const [opsPage, setOpsPage] = useState<number>(0);
  const [opsRowsPerPage, setOpsRowsPerPage] = useState<number>(25);
  const [opsTotalCount, setOpsTotalCount] = useState<number>(0);

  // Transfers Data State
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [transferTab, setTransferTab] = useState<'inbound' | 'requests' | 'outbound' | 'all'>('inbound');
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
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<TransferRecord | null>(null);
  const [selectedTransferForReject, setSelectedTransferForReject] = useState<TransferRecord | null>(null);

  // Columns visibility for Operations
  const [visibleOpsColumns, setVisibleOpsColumns] = useState<string[]>(() =>
    OPERATIONS_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
  );

  // Handle URL actions on mount
  useEffect(() => {
    const action = searchParams?.get('action') || searchParams?.get('create');
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
    fetchTransfers();
  }, [selectedWarehouse, fetchTransfers]);

  useEffect(() => {
    if (activeMainTab === 'operations') {
      fetchOperations();
    } else {
      fetchTransfers();
    }
  }, [activeMainTab, fetchOperations, fetchTransfers]);

  // Quick Dispatch Handler
  const handleQuickDispatch = useCallback(async (t: TransferRecord) => {
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
    }
  }, [enqueueSnackbar, fetchTransfers]);

  // Calculated KPI stats
  const kpiStats = useMemo(() => {
    const receipts = operations.filter((o) => o.type === 'RECEIPT').length;
    const issues = operations.filter(
      (o) => o.type === 'ISSUE_EMPLOYEE' || o.type === 'ISSUE_WRITE_OFF'
    ).length;
    return {
      totalOps: opsTotalCount,
      receiptCount: receipts,
      issueCount: issues,
      transitCount: transferCounts.outbound + transferCounts.inbound,
    };
  }, [operations, opsTotalCount, transferCounts]);

  return {
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
  };
}
