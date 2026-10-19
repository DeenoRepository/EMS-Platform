'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import {
  InventoryItemSummary,
  InventoryWarehouseOption,
  InventoryKpiStats,
} from './types';

export function useInventoryRegistry(canAccess: boolean, userId?: string) {
  const { enqueueSnackbar } = useSnackbar();

  const [inventories, setInventories] = useState<InventoryItemSummary[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const fetchInventories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/wms/inventories');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setInventories(json.data);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки актов инвентаризации', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (canAccess) {
      fetchInventories();
      async function loadWarehouses() {
        try {
          const res = await fetch('/api/wms/warehouses');
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              setWarehouses(json.data);
            }
          }
        } catch {
          // ignore
        }
      }
      loadWarehouses();
    }
  }, [canAccess, fetchInventories]);

  const handleRequestSort = useCallback((property: string) => {
    setSortDirection((prevDir) => (sortField === property && prevDir === 'asc' ? 'desc' : 'asc'));
    setSortField(property);
  }, [sortField]);

  const handleResetFilters = useCallback(() => {
    setSearch('');
    setSelectedWarehouse('');
    setSelectedStatus('');
    setPage(0);
  }, []);

  const activeFilterCount = (search ? 1 : 0) + (selectedWarehouse ? 1 : 0) + (selectedStatus ? 1 : 0);

  const filteredInventories = useMemo(() => {
    return inventories.filter((inv) => {
      if (selectedWarehouse && inv.warehouseId !== selectedWarehouse) return false;
      if (selectedStatus && inv.status !== selectedStatus) return false;
      if (search) {
        const query = search.toLowerCase();
        const codeMatch = `INV-${inv.id.slice(-6)}`.toLowerCase().includes(query);
        const warehouseMatch =
          inv.warehouse.name.toLowerCase().includes(query) ||
          inv.warehouse.code.toLowerCase().includes(query);
        const authorMatch = inv.createdBy?.displayName?.toLowerCase().includes(query);
        if (!codeMatch && !warehouseMatch && !authorMatch) return false;
      }
      return true;
    });
  }, [inventories, selectedWarehouse, selectedStatus, search]);

  const sortedInventories = useMemo(() => {
    if (!sortField) return filteredInventories;
    return [...filteredInventories].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (sortField) {
        case 'code':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'warehouse':
          aVal = a.warehouse.name;
          bVal = b.warehouse.name;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'count':
          aVal = a._count.items;
          bVal = b._count.items;
          break;
        case 'date':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'author':
          aVal = a.createdBy?.displayName || '';
          bVal = b.createdBy?.displayName || '';
          break;
        default:
          aVal = (a as unknown as Record<string, unknown>)[sortField] ?? '';
          bVal = (b as unknown as Record<string, unknown>)[sortField] ?? '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [filteredInventories, sortField, sortDirection]);

  const paginatedInventories = useMemo(() => {
    return sortedInventories.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [sortedInventories, page, rowsPerPage]);

  const kpiStats = useMemo<InventoryKpiStats>(() => {
    const total = inventories.length;
    const inProgress = inventories.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'DRAFT').length;
    const completed = inventories.filter((i) => i.status === 'COMPLETED').length;
    const totalPositionsCount = inventories.reduce((acc, i) => acc + (i._count?.items || 0), 0);
    return { total, inProgress, completed, totalPositionsCount };
  }, [inventories]);

  return {
    inventories,
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
  };
}
