'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { useSearchParams } from 'next/navigation';
import { DocumentItem, DocumentKpiCounts } from './types';

const DEFAULT_STATS: DocumentKpiCounts = {
  total: 0,
  passport: 0,
  schema: 0,
  manual: 0,
  certificate: 0,
};

export function useDocumentRegistry(canAccess: boolean) {
  const { enqueueSnackbar } = useSnackbar();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>(searchParams?.get('docType') || '');
  const [equipmentFilter, setEquipmentFilter] = useState<string>(searchParams?.get('equipmentId') || '');
  const [stats, setStats] = useState<DocumentKpiCounts>(DEFAULT_STATS);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (docTypeFilter) params.append('docType', docTypeFilter);
      if (equipmentFilter) params.append('equipmentId', equipmentFilter);

      const res = await fetch(`/api/eps/documents?${params.toString()}`);
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
      enqueueSnackbar('Ошибка загрузки электронного архива документов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, docTypeFilter, equipmentFilter, enqueueSnackbar]);

  useEffect(() => {
    if (canAccess) {
      fetchDocuments();
    }
  }, [canAccess, fetchDocuments]);

  const handleKpiFilter = useCallback((docType: string) => {
    setDocTypeFilter((prev) => (prev === docType ? '' : docType));
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearch('');
    setDocTypeFilter('');
    setEquipmentFilter('');
    setPage(1);
  }, []);

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    search,
    docTypeFilter,
    equipmentFilter,
    stats,
    setPage,
    setPageSize,
    setSearch,
    setDocTypeFilter,
    setEquipmentFilter,
    fetchDocuments,
    handleKpiFilter,
    handleResetFilters,
  };
}
