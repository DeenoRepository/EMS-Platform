'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
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
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { EQUIPMENT_STATUS_MAP, formatDate, PERMISSIONS } from '@ems/shared';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
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
  type TableDensity,
  type TableColumnOption,
} from '@/components/ui';
import { EquipmentWizardDialog } from '@/components/eps';

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

const EPS_COLUMNS: TableColumnOption[] = [
  { id: 'inventoryNumber', label: 'Инв. номер', defaultVisible: true },
  { id: 'name', label: 'Наименование оборудования', defaultVisible: true },
  { id: 'serialNumber', label: 'Заводской (серийный) №', defaultVisible: false },
  { id: 'manufacturer', label: 'Производитель', defaultVisible: true },
  { id: 'model', label: 'Модель / Марка', defaultVisible: true },
  { id: 'location', label: 'Локация / Место размещения', defaultVisible: true },
  { id: 'status', label: 'Статус', defaultVisible: true },
  { id: 'criticality', label: 'Категория критичности (A/B/C)', defaultVisible: false },
  { id: 'actualWear', label: 'Физический износ (%)', defaultVisible: false },
  { id: 'eqGroup', label: 'Группа оборудования', defaultVisible: false },
  { id: 'eqType', label: 'Вид оборудования', defaultVisible: false },
  { id: 'respPerson', label: 'Ответственное лицо (МОЛ)', defaultVisible: false },
  { id: 'okofCode', label: 'Код ОКОФ', defaultVisible: false },
  { id: 'okpd2Code', label: 'Код ОКПД2', defaultVisible: false },
  { id: 'procCode', label: 'Код техпроцесса', defaultVisible: false },
  { id: 'maintPeriodicity', label: 'Периодичность ТО', defaultVisible: false },
  { id: 'calibrationInterval', label: 'Межповерочный интервал (мес.)', defaultVisible: false },
  { id: 'cleanRoom', label: 'Класс чистого помещения', defaultVisible: false },
  { id: 'isCriticalPath', label: 'Критический путь', defaultVisible: false },
  { id: 'isUnique', label: 'Уникальное оборудование', defaultVisible: false },
  { id: 'isImported', label: 'Импортное оборудование', defaultVisible: false },
  { id: 'documentsCount', label: 'Документы (кол-во)', defaultVisible: false },
  { id: 'sparePartsCount', label: 'ЗИП / Запчасти (кол-во)', defaultVisible: false },
  { id: 'tags', label: 'Теги / Метки', defaultVisible: true },
  { id: 'commissionDate', label: 'Ввод в эксплуатацию', defaultVisible: true },
  { id: 'updatedAt', label: 'Дата изменения', defaultVisible: false },
  { id: 'createdAt', label: 'Дата создания', defaultVisible: false },
];

function EquipmentListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [density, setDensity] = useState<TableDensity>('standard');

  // View mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [openCreateWizard, setOpenCreateWizard] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || '');
  const [tagFilter, setTagFilter] = useState(searchParams?.get('tagId') || '');

  // Status Counts for KPI
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    active: 0,
    underRepair: 0,
    inStorage: 0,
    decommissioned: 0,
  });

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/eps/tags');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTags(json.data);
      }
    } catch {
      // ignore
    }
  };

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: viewMode === 'grid' ? '12' : String(pageSize),
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
  }, [page, pageSize, search, statusFilter, tagFilter, viewMode, enqueueSnackbar]);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTagFilter('');
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (statusFilter) count++;
    if (tagFilter) count++;
    return count;
  }, [search, statusFilter, tagFilter]);

  // Quick filter by clicking KPI card
  const handleKpiFilter = (status: string | null) => {
    setStatusFilter((prev) => (prev === status ? '' : status || ''));
    setPage(1);
  };

  const canCreate = hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);
  const canImport = hasPermission(PERMISSIONS.EPS_IMPORT_EXECUTE);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Columns visibility & Sorting
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    EPS_COLUMNS.map((c) => c.id)
  );
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const equipmentList = Array.isArray(items) ? items : [];

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const sortedEquipmentList = useMemo(() => {
    if (!sortField) return equipmentList;
    return [...equipmentList].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (sortField) {
        case 'inventoryNumber':
          aVal = a.inventoryNumber || '';
          bVal = b.inventoryNumber || '';
          break;
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'serialNumber':
          aVal = a.serialNumber || '';
          bVal = b.serialNumber || '';
          break;
        case 'manufacturer':
          aVal = a.manufacturer || '';
          bVal = b.manufacturer || '';
          break;
        case 'model':
          aVal = a.model || '';
          bVal = b.model || '';
          break;
        case 'location':
          aVal = a.location || '';
          bVal = b.location || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'criticality':
          aVal = a.customFields?.criticality || '';
          bVal = b.customFields?.criticality || '';
          break;
        case 'actualWear':
          aVal = a.customFields?.actual_wear_percentage !== undefined && a.customFields?.actual_wear_percentage !== '' ? Number(a.customFields.actual_wear_percentage) : -1;
          bVal = b.customFields?.actual_wear_percentage !== undefined && b.customFields?.actual_wear_percentage !== '' ? Number(b.customFields.actual_wear_percentage) : -1;
          break;
        case 'eqGroup':
          aVal = a.customFields?.equipment_group || '';
          bVal = b.customFields?.equipment_group || '';
          break;
        case 'eqType':
          aVal = a.customFields?.equipment_type || '';
          bVal = b.customFields?.equipment_type || '';
          break;
        case 'respPerson':
          aVal = a.customFields?.responsible_person_name || '';
          bVal = b.customFields?.responsible_person_name || '';
          break;
        case 'okofCode':
          aVal = a.customFields?.okof_code || '';
          bVal = b.customFields?.okof_code || '';
          break;
        case 'okpd2Code':
          aVal = a.customFields?.okpd2_code || '';
          bVal = b.customFields?.okpd2_code || '';
          break;
        case 'procCode':
          aVal = a.customFields?.process_classifier_code || '';
          bVal = b.customFields?.process_classifier_code || '';
          break;
        case 'maintPeriodicity':
          aVal = a.customFields?.maintenance_periodicity || '';
          bVal = b.customFields?.maintenance_periodicity || '';
          break;
        case 'calibrationInterval':
          aVal = a.customFields?.calibration_interval ? Number(a.customFields.calibration_interval) : -1;
          bVal = b.customFields?.calibration_interval ? Number(b.customFields.calibration_interval) : -1;
          break;
        case 'cleanRoom':
          aVal = a.customFields?.clean_room_class || '';
          bVal = b.customFields?.clean_room_class || '';
          break;
        case 'isCriticalPath':
          aVal = a.customFields?.is_critical_path ? 1 : 0;
          bVal = b.customFields?.is_critical_path ? 1 : 0;
          break;
        case 'isUnique':
          aVal = a.customFields?.is_unique ? 1 : 0;
          bVal = b.customFields?.is_unique ? 1 : 0;
          break;
        case 'isImported':
          aVal = a.customFields?.is_imported ? 1 : 0;
          bVal = b.customFields?.is_imported ? 1 : 0;
          break;
        case 'documentsCount':
          aVal = a._count?.documents || a.counts?.documents || 0;
          bVal = b._count?.documents || b.counts?.documents || 0;
          break;
        case 'sparePartsCount':
          aVal = a._count?.spareParts || a.counts?.spareParts || 0;
          bVal = b._count?.spareParts || b.counts?.spareParts || 0;
          break;
        case 'tags':
          aVal = Array.isArray(a.tags) ? a.tags.map((t: any) => t.name || t).join(', ') : '';
          bVal = Array.isArray(b.tags) ? b.tags.map((t: any) => t.name || t).join(', ') : '';
          break;
        case 'commissionDate':
          aVal = a.commissionDate ? new Date(a.commissionDate).getTime() : 0;
          bVal = b.commissionDate ? new Date(b.commissionDate).getTime() : 0;
          break;
        case 'updatedAt':
          aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          break;
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          aVal = (a as any)[sortField] || '';
          bVal = (b as any)[sortField] || '';
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

    const exportRows = listToExport.map((eq, idx) => ({
      '№ п/п': idx + 1,
      'Инвентарный номер': eq.inventoryNumber || '—',
      'Серийный номер': eq.serialNumber || '—',
      'Наименование оборудования': eq.name,
      'Производитель': eq.manufacturer || '—',
      'Модель / Марка': eq.model || '—',
      'Место установки': eq.location || '—',
      'Статус': EQUIPMENT_STATUS_MAP[eq.status]?.label || eq.status,
      'Критичность': eq.customFields?.criticality || '—',
      'Износ (%)': eq.customFields?.actual_wear_percentage ? `${eq.customFields.actual_wear_percentage}%` : '—',
      'Группа оборудования': eq.customFields?.equipment_group || '—',
      'Вид оборудования': eq.customFields?.equipment_type || '—',
      'МОЛ / Ответственный': eq.customFields?.responsible_person_name || '—',
      'Код ОКОФ': eq.customFields?.okof_code || '—',
      'Код ОКПД2': eq.customFields?.okpd2_code || '—',
      'Код техпроцесса': eq.customFields?.process_classifier_code || '—',
      'Периодичность ТО': eq.customFields?.maintenance_periodicity || '—',
      'Класс чистоты': eq.customFields?.clean_room_class || '—',
      'Интервал поверки (мес.)': eq.customFields?.calibration_interval || '—',
      'Критический путь': eq.customFields?.is_critical_path ? 'Да' : 'Нет',
      'Уникальное': eq.customFields?.is_unique ? 'Да' : 'Нет',
      'Импортное': eq.customFields?.is_imported ? 'Да' : 'Нет',
      'Теги': eq.tags.map((t) => t.name).join(', ') || '—',
      'Ввод в эксплуатацию': formatDate(eq.commissionDate),
      'Дата изменения': formatDate(eq.updatedAt),
      'Дата создания': formatDate(eq.createdAt),
    }));

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

  return (
    <Box sx={{ pb: 6 }}>
      {/* Page Header */}
      <PageHeader
        title="Оборудование"
        subtitle="Реестр и управление основными средствами предприятия"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleBulkExport}
              sx={{
                height: 38,
                borderRadius: '8px',
                borderColor: '#e2e8f0',
                color: '#334155',
                px: 2,
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                '&:hover': {
                  borderColor: '#cbd5e1',
                  backgroundColor: '#f8fafc',
                },
              }}
            >
              Экспорт
            </Button>
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
                  backgroundColor: '#0284c7',
                  '&:hover': {
                    backgroundColor: '#0369a1',
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
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Всего оборудования"
            value={statusCounts.total}
            subtitle="Единиц в реестре"
            icon={<InventoryIcon sx={{ fontSize: 20 }} />}
            accentColor="#0284c7"
            active={!statusFilter}
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
            active={statusFilter === 'ACTIVE'}
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
            active={statusFilter === 'UNDER_REPAIR'}
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
            active={statusFilter === 'IN_STORAGE'}
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
            active={statusFilter === 'DECOMMISSIONED'}
            onClick={() => handleKpiFilter('DECOMMISSIONED')}
            loading={loading && statusCounts.total === 0}
          />
        </Grid>
      </Grid>

      {/* Unified Enterprise Data Grid: Filter Toolbar + Table/Grid + Pagination */}
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
        columns={EPS_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        empty={items.length === 0 && !loading}
        emptyState={
          <EmptyState
            icon={<PrecisionManufacturingIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
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
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            actions={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  select
                  size="small"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 140,
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
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все статусы</MenuItem>
                  {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {info.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  value={tagFilter}
                  onChange={(e) => {
                    setTagFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 130,
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
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все теги</MenuItem>
                  {tags.map((t) => (
                    <MenuItem key={t.id} value={t.id} sx={{ fontSize: '0.8125rem' }}>
                      {t.name}
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
                value={search}
                placeholder="Поиск по наименованию, номеру..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
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
                      borderColor: '#0284c7',
                    },
                  }}
                  onClick={() => handleRowClick(eq)}
                >
                  <Box
                    sx={{
                      height: 140,
                      backgroundColor: '#f8fafc',
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
                      <PrecisionManufacturingIcon sx={{ fontSize: 54, color: '#cbd5e1' }} />
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
                          color: '#0284c7',
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

                    <Typography variant="subtitle2" fontWeight={700} lineHeight={1.3} sx={{ mb: 0.75, color: '#0f172a' }}>
                      {eq.name}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.75rem' }}>
                      {eq.manufacturer} {eq.model && `• ${eq.model}`}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2, flexGrow: 1 }}>
                      {eq.tags.map((t) => (
                        <Chip
                          key={t.id}
                          label={t.name}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            height: 18,
                            backgroundColor: t.color ? `${t.color}15` : undefined,
                            color: t.color || 'text.primary',
                            borderRadius: '4px',
                          }}
                        />
                      ))}
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
                            <span>{eq.counts.documents}</span>
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
        <Table size="small" aria-label="Реестр оборудования">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#ffffff' }}>
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

              {visibleColumns.includes('inventoryNumber') && (
                <TableCell sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={sortField === 'inventoryNumber'}
                    direction={sortField === 'inventoryNumber' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('inventoryNumber')}
                  >
                    Инв. номер
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('name') && (
                <TableCell sx={{ minWidth: 220 }}>
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Наименование оборудования
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('serialNumber') && (
                <TableCell sx={{ minWidth: 180 }}>
                  <TableSortLabel
                    active={sortField === 'serialNumber'}
                    direction={sortField === 'serialNumber' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('serialNumber')}
                  >
                    Заводской / серийный №
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('manufacturer') && (
                <TableCell sx={{ minWidth: 150 }}>
                  <TableSortLabel
                    active={sortField === 'manufacturer'}
                    direction={sortField === 'manufacturer' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('manufacturer')}
                  >
                    Производитель
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('model') && (
                <TableCell sx={{ minWidth: 150 }}>
                  <TableSortLabel
                    active={sortField === 'model'}
                    direction={sortField === 'model' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('model')}
                  >
                    Модель / марка
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('location') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'location'}
                    direction={sortField === 'location' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('location')}
                  >
                    Локация / место
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('status') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    Статус
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('criticality') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'criticality'}
                    direction={sortField === 'criticality' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('criticality')}
                  >
                    Критичность
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('actualWear') && (
                <TableCell sx={{ minWidth: 110 }}>
                  <TableSortLabel
                    active={sortField === 'actualWear'}
                    direction={sortField === 'actualWear' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('actualWear')}
                  >
                    Износ (%)
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('eqGroup') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'eqGroup'}
                    direction={sortField === 'eqGroup' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('eqGroup')}
                  >
                    Группа
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('eqType') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'eqType'}
                    direction={sortField === 'eqType' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('eqType')}
                  >
                    Вид
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('respPerson') && (
                <TableCell sx={{ minWidth: 170 }}>
                  <TableSortLabel
                    active={sortField === 'respPerson'}
                    direction={sortField === 'respPerson' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('respPerson')}
                  >
                    Ответственный (МОЛ)
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('okofCode') && (
                <TableCell sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={sortField === 'okofCode'}
                    direction={sortField === 'okofCode' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('okofCode')}
                  >
                    Код ОКОФ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('okpd2Code') && (
                <TableCell sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={sortField === 'okpd2Code'}
                    direction={sortField === 'okpd2Code' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('okpd2Code')}
                  >
                    Код ОКПД2
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('procCode') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'procCode'}
                    direction={sortField === 'procCode' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('procCode')}
                  >
                    Техпроцесс
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('maintPeriodicity') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'maintPeriodicity'}
                    direction={sortField === 'maintPeriodicity' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('maintPeriodicity')}
                  >
                    Периодичность ТО
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('calibrationInterval') && (
                <TableCell sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={sortField === 'calibrationInterval'}
                    direction={sortField === 'calibrationInterval' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('calibrationInterval')}
                  >
                    Поверка (мес.)
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('cleanRoom') && (
                <TableCell sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={sortField === 'cleanRoom'}
                    direction={sortField === 'cleanRoom' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('cleanRoom')}
                  >
                    Класс чистоты
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('isCriticalPath') && (
                <TableCell sx={{ minWidth: 150 }}>
                  <TableSortLabel
                    active={sortField === 'isCriticalPath'}
                    direction={sortField === 'isCriticalPath' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('isCriticalPath')}
                  >
                    Критический путь
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('isUnique') && (
                <TableCell sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={sortField === 'isUnique'}
                    direction={sortField === 'isUnique' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('isUnique')}
                  >
                    Уникальное
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('isImported') && (
                <TableCell sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={sortField === 'isImported'}
                    direction={sortField === 'isImported' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('isImported')}
                  >
                    Импортное
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('documentsCount') && (
                <TableCell sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={sortField === 'documentsCount'}
                    direction={sortField === 'documentsCount' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('documentsCount')}
                  >
                    Документы
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('sparePartsCount') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'sparePartsCount'}
                    direction={sortField === 'sparePartsCount' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('sparePartsCount')}
                  >
                    ЗИП / детали
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('tags') && (
                <TableCell sx={{ minWidth: 110 }}>
                  <TableSortLabel
                    active={sortField === 'tags'}
                    direction={sortField === 'tags' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('tags')}
                  >
                    Теги
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('commissionDate') && (
                <TableCell sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={sortField === 'commissionDate'}
                    direction={sortField === 'commissionDate' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('commissionDate')}
                  >
                    Ввод в экспл.
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('updatedAt') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'updatedAt'}
                    direction={sortField === 'updatedAt' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('updatedAt')}
                  >
                    Обновлено
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('createdAt') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'createdAt'}
                    direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('createdAt')}
                  >
                    Создано
                  </TableSortLabel>
                </TableCell>
              )}
            </TableRow>
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

                  {visibleColumns.includes('inventoryNumber') && (
                    <TableCell>
                      {eq.inventoryNumber ? (
                        <Paper
                          variant="outlined"
                          sx={{
                            display: 'inline-block',
                            px: 0.85,
                            py: 0.15,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            bgcolor: '#f8fafc',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            color: '#334155',
                            borderColor: '#cbd5e1',
                            lineHeight: 1.3,
                          }}
                        >
                          {eq.inventoryNumber}
                        </Paper>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>—</Typography>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.includes('name') && (
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: '#0284c7',
                          fontSize: '0.8125rem',
                          lineHeight: 1.35,
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {eq.name}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes('serialNumber') && (
                    <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: '#475569' }}>
                      {eq.serialNumber || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('manufacturer') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500 }}>
                      {eq.manufacturer || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('model') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {eq.model || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('location') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#334155' }}>
                      {eq.location || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <StatusBadge status={eq.status} />
                    </TableCell>
                  )}

                  {visibleColumns.includes('criticality') && (
                    <TableCell>
                      <Chip
                        label={`Класс ${criticality}`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          backgroundColor:
                            criticality === 'A'
                              ? 'rgba(239, 68, 68, 0.1)'
                              : criticality === 'B'
                              ? 'rgba(245, 158, 11, 0.1)'
                              : 'rgba(100, 116, 139, 0.1)',
                          color:
                            criticality === 'A'
                              ? '#dc2626'
                              : criticality === 'B'
                              ? '#d97706'
                              : '#475569',
                          border: '1px solid',
                          borderColor:
                            criticality === 'A'
                              ? '#fecaca'
                              : criticality === 'B'
                              ? '#fde68a'
                              : '#e2e8f0',
                        }}
                      />
                    </TableCell>
                  )}

                  {visibleColumns.includes('actualWear') && (
                    <TableCell>
                      {wear !== undefined && wear !== null && wear !== '' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              fontSize: '0.8125rem',
                              color: Number(wear) > 70 ? '#dc2626' : Number(wear) > 40 ? '#d97706' : '#16a34a',
                            }}
                          >
                            {wear}%
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>—</Typography>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.includes('eqGroup') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {custom.equipment_group || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('eqType') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {custom.equipment_type || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('respPerson') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500 }}>
                      {custom.responsible_person_name || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('okofCode') && (
                    <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>
                      {custom.okof_code || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('okpd2Code') && (
                    <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>
                      {custom.okpd2_code || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('procCode') && (
                    <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>
                      {custom.process_classifier_code || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('maintPeriodicity') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {custom.maintenance_periodicity || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('calibrationInterval') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {custom.calibration_interval ? `${custom.calibration_interval} мес.` : '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('cleanRoom') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {custom.clean_room_class || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('isCriticalPath') && (
                    <TableCell>
                      <Chip
                        label={custom.is_critical_path ? 'Да' : 'Нет'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          backgroundColor: custom.is_critical_path ? '#fef2f2' : '#f8fafc',
                          color: custom.is_critical_path ? '#dc2626' : '#64748b',
                          border: '1px solid',
                          borderColor: custom.is_critical_path ? '#fecaca' : '#e2e8f0',
                        }}
                      />
                    </TableCell>
                  )}

                  {visibleColumns.includes('isUnique') && (
                    <TableCell>
                      <Chip
                        label={custom.is_unique ? 'Да' : 'Нет'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          backgroundColor: custom.is_unique ? '#f0f9ff' : '#f8fafc',
                          color: custom.is_unique ? '#0284c7' : '#64748b',
                          border: '1px solid',
                          borderColor: custom.is_unique ? '#bae6fd' : '#e2e8f0',
                        }}
                      />
                    </TableCell>
                  )}

                  {visibleColumns.includes('isImported') && (
                    <TableCell>
                      <Chip
                        label={custom.is_imported ? 'Да' : 'Нет'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          backgroundColor: custom.is_imported ? '#faf5ff' : '#f8fafc',
                          color: custom.is_imported ? '#9333ea' : '#64748b',
                          border: '1px solid',
                          borderColor: custom.is_imported ? '#e9d5ff' : '#e2e8f0',
                        }}
                      />
                    </TableCell>
                  )}

                  {visibleColumns.includes('documentsCount') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {eq._count?.documents ?? eq.counts?.documents ?? 0}
                    </TableCell>
                  )}

                  {visibleColumns.includes('sparePartsCount') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {eq._count?.spareParts ?? eq.counts?.spareParts ?? 0}
                    </TableCell>
                  )}

                  {visibleColumns.includes('tags') && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {eq.tags && eq.tags.length > 0 ? (
                          eq.tags.map((t) => (
                            <Chip
                              key={t.id}
                              label={t.name}
                              size="small"
                              sx={{
                                fontSize: '0.6875rem',
                                height: 22,
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                fontWeight: 500,
                              }}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>—</Typography>
                        )}
                      </Box>
                    </TableCell>
                  )}

                  {visibleColumns.includes('commissionDate') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#64748b', fontFeatureSettings: '"tnum"' }}>
                      {formatDate(eq.commissionDate)}
                    </TableCell>
                  )}

                  {visibleColumns.includes('updatedAt') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#64748b', fontFeatureSettings: '"tnum"' }}>
                      {formatDate(eq.updatedAt)}
                    </TableCell>
                  )}

                  {visibleColumns.includes('createdAt') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#64748b', fontFeatureSettings: '"tnum"' }}>
                      {formatDate(eq.createdAt)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableWrapper>


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
