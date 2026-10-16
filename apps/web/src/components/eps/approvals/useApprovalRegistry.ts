'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { useSearchParams } from 'next/navigation';
import { ApprovalItem, ApprovalKpiStats } from './types';

const DEFAULT_STATS: ApprovalKpiStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  toReview: 0,
  myPending: 0,
};

export function useApprovalRegistry(canAccess: boolean) {
  const { enqueueSnackbar } = useSnackbar();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams?.get('status') || '');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams?.get('type') || '');
  const [stats, setStats] = useState<ApprovalKpiStats>(DEFAULT_STATS);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);

      const res = await fetch(`/api/eps/approvals?${params.toString()}`);
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
      enqueueSnackbar('Ошибка загрузки очереди согласований', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, typeFilter, enqueueSnackbar]);

  useEffect(() => {
    if (canAccess) {
      fetchApprovals();
    }
  }, [canAccess, fetchApprovals]);

  const handleKpiFilter = useCallback((status: string) => {
    setStatusFilter((prev) => (prev === status ? '' : status));
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  }, []);

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    search,
    statusFilter,
    typeFilter,
    stats,
    setPage,
    setPageSize,
    setSearch,
    setStatusFilter,
    setTypeFilter,
    fetchApprovals,
    handleKpiFilter,
    handleResetFilters,
  };
}
