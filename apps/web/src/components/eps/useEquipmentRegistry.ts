'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import { PERMISSIONS, PlatformMaintenanceStatus } from '@ems/shared';
import {
  EPS_COLUMNS,
  sortEquipmentRegistry,
  type EquipmentRegistryItem,
} from './equipment-registry-model';
import { exportEquipmentToExcel } from './equipment-export';
import type { EquipmentStatusCounts } from './EquipmentKpiCards';

export interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

const DEFAULT_PAGE_SIZE = 25;
const GRID_PAGE_SIZE = 12;

export function useEquipmentRegistry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<EquipmentRegistryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [openCreateWizard, setOpenCreateWizard] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || '');
  const [tagFilter, setTagFilter] = useState(searchParams?.get('tagId') || '');

  // Status Counts for KPI
  const [statusCounts, setStatusCounts] = useState<EquipmentStatusCounts>({
    total: 0,
    active: 0,
    underRepair: 0,
    inStorage: 0,
    decommissioned: 0,
  });

  const [maintStatus, setMaintStatus] = useState<PlatformMaintenanceStatus | null>(null);

  useEffect(() => {
    fetch('/api/system/maintenance')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setMaintStatus(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/eps/tags');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTags(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: viewMode === 'grid' ? String(GRID_PAGE_SIZE) : String(pageSize),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (tagFilter) params.append('tagId', tagFilter);

      const res = await fetch(`/api/eps/equipment?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const list = Array.isArray(json.data) ? json.data : (json.data.items || []);
          setItems(list);
          setTotal(json.data.total ?? json.meta?.total ?? list.length);
          if (json.data.statusCounts || json.meta?.statusCounts) {
            setStatusCounts(json.data.statusCounts || json.meta?.statusCounts);
          }
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
      enqueueSnackbar('Ошибка при загрузке реестра оборудования', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, tagFilter, viewMode, enqueueSnackbar]);

  const canAccessEquipment = Boolean(
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.EPS_EQUIPMENT_VIEW) ||
    hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE)
  );

  useEffect(() => {
    if (canAccessEquipment) {
      fetchTags();
      fetchEquipment();
    }
  }, [canAccessEquipment, fetchTags, fetchEquipment]);

  const handleResetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setTagFilter('');
    setPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (statusFilter) count++;
    if (tagFilter) count++;
    return count;
  }, [search, statusFilter, tagFilter]);

  const handleKpiFilter = useCallback((status: string | null) => {
    setStatusFilter((prev) => (prev === status ? '' : status || ''));
    setPage(1);
  }, []);

  const canCreate = hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Columns visibility & Sorting
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    EPS_COLUMNS.map((c) => c.id)
  );
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const equipmentList = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const handleRequestSort = useCallback((property: string) => {
    setSortField((prevField) => {
      setSortDirection((prevDir) => (prevField === property && prevDir === 'asc' ? 'desc' : 'asc'));
      return property;
    });
  }, []);

  const sortedEquipmentList = useMemo(
    () => sortEquipmentRegistry(equipmentList, sortField, sortDirection),
    [equipmentList, sortField, sortDirection]
  );

  const handleRowClick = useCallback((eq: EquipmentRegistryItem) => {
    router.push(`/eps/${eq.id}`);
  }, [router]);

  const handleToggleSelect = useCallback((id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleToggleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(equipmentList.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  }, [equipmentList]);

  const handleBulkExport = useCallback(() => {
    if (equipmentList.length === 0) {
      enqueueSnackbar('Нет оборудования для экспорта', { variant: 'warning' });
      return;
    }
    const result = exportEquipmentToExcel(sortedEquipmentList, selectedIds);
    enqueueSnackbar(`Выгружено ${result.count} записей в файл ${result.fileName}`, { variant: 'success' });
  }, [equipmentList.length, sortedEquipmentList, selectedIds, enqueueSnackbar]);

  const isAdmin = Boolean(user?.roles?.includes('admin') || user?.roles?.includes('administrator'));
  const isModuleInMaintenance = Boolean(maintStatus?.modules.eps?.enabled);

  return {
    items,
    tags,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    loading,
    viewMode,
    setViewMode,
    openCreateWizard,
    setOpenCreateWizard,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    tagFilter,
    setTagFilter,
    statusCounts,
    maintStatus,
    fetchEquipment,
    canAccessEquipment,
    canCreate,
    activeFilterCount,
    handleResetFilters,
    handleKpiFilter,
    selectedIds,
    setSelectedIds,
    visibleColumns,
    setVisibleColumns,
    sortField,
    sortDirection,
    handleRequestSort,
    sortedEquipmentList,
    handleRowClick,
    handleToggleSelect,
    handleToggleSelectAll,
    handleBulkExport,
    isAdmin,
    isModuleInMaintenance,
    router,
  };
}
