'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import { PlatformMaintenanceStatus, EQUIPMENT_STATUS_MAP, formatDate } from '@ems/shared';
import { TableColumnOption } from '@/components/ui';
import {
  EquipmentFilters,
  DEFAULT_EQUIPMENT_FILTERS,
} from '@/components/eps';
import {
  buildEquipmentFilterSearchParams,
  countActiveEquipmentFilters,
  getActiveEquipmentFilterBadges,
} from '@/lib/eps-filter-helpers';
import {
  isTruthyBoolean,
  checkEquipmentCardCompleteness,
  getEquipmentFieldValue,
} from '@/lib/eps-helpers';
import {
  EquipmentItem,
  CustomSectionDefItem,
  EquipmentKpiCounts,
  DEFAULT_KPI_COUNTS,
} from './types';

export function useEquipmentRegistry(canAccess: boolean) {
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<EquipmentFilters>(() => ({
    ...DEFAULT_EQUIPMENT_FILTERS,
    search: searchParams?.get('search') || '',
    status: searchParams?.get('status') || '',
  }));

  const [sortField, setSortField] = useState<string>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusCounts, setStatusCounts] = useState<EquipmentKpiCounts>(DEFAULT_KPI_COUNTS);
  const [maintStatus, setMaintStatus] = useState<PlatformMaintenanceStatus | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sections, setSections] = useState<CustomSectionDefItem[]>([]);

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

  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch('/api/eps/custom-sections');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSections(json.data.sections || []);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildEquipmentFilterSearchParams(
        filters,
        page,
        pageSize,
        sortField,
        sortDirection
      );

      const res = await fetch(`/api/eps/equipment?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const list = Array.isArray(json.data) ? json.data : json.data.items || [];
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
  }, [page, pageSize, filters, sortField, sortDirection, enqueueSnackbar]);

  useEffect(() => {
    if (canAccess) {
      fetchEquipment();
    }
  }, [canAccess, fetchEquipment]);

  const handleFilterChange = useCallback((key: keyof EquipmentFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_EQUIPMENT_FILTERS);
    setPage(1);
  }, []);

  const handleApplyFilters = useCallback((newFilters: EquipmentFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleResetSingleFilter = useCallback((keysToReset: (keyof EquipmentFilters)[]) => {
    setFilters((prev) => {
      const next = { ...prev };
      for (const k of keysToReset) {
        if (k in next) {
          (next as any)[k] = '';
        }
      }
      return next;
    });
    setPage(1);
  }, []);

  const handleKpiFilter = useCallback((status: string | null) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? '' : status || '',
    }));
    setPage(1);
  }, []);

  const handleRequestSort = useCallback((property: string) => {
    setSortDirection((prevDir) => (sortField === property && prevDir === 'asc' ? 'desc' : 'asc'));
    setSortField(property);
    setPage(1);
  }, [sortField]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  }, [items]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const tableColumns = useMemo<TableColumnOption[]>(() => {
    if (!sections || sections.length === 0) {
      return [];
    }

    const cols: TableColumnOption[] = [];
    const hasRequiredFields = sections.some((s) => (s.fields || []).some((f) => f.isRequired));
    if (hasRequiredFields) {
      cols.push({ id: 'completeness', label: 'Полнота заполнения карточки', defaultVisible: true });
    }

    const seenKeys = new Set<string>();
    for (const sec of sections) {
      for (const f of sec.fields || []) {
        if (!seenKeys.has(f.key)) {
          seenKeys.add(f.key);
          cols.push({
            id: f.key,
            label: f.unit ? `${f.name} (${f.unit})` : f.name,
            defaultVisible: true,
          });
        }
      }
    }

    return cols;
  }, [sections]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    if (tableColumns.length > 0) {
      const allIds = tableColumns.map((c) => c.id);
      setVisibleColumns((prev) => {
        const valid = prev.filter((id) => allIds.includes(id));
        return valid.length > 0 ? valid : allIds;
      });
    } else {
      setVisibleColumns([]);
    }
  }, [tableColumns]);

  const sortedEquipmentList = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      if (sortField === 'completeness') {
        aVal = checkEquipmentCardCompleteness(a).isIncomplete ? 1 : 0;
        bVal = checkEquipmentCardCompleteness(b).isIncomplete ? 1 : 0;
      } else {
        aVal = getEquipmentFieldValue(a, sortField);
        bVal = getEquipmentFieldValue(b, sortField);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [items, sortField, sortDirection]);

  const activeFilterCount = useMemo(() => countActiveEquipmentFilters(filters), [filters]);

  const activeBadges = useMemo(() => {
    const statusMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(EQUIPMENT_STATUS_MAP)) {
      statusMap[k] = v.label;
    }
    return getActiveEquipmentFilterBadges(filters, [], statusMap);
  }, [filters]);

  const handleBulkExport = useCallback(() => {
    const listToExport =
      selectedIds.length > 0 ? items.filter((i) => selectedIds.includes(i.id)) : sortedEquipmentList;

    if (listToExport.length === 0) {
      enqueueSnackbar('Нет оборудования для экспорта', { variant: 'warning' });
      return;
    }

    const exportColumns = tableColumns.filter((col) => col.id !== 'completeness');
    const exportRows = listToExport.map((eq, idx) => {
      const row: Record<string, any> = { '№ п/п': idx + 1 };
      for (const col of exportColumns) {
        if (col.id === 'status') {
          row[col.label] = EQUIPMENT_STATUS_MAP[eq.status]?.label || eq.status;
        } else if (col.id === 'is_unique' || col.id === 'is_imported' || col.id === 'is_critical_path') {
          row[col.label] = isTruthyBoolean(getEquipmentFieldValue(eq, col.id)) ? 'Да' : 'Нет';
        } else if (col.id === 'commissionDate' || col.id === 'commission_date') {
          row[col.label] = formatDate(getEquipmentFieldValue(eq, col.id) || eq.commissionDate);
        } else {
          const value = getEquipmentFieldValue(eq, col.id);
          row[col.label] = value === undefined || value === null || value === '' ? '—' : value;
        }
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Оборудование');

    const fileName = `equipment_registry_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    enqueueSnackbar(`Выгружено ${listToExport.length} записей в файл ${fileName}`, { variant: 'success' });
  }, [items, selectedIds, sortedEquipmentList, tableColumns, enqueueSnackbar]);

  return {
    items,
    sortedEquipmentList,
    total,
    page,
    pageSize,
    loading,
    filters,
    sortField,
    sortDirection,
    statusCounts,
    maintStatus,
    selectedIds,
    sections,
    tableColumns,
    visibleColumns,
    activeFilterCount,
    activeBadges,
    setPage,
    setPageSize,
    setVisibleColumns,
    setSelectedIds,
    fetchEquipment,
    handleFilterChange,
    handleApplyFilters,
    handleResetFilters,
    handleResetSingleFilter,
    handleKpiFilter,
    handleRequestSort,
    handleSelectAll,
    handleToggleSelect,
    handleBulkExport,
  };
}
