'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Paper,
  Checkbox,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined';
import InventoryIcon from '@mui/icons-material/Inventory';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterListIcon from '@mui/icons-material/FilterList';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { EQUIPMENT_STATUS_MAP, formatDate, PERMISSIONS } from '@ems/shared';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import {
  getEquipmentKind,
  getEquipmentDepartment,
  isTruthyBoolean,
  checkEquipmentCardCompleteness,
  getEquipmentFieldValue,
} from '@/lib/eps-helpers';
import {
  StatCard,
  StatusBadge,
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  CriticalAlertBanner,
  BulkActionBar,
  PageLoading,
  ModuleMaintenanceState,
  type TableDensity,
  type TableColumnOption,
} from '@/components/ui';
import {
  EquipmentWizardDialog,
  EquipmentFilterDrawer,
  EquipmentColumnFiltersRow,
  EquipmentActiveFilterChips,
  EquipmentBatchEditDialog,
  EquipmentPurgeDialog,
  type EquipmentFilters,
  DEFAULT_EQUIPMENT_FILTERS,
} from '@/components/eps';
import {
  countActiveEquipmentFilters,
  getActiveEquipmentFilterBadges,
  buildEquipmentFilterSearchParams,
} from '@/lib/eps-filter-helpers';
import { PlatformMaintenanceStatus } from '@ems/shared';

interface EquipmentItem {
  id: string;
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: string;
  commissionDate: string | null;
  primaryPhoto: string | null;
  customFields?: Record<string, any> | null;
  tags: { id: string; name: string; color: string | null }[];
  counts?: { documents: number; photos: number; maintenancePlans: number; spareParts: number };
  _count?: { documents?: number; photos?: number; maintenancePlans?: number; spareParts?: number };
  createdAt: string;
  updatedAt: string;
}

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface CustomFieldDefItem {
  id: string;
  key: string;
  name: string;
  fieldType: string;
  unit: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options: string[] | null;
  sortOrder: number;
}

interface CustomSectionDefItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldDefItem[];
}

function renderDynamicTableCell(eq: EquipmentItem, colId: string) {
  const val = getEquipmentFieldValue(eq, colId);

  if (colId === 'status') {
    return <StatusBadge status={eq.status} />;
  }

  if (colId === 'criticality') {
    const crit = String(val || '').trim().toUpperCase();
    if (!crit) return <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>;
    return (
      <Chip
        label={`Класс ${crit}`}
        size="small"
        sx={{
          height: 22,
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor:
            crit === 'A'
              ? 'rgba(239, 68, 68, 0.1)'
              : crit === 'B'
              ? 'rgba(245, 158, 11, 0.1)'
              : 'rgba(14, 165, 233, 0.1)',
          color:
            crit === 'A'
              ? '#dc2626'
              : crit === 'B'
              ? '#d97706'
              : '#0284c7',
          borderRadius: '4px',
        }}
      />
    );
  }

  if (colId === 'actualWear' || colId === 'actual_wear_percentage') {
    if (val === undefined || val === null || val === '') {
      return <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>;
    }
    const num = Number(val);
    const color = num >= 70 ? 'error.main' : num >= 40 ? 'warning.main' : 'success.main';
    return (
      <Typography variant="body2" sx={{ fontWeight: 700, color, fontSize: '0.8125rem' }}>
        {num}%
      </Typography>
    );
  }

  if (colId === 'is_unique' || colId === 'is_imported' || colId === 'is_critical_path') {
    const isTrue = isTruthyBoolean(val);
    return (
      <Chip
        label={isTrue ? 'Да' : 'Нет'}
        size="small"
        variant="outlined"
        color={isTrue ? 'primary' : 'default'}
        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px' }}
      />
    );
  }

  if (colId === 'commissionDate' || colId === 'commission_date') {
    return formatDate(val || eq.commissionDate);
  }

  if (colId === 'updatedAt' || colId === 'createdAt') {
    return formatDate(val);
  }

  if (colId === 'serialNumber') {
    return val ? (
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
        {val}
      </Typography>
    ) : (
      '—'
    );
  }

  return val !== undefined && val !== null && val !== '' ? String(val) : '—';
}

function EquipmentListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [density, setDensity] = useState<TableDensity>('standard');

  // View mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [openCreateWizard, setOpenCreateWizard] = useState(false);

  // Comprehensive Filters across technical sections
  const [filters, setFilters] = useState<EquipmentFilters>(() => ({
    ...DEFAULT_EQUIPMENT_FILTERS,
    search: searchParams?.get('search') || '',
    status: searchParams?.get('status') || '',
  }));
  const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  // Sorting state for whole-database query
  const [sortField, setSortField] = useState<string>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Status Counts for KPI
  const [statusCounts, setStatusCounts] = useState({
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

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildEquipmentFilterSearchParams(
        filters,
        page,
        viewMode === 'grid' ? 12 : pageSize,
        sortField,
        sortDirection
      );

      const res = await fetch(`/api/eps/equipment?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const list = Array.isArray(json.data) ? json.data : (json.data.items || []);
          setItems(list);
          setTotal(json.data.total ?? json.meta?.total ?? list.length);
          setTotalPages(json.data.totalPages ?? json.meta?.totalPages ?? 1);
          if (json.data.statusCounts || json.meta?.statusCounts) {
            setStatusCounts(json.data.statusCounts || json.meta?.statusCounts);
          }
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch (e) {
      setItems([]);
      enqueueSnackbar('Ошибка при загрузке реестра оборудования', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, sortField, sortDirection, viewMode, enqueueSnackbar]);

  const canAccessEquipment =
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.EPS_EQUIPMENT_VIEW) ||
    hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);

  useEffect(() => {
    if (canAccessEquipment) {
      fetchEquipment();
    }
  }, [canAccessEquipment, fetchEquipment]);

  // Filter change handlers
  const handleFilterChange = (key: keyof EquipmentFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_EQUIPMENT_FILTERS);
    setPage(1);
  };

  const handleResetSingleFilter = (keysToReset: (keyof EquipmentFilters)[]) => {
    setFilters((prev) => {
      const next = { ...prev };
      for (const k of keysToReset) {
        next[k] = '';
      }
      return next;
    });
    setPage(1);
  };

  const activeFilterCount = useMemo(() => countActiveEquipmentFilters(filters), [filters]);

  // Адаптивный расчет высоты таблицы, чтобы горизонтальный скроллбар и пагинация
  // всегда находились внутри видимой области окна браузера (viewport)
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [tableMaxHeight, setTableMaxHeight] = useState<number | string>('calc(100vh - 180px)');
  const [showKpiCards, setShowKpiCards] = useState<boolean>(true);

  const calculateTableHeight = useCallback(() => {
    if (typeof window === 'undefined') return;
    const elem = tableWrapperRef.current;
    if (!elem) {
      setTableMaxHeight('calc(100vh - 180px)');
      return;
    }
    const rect = elem.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Минимальный аккуратный зазор от нижней кромки видимого окна браузера (8px),
    // чтобы пагинация находилась максимально близко к низу окна
    const bottomGap = 8;
    const headerHeight = 64;
    const effectiveTop = Math.max(headerHeight, rect.top);
    const availableHeight = viewportHeight - effectiveTop - bottomGap;

    const finalHeight = Math.max(360, Math.floor(availableHeight));
    setTableMaxHeight(finalHeight);
  }, []);

  useEffect(() => {
    calculateTableHeight();
    const handleResize = () => calculateTableHeight();
    const handleScroll = () => calculateTableHeight();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && tableWrapperRef.current) {
      resizeObserver = new ResizeObserver(() => {
        calculateTableHeight();
      });
      resizeObserver.observe(tableWrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
    };
  }, [calculateTableHeight, activeFilterCount, showColumnFilters, viewMode, showKpiCards]);

  const activeBadges = useMemo(() => {
    const statusMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(EQUIPMENT_STATUS_MAP)) {
      statusMap[k] = v.label;
    }
    return getActiveEquipmentFilterBadges(filters, [], statusMap);
  }, [filters]);

  // Quick filter by clicking KPI card
  const handleKpiFilter = (status: string | null) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? '' : status || '',
    }));
    setPage(1);
  };

  const canCreate = hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);
  const canImport = hasPermission(PERMISSIONS.EPS_IMPORT_EXECUTE);
  const canBatchEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_BATCH_EDIT);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openBatchEditDialog, setOpenBatchEditDialog] = useState<boolean>(false);
  const [openPurgeDialog, setOpenPurgeDialog] = useState<boolean>(false);

  // Active Technical Sections and their configured fields
  const [sections, setSections] = useState<CustomSectionDefItem[]>([]);

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

  // Таблица реестра отображает строго только те колонки, что присутствуют в разделах паспорта
  const tableColumns = useMemo<TableColumnOption[]>(() => {
    if (!sections || sections.length === 0) {
      return [];
    }

    const cols: TableColumnOption[] = [];
    const hasRequiredFields = sections.some((s) => (s.fields || []).some((f) => f.isRequired));
    if (hasRequiredFields) {
      cols.push({ id: 'completeness', label: 'Полнота карточки', defaultVisible: true });
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

  // Columns visibility synced with tableColumns
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

  const equipmentList = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
    setPage(1);
  };

  const sortedEquipmentList = useMemo(() => {
    if (!sortField) return equipmentList;
    return [...equipmentList].sort((a, b) => {
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
  }, [equipmentList, sortField, sortDirection]);

  const handleRowClick = (eq: EquipmentItem) => {
    router.push(`/eps/${eq.id}`);
  };

  // Bulk Export Handlers
  const handleBulkExport = () => {
    const listToExport =
      selectedIds.length > 0
        ? equipmentList.filter((i) => selectedIds.includes(i.id))
        : sortedEquipmentList;

    if (listToExport.length === 0) {
      enqueueSnackbar('Нет оборудования для экспорта', { variant: 'warning' });
      return;
    }

    const exportColumns = tableColumns.filter((col) => col.id !== 'completeness');

    const exportRows = listToExport.map((eq, idx) => {
      const row: Record<string, any> = {
        '№ п/п': idx + 1,
      };
      for (const col of exportColumns) {
        if (col.id === 'status') {
          row[col.label] = EQUIPMENT_STATUS_MAP[eq.status]?.label || eq.status;
        } else if (col.id === 'is_unique' || col.id === 'is_imported' || col.id === 'is_critical_path') {
          row[col.label] = isTruthyBoolean(getEquipmentFieldValue(eq, col.id)) ? 'Да' : 'Нет';
        } else if (col.id === 'commissionDate' || col.id === 'commission_date') {
          row[col.label] = formatDate(getEquipmentFieldValue(eq, col.id) || eq.commissionDate);
        } else {
          row[col.label] = getEquipmentFieldValue(eq, col.id) || '—';
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
  };

  const handleBulkPrint = () => {
    window.print();
  };

  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('administrator');
  const isModuleInMaintenance = Boolean(maintStatus?.modules.eps?.enabled);

  if (isModuleInMaintenance && !isAdmin) {
    return (
      <ModuleMaintenanceState
        moduleName="Паспортизация оборудования (EPS)"
        message={maintStatus?.modules.eps.message}
        estimatedUntil={maintStatus?.modules.eps.estimatedUntil}
        onRefresh={fetchEquipment}
      />
    );
  }

  if (!canAccessEquipment) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Реестр технологического оборудования"
          subtitle="Паспортизация, технические характеристики, эксплуатационный статус и жизненный цикл оборудования"
          breadcrumbs={[
            { label: 'Главная', href: '/' },
            { label: 'Реестр оборудования' },
          ]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет полномочий для просмотра реестра и паспортов оборудования (требуется право eps.equipment.view)."
          icon={<PrecisionManufacturingIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 0.5 }}>
      {/* Admin Maintenance Preview Banner */}
      {isModuleInMaintenance && (
        <Alert
          severity="warning"
          sx={{
            mb: 2.5,
            borderRadius: '12px',
            border: '1px solid #fed7aa',
            backgroundColor: '#fffbeb',
            fontWeight: 500,
          }}
        >
          <strong>Режим предпросмотра администратора:</strong> Модуль переведен в режим технического обслуживания. Для обычных пользователей модуль временно закрыт.
        </Alert>
      )}

      {/* Page Header */}
      <PageHeader
        title="Реестр технологического оборудования"
        subtitle="Паспортизация, технические характеристики, эксплуатационный статус и жизненный цикл оборудования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Реестр оборудования' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Tooltip title={showKpiCards ? 'Скрыть блок KPI карточек для увеличения места под таблицу' : 'Показать аналитические карточки KPI'}>
              <Button
                variant="outlined"
                startIcon={<BarChartIcon />}
                onClick={() => setShowKpiCards((prev) => !prev)}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  borderColor: 'divider',
                  color: showKpiCards ? 'text.secondary' : 'primary.main',
                  px: 1.5,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: 'background.paper',
                  boxSizing: 'border-box',
                  '&:hover': {
                    borderColor: 'grey.400',
                    backgroundColor: 'background.default',
                  },
                }}
              >
                {showKpiCards ? 'Скрыть KPI' : 'Показать KPI'}
              </Button>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleBulkExport}
              sx={{
                height: 38,
                borderRadius: '8px',
                borderColor: 'divider',
                color: 'text.secondary',
                px: 2,
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'none',
                backgroundColor: 'background.paper',
                boxSizing: 'border-box',
                '&:hover': {
                  borderColor: 'grey.400',
                  backgroundColor: 'background.default',
                },
              }}
            >
              Экспорт
            </Button>
            {canBatchEdit && (
              <Button
                variant="outlined"
                startIcon={<FindReplaceIcon />}
                onClick={() => setOpenBatchEditDialog(true)}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  borderColor: 'divider',
                  color: 'primary.main',
                  px: 2,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: 'background.paper',
                  boxSizing: 'border-box',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                Массовое редактирование
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteForeverIcon />}
                onClick={() => setOpenPurgeDialog(true)}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  borderColor: 'error.main',
                  color: 'error.main',
                  px: 2,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: 'background.paper',
                  boxSizing: 'border-box',
                  '&:hover': {
                    borderColor: 'error.dark',
                    backgroundColor: 'error.50',
                  },
                }}
              >
                Очистить базу
              </Button>
            )}
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenCreateWizard(true)}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  px: 2.25,
                  boxSizing: 'border-box',
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                Добавить оборудование
              </Button>
            )}
          </Box>
        }
      />

      {/* Critical Equipment Alert Banner (for equipment in repair) */}
      {statusCounts.underRepair > 0 && (
        <CriticalAlertBanner
          alerts={[
            {
              id: 'under-repair-alert',
              severity: 'WARNING',
              title: 'Оборудование требует завершения ремонта.',
              description: `Есть ${statusCounts.underRepair} запись с просроченным сроком технического обслуживания.`,
              actionLabel: 'Показать список',
              onAction: () => handleKpiFilter('UNDER_REPAIR'),
              count: statusCounts.underRepair,
            },
          ]}
        />
      )}

      {/* Top Interactive KPI Metric Cards */}
      {showKpiCards && (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="Всего оборудования"
              value={statusCounts.total}
              subtitle="Единиц в реестре"
              icon={<InventoryIcon sx={{ fontSize: 20 }} />}
              accentColor="#0284c7"
              active={!filters.status}
              onClick={() => handleKpiFilter(null)}
              loading={loading && statusCounts.total === 0}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="В работе"
              value={statusCounts.active}
              subtitle="В штатной эксплуатации"
              icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
              accentColor="#16a34a"
              active={filters.status === 'ACTIVE'}
              onClick={() => handleKpiFilter('ACTIVE')}
              loading={loading && statusCounts.total === 0}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="В ремонте"
              value={statusCounts.underRepair}
              subtitle="ТО или аварийные работы"
              icon={<BuildCircleOutlinedIcon sx={{ fontSize: 20 }} />}
              accentColor="#d97706"
              active={filters.status === 'UNDER_REPAIR'}
              onClick={() => handleKpiFilter('UNDER_REPAIR')}
              loading={loading && statusCounts.total === 0}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="На складе"
              value={statusCounts.inStorage}
              subtitle="Резерв и консервация"
              icon={<InventoryIcon sx={{ fontSize: 20 }} />}
              accentColor="#64748b"
              active={filters.status === 'IN_STORAGE'}
              onClick={() => handleKpiFilter('IN_STORAGE')}
              loading={loading && statusCounts.total === 0}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <StatCard
              title="Списано"
              value={statusCounts.decommissioned}
              subtitle="Выведено из эксплуатации"
              icon={<CancelOutlinedIcon sx={{ fontSize: 20 }} />}
              accentColor="#dc2626"
              active={filters.status === 'DECOMMISSIONED'}
              onClick={() => handleKpiFilter('DECOMMISSIONED')}
              loading={loading && statusCounts.total === 0}
            />
          </Grid>
        </Grid>
      )}

      {/* Unified Enterprise Data Grid: Filter Toolbar + Table/Grid + Pagination */}
      <Box ref={tableWrapperRef} sx={{ width: '100%' }}>
        {sections.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: '12px', textAlign: 'center' }}>
            <EmptyState
              title="Технические разделы и характеристики не настроены"
              description="В системе пока нет активных разделов паспорта. Настройте структуру технических разделов и характеристики оборудования в параметрах модуля EPS."
              actionText={
                user?.roles?.includes('admin') || hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE)
                  ? 'Перейти к настройке разделов'
                  : undefined
              }
              onAction={() => router.push('/admin/module-settings')}
              minHeight={280}
            />
          </Paper>
        ) : (
          <DataTableWrapper
            loading={loading}
            page={page - 1}
            pageSize={pageSize}
            total={total}
            onPageChange={(_, newPage) => setPage(newPage + 1)}
            onPageSizeChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
            stickyHeader
            maxHeight={tableMaxHeight}
            storageKey="eps_equipment_table"
            columns={tableColumns}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            selectionActions={
              canBatchEdit ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<FindReplaceIcon sx={{ fontSize: 15 }} />}
                  onClick={() => setOpenBatchEditDialog(true)}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    py: 0.2,
                    px: 1,
                    borderColor: '#15803d',
                    color: '#15803d',
                    textTransform: 'none',
                    backgroundColor: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#f0fdf4',
                      borderColor: '#15803d',
                    },
                  }}
                >
                  Массовое редактирование ({selectedIds.length})
                </Button>
              ) : undefined
            }
        empty={items.length === 0 && !loading}
        emptyState={
          <EmptyState
            icon={<PrecisionManufacturingIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
            title="Оборудование не найдено"
            description={
              activeFilterCount > 0
                ? 'По заданным критериям фильтрации ничего не найдено. Попробуйте сбросить фильтры.'
                : 'В реестре пока нет зарегистрированного оборудования.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : (canCreate ? 'Добавить оборудование' : undefined)}
            onAction={activeFilterCount > 0 ? handleResetFilters : (canCreate ? () => router.push('/eps/new') : undefined)}
          />
        }
        toolbar={
          <Box sx={{ width: '100%' }}>
            <FilterToolbar
              variant="embedded"
              activeFilterCount={activeFilterCount}
              onResetFilters={handleResetFilters}
              actions={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<FilterAltIcon fontSize="small" />}
                    onClick={() => setOpenFilterDrawer(true)}
                    sx={{
                      height: 36,
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      px: 1.5,
                      boxSizing: 'border-box',
                    }}
                  >
                    Все фильтры {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </Button>

                  <Tooltip title={showColumnFilters ? 'Скрыть фильтры в колонках' : 'Показать фильтры в колонках таблицы'}>
                    <Button
                      variant={showColumnFilters ? 'contained' : 'outlined'}
                      color={showColumnFilters ? 'secondary' : 'inherit'}
                      size="small"
                      startIcon={<FilterListIcon fontSize="small" />}
                      onClick={() => setShowColumnFilters((prev) => !prev)}
                      sx={{
                        height: 36,
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 1.25,
                        borderColor: 'divider',
                      }}
                    >
                      Фильтры колонок
                    </Button>
                  </Tooltip>

                  <TextField
                    select
                    size="small"
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    SelectProps={{ displayEmpty: true }}
                    sx={{
                      minWidth: 140,
                      backgroundColor: 'background.paper',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        height: 36,
                        '& fieldset': { borderColor: 'divider' },
                        '&:hover fieldset': { borderColor: 'grey.400' },
                      },
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все статусы</MenuItem>
                    {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                      <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                        {info.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, mode) => mode && setViewMode(mode)}
                    size="small"
                    sx={{ height: 36 }}
                  >
                    <ToggleButton value="table" aria-label="табличный вид" sx={{ px: 1, py: 0.5, borderRadius: '8px' }}>
                      <Tooltip title="Табличный вид">
                        <ViewListIcon fontSize="small" />
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="grid" aria-label="сетка карточек" sx={{ px: 1, py: 0.5, borderRadius: '8px' }}>
                      <Tooltip title="Сетка карточек">
                        <ViewModuleIcon fontSize="small" />
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              }
            >
              <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
                <SearchInput
                  value={filters.search || ''}
                  placeholder="Поиск по наименованию, номеру..."
                  onSearch={(val) => handleFilterChange('search', val)}
                />
              </Box>
            </FilterToolbar>

            <EquipmentActiveFilterChips
              activeBadges={activeBadges}
              onResetSingle={handleResetSingleFilter}
              onResetAll={handleResetFilters}
            />
          </Box>
        }
        gridContent={
          <Grid container spacing={2.5}>
            {sortedEquipmentList.map((eq) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={eq.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 24px -8px rgba(15, 23, 42, 0.12)',
                      borderColor: 'primary.main',
                    },
                  }}
                  onClick={() => handleRowClick(eq)}
                >
                  <Box
                    sx={{
                      height: 140,
                      backgroundColor: 'background.default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {eq.primaryPhoto ? (
                      <Box
                        component="img"
                        src={`/api/files/${eq.primaryPhoto}`}
                        alt={eq.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <PrecisionManufacturingIcon sx={{ fontSize: 54, color: 'grey.400' }} />
                    )}
                    {checkEquipmentCardCompleteness(eq).isIncomplete && (
                      <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                        <Tooltip title="В карточке заполнены не все поля">
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: 'warning.light',
                              color: 'warning.dark',
                              boxShadow: 1,
                            }}
                          >
                            <WarningAmberIcon sx={{ fontSize: 16 }} />
                          </Box>
                        </Tooltip>
                      </Box>
                    )}
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <StatusBadge status={eq.status} />
                    </Box>
                  </Box>

                  <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'primary.main',
                          backgroundColor: 'rgba(2, 132, 199, 0.08)',
                          px: 0.75,
                          py: 0.25,
                          borderRadius: '4px',
                        }}
                      >
                        {eq.inventoryNumber || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {eq.location || '—'}
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2" fontWeight={700} lineHeight={1.3} sx={{ mb: 0.75, color: 'text.primary' }}>
                      {eq.name}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.75rem' }}>
                      {eq.manufacturer} {eq.model && `• ${eq.model}`}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2, flexGrow: 1 }}>
                      {eq.customFields?.equipment_type && (
                        <Chip
                          label={eq.customFields.equipment_type}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.6875rem', height: 20, borderRadius: '4px' }}
                        />
                      )}
                      {eq.customFields?.equipment_group && (
                        <Chip
                          label={eq.customFields.equipment_group}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ fontSize: '0.6875rem', height: 20, borderRadius: '4px' }}
                        />
                      )}
                    </Box>

                    <Box
                      sx={{
                        pt: 1.25,
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Tooltip title="Документов">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <DescriptionOutlinedIcon sx={{ fontSize: 15 }} />
                            <span>{eq.counts?.documents ?? 0}</span>
                          </Box>
                        </Tooltip>
                        <Tooltip title="Планов ТО">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <ConstructionOutlinedIcon sx={{ fontSize: 15 }} />
                            <span>{eq.counts?.maintenancePlans ?? 0}</span>
                          </Box>
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFeatureSettings: '"tnum"' }}>
                        {formatDate(eq.commissionDate)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        }
      >
        <Table stickyHeader size="small" aria-label="Реестр оборудования" sx={{ minWidth: 1400 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              <TableCell padding="checkbox" sx={{ width: 44, pl: 2 }}>
                <Checkbox
                  size="small"
                  indeterminate={selectedIds.length > 0 && selectedIds.length < equipmentList.length}
                  checked={equipmentList.length > 0 && selectedIds.length === equipmentList.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(equipmentList.map((i) => i.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  inputProps={{ 'aria-label': 'Выбрать все записи' }}
                />
              </TableCell>

              {visibleColumns.includes('completeness') && (
                <TableCell sx={{ width: 44, minWidth: 44, px: 0.5, textAlign: 'center' }}>
                  <Tooltip title="Сортировать по полноте заполнения карточки">
                    <TableSortLabel
                      active={sortField === 'completeness'}
                      direction={sortField === 'completeness' ? sortDirection : 'asc'}
                      onClick={() => handleRequestSort('completeness')}
                    >
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          bgcolor: 'action.hover',
                          color: 'text.secondary',
                        }}
                      >
                        <PriorityHighIcon sx={{ fontSize: 14 }} />
                      </Box>
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
              )}

              {/* Динамические колонки строго из настроенных разделов паспорта */}
              {tableColumns
                .filter((col) => col.id !== 'completeness')
                .map((col) => {
                  if (!visibleColumns.includes(col.id)) return null;
                  return (
                    <TableCell key={col.id} sx={{ minWidth: col.id === 'name' ? 220 : 140 }}>
                      <TableSortLabel
                        active={sortField === col.id}
                        direction={sortField === col.id ? sortDirection : 'asc'}
                        onClick={() => handleRequestSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  );
                })}
            </TableRow>
            {showColumnFilters && (
              <EquipmentColumnFiltersRow
                visibleColumns={visibleColumns}
                columns={tableColumns}
                filters={filters}
                onChangeFilter={handleFilterChange}
              />
            )}
          </TableHead>
          <TableBody>
            {sortedEquipmentList.map((eq) => {
              const isChecked = selectedIds.includes(eq.id);
              const custom = eq.customFields || {};
              const criticality = custom.criticality || 'B';
              const wear = custom.actual_wear_percentage;

              return (
                <TableRow
                  key={eq.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleRowClick(eq)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ pl: 2 }}>
                    <Checkbox
                      size="small"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) =>
                          prev.includes(eq.id) ? prev.filter((id) => id !== eq.id) : [...prev, eq.id]
                        );
                      }}
                      inputProps={{ 'aria-label': `Выбрать ${eq.name}` }}
                    />
                  </TableCell>

                  {visibleColumns.includes('completeness') && (() => {
                    const comp = checkEquipmentCardCompleteness(eq, sections);
                    return (
                      <TableCell align="center" sx={{ width: 44, minWidth: 44, px: 0.5 }} onClick={(e) => e.stopPropagation()}>
                        {comp.isIncomplete ? (
                          <Tooltip
                            title={
                              <Box sx={{ p: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'inherit', mb: 0.5 }}>
                                  В карточке заполнены не все поля
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', mb: 0.75, opacity: 0.9 }}>
                                  Заполнено {comp.filledCount} из {comp.totalCount} полей
                                </Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.75rem', lineHeight: 1.45 }}>
                                  {comp.missingFields.map((field) => (
                                    <li key={field}>{field}</li>
                                  ))}
                                </Box>
                              </Box>
                            }
                            arrow
                            placement="right"
                          >
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                bgcolor: 'warning.light',
                                color: 'warning.dark',
                                cursor: 'help',
                                transition: 'transform 0.15s ease-in-out',
                                '&:hover': {
                                  transform: 'scale(1.15)',
                                },
                              }}
                            >
                              <WarningAmberIcon sx={{ fontSize: 16 }} />
                            </Box>
                          </Tooltip>
                        ) : null}
                      </TableCell>
                    );
                  })()}

                  {/* Динамический рендеринг значений колонок строго по настроенным разделам */}
                  {tableColumns
                    .filter((col) => col.id !== 'completeness')
                    .map((col) => {
                      if (!visibleColumns.includes(col.id)) return null;

                      if (col.id === 'name') {
                        return (
                          <TableCell key={col.id}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: 'primary.main',
                                fontSize: '0.8125rem',
                                lineHeight: 1.35,
                                '&:hover': { textDecoration: 'underline' },
                              }}
                            >
                              {eq.name}
                            </Typography>
                          </TableCell>
                        );
                      }

                      if (col.id === 'inventoryNumber') {
                        return (
                          <TableCell key={col.id}>
                            {eq.inventoryNumber ? (
                              <Paper
                                variant="outlined"
                                sx={{
                                  display: 'inline-block',
                                  px: 0.85,
                                  py: 0.15,
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  bgcolor: 'background.default',
                                  fontSize: '0.75rem',
                                  borderRadius: '4px',
                                  color: 'text.secondary',
                                  borderColor: 'grey.400',
                                  lineHeight: 1.3,
                                }}
                              >
                                {eq.inventoryNumber}
                              </Paper>
                            ) : (
                              <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>
                            )}
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell key={col.id} sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          {renderDynamicTableCell(eq, col.id)}
                        </TableCell>
                      );
                    })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableWrapper>
    )}
  </Box>


      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={total}
        onClearSelection={() => setSelectedIds([])}
        actions={[
          {
            label: 'Экспорт в CSV',
            icon: <FileDownloadOutlinedIcon fontSize="small" />,
            onClick: handleBulkExport,
            color: 'primary',
          },
          {
            label: 'Печать паспортов',
            icon: <QrCode2Icon fontSize="small" />,
            onClick: handleBulkPrint,
            color: 'info',
          },
        ]}
      />

      {/* Мастер создания паспорта оборудования */}
      <EquipmentWizardDialog
        open={openCreateWizard}
        onClose={() => setOpenCreateWizard(false)}
        onSuccess={(newId) => {
          fetchEquipment();
          router.push(`/eps/${newId}`);
        }}
      />

      {/* Панель расширенной фильтрации по всем полям */}
      <EquipmentFilterDrawer
        open={openFilterDrawer}
        onClose={() => setOpenFilterDrawer(false)}
        filters={filters}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
        onResetFilters={handleResetFilters}
      />

      {/* Диалог массового редактирования позиций оборудования */}
      <EquipmentBatchEditDialog
        open={openBatchEditDialog}
        onClose={() => setOpenBatchEditDialog(false)}
        onSuccess={() => {
          fetchEquipment();
          setSelectedIds([]);
        }}
        selectedIds={selectedIds}
        filterParams={filters as Record<string, string>}
        totalCount={total}
      />

      {/* Диалог полной очистки базы данных оборудования администратором */}
      <EquipmentPurgeDialog
        open={openPurgeDialog}
        onClose={() => setOpenPurgeDialog(false)}
        onSuccess={() => {
          fetchEquipment();
          setSelectedIds([]);
        }}
        currentCount={total}
      />
    </Box>
  );
}

export default function EquipmentListPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка реестра оборудования..." />}>
      <EquipmentListContent />
    </Suspense>
  );
}
