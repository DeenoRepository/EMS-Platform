'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { useSearchParams } from 'next/navigation';
import {
  AuditLogItem,
  EquipmentOption,
  AuditKpiStats,
} from './types';

const DEFAULT_STATS: AuditKpiStats = {
  total: 0,
  createCount: 0,
  updateCount: 0,
  deleteCount: 0,
};

export function useAuditRegistry(canAccess: boolean) {
  const { enqueueSnackbar } = useSnackbar();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>(searchParams?.get('action') || '');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>(searchParams?.get('entityType') || '');
  const [equipmentFilter, setEquipmentFilter] = useState<string>(searchParams?.get('equipmentId') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([]);
  const [stats, setStats] = useState<AuditKpiStats>(DEFAULT_STATS);

  // Load Equipment Dictionaries
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/eps/equipment?pageSize=100');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.items) {
            setEquipmentOptions(
              json.data.items.map((e: any) => ({
                id: e.id,
                name: e.name,
                inventoryNumber: e.inventoryNumber,
              }))
            );
          }
        }
      } catch {
        // ignore
      }
    }
    if (canAccess) {
      loadOptions();
    }
  }, [canAccess]);

  // Fetch Audit Logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (equipmentFilter) params.append('equipmentId', equipmentFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/eps/history?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setItems(json.data.items || []);
          setTotal(json.data.total || 0);
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке журнала аудита', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, actionFilter, entityTypeFilter, equipmentFilter, dateFrom, dateTo, enqueueSnackbar]);

  useEffect(() => {
    if (canAccess) {
      fetchLogs();
    }
  }, [canAccess, fetchLogs]);

  const handleKpiFilter = useCallback((act: string) => {
    setActionFilter((prev) => (prev === act ? '' : act));
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearch('');
    setActionFilter('');
    setEntityTypeFilter('');
    setEquipmentFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    search,
    actionFilter,
    entityTypeFilter,
    equipmentFilter,
    dateFrom,
    dateTo,
    equipmentOptions,
    stats,
    setPage,
    setPageSize,
    setSearch,
    setActionFilter,
    setEntityTypeFilter,
    setEquipmentFilter,
    setDateFrom,
    setDateTo,
    fetchLogs,
    handleKpiFilter,
    handleResetFilters,
  };
}
