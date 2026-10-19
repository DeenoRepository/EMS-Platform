'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import {
  StockRow,
  WarehouseOption,
  CategoryOption,
  ZoneOption,
  STOCK_COLUMNS,
} from './types';

export function useStockRegistry() {
  const { enqueueSnackbar } = useSnackbar();
  const searchParams = useSearchParams();

  // Data States
  const [items, setItems] = useState<StockRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Columns visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    STOCK_COLUMNS.map((c) => c.id)
  );

  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(
    searchParams?.get('lowStockOnly') === 'true'
  );

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [globalLowStockCount, setGlobalLowStockCount] = useState<number>(0);
  const [serverPhysicalTotal, setServerPhysicalTotal] = useState<number | null>(null);
  const [serverInTransitTotal, setServerInTransitTotal] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Dictionaries
  useEffect(() => {
    async function loadDictionaries() {
      try {
        const [wRes, cRes] = await Promise.all([
          fetch('/api/wms/warehouses'),
          fetch('/api/wms/categories'),
        ]);
        if (wRes.ok) {
          const wData = await wRes.json();
          if (wData.success) setWarehouses(wData.data);
        }
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.success) setCategories(cData.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки справочников WMS:', err);
      }
    }
    loadDictionaries();
  }, []);

  // When warehouse changes, fetch its storage zones
  useEffect(() => {
    if (!selectedWarehouse) {
      setZones([]);
      setSelectedZone('');
      return;
    }
    async function loadZones() {
      try {
        const res = await fetch(`/api/wms/warehouses/${selectedWarehouse}/zones`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setZones(json.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки зон склада:', err);
      }
    }
    loadZones();
  }, [selectedWarehouse]);

  // Fetch Stock Items
  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        pageSize: rowsPerPage.toString(),
      });

      if (selectedWarehouse) params.append('warehouseId', selectedWarehouse);
      if (selectedZone) params.append('zoneId', selectedZone);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (search) params.append('search', search);
      if (lowStockOnly) params.append('lowStockOnly', 'true');

      const res = await fetch(`/api/wms/stock?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items || []);
          setTotalCount(json.data.total || 0);
          if (typeof json.data.lowStockTotalCount === 'number') {
            setGlobalLowStockCount(json.data.lowStockTotalCount);
          }
          if (typeof json.data.totalPhysicalQuantity === 'number') {
            setServerPhysicalTotal(json.data.totalPhysicalQuantity);
          }
          if (typeof json.data.totalInTransitQuantity === 'number') {
            setServerInTransitTotal(json.data.totalInTransitQuantity);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки остатков склада', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouse, selectedZone, selectedCategory, search, lowStockOnly, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const handleRequestSort = useCallback((property: string) => {
    setSortDirection((prevDir) => (sortField === property && prevDir === 'asc' ? 'desc' : 'asc'));
    setSortField(property);
  }, [sortField]);

  const handleResetFilters = useCallback(() => {
    setSelectedWarehouse('');
    setSelectedZone('');
    setSelectedCategory('');
    setSearch('');
    setLowStockOnly(false);
    setPage(0);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedWarehouse) count++;
    if (selectedZone) count++;
    if (selectedCategory) count++;
    if (search) count++;
    if (lowStockOnly) count++;
    return count;
  }, [selectedWarehouse, selectedZone, selectedCategory, search, lowStockOnly]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let aVal: any = a[sortField as keyof StockRow] ?? '';
      let bVal: any = b[sortField as keyof StockRow] ?? '';

      if (sortField === 'warehouse') {
        aVal = a.warehouseName;
        bVal = b.warehouseName;
      } else if (sortField === 'sku') {
        aVal = a.article;
        bVal = b.article;
      } else if (sortField === 'minQuantity') {
        aVal = Number(a.minStock) || 0;
        bVal = Number(b.minStock) || 0;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [items, sortField, sortDirection]);

  // Aggregate KPI stats
  const kpiStats = useMemo(() => {
    const fallbackPhysical = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const fallbackInTransit = items.reduce((sum, item) => sum + (Number(item.inTransitIn) || 0), 0);
    return {
      totalCount,
      totalPhysical: serverPhysicalTotal !== null ? serverPhysicalTotal : fallbackPhysical,
      globalLowStockCount,
      totalInTransit: serverInTransitTotal !== null ? serverInTransitTotal : fallbackInTransit,
    };
  }, [items, totalCount, globalLowStockCount, serverPhysicalTotal, serverInTransitTotal]);

  return {
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
  };
}
