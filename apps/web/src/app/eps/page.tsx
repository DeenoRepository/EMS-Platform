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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LaunchIcon from '@mui/icons-material/Launch';
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
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import {
  StatCard,
  StatusBadge,
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  DetailDrawer,
  CriticalAlertBanner,
  BulkActionBar,
  PageLoading,
  type TableDensity,
  type TableColumnOption,
} from '@/components/ui';

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
  tags: { id: string; name: string; color: string | null }[];
  counts: { documents: number; photos: number; maintenancePlans: number; spareParts: number };
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
  { id: 'name', label: 'Наименование оборудования', defaultVisible: true, required: true },
  { id: 'manufacturer', label: 'Производитель / Модель', defaultVisible: true },
  { id: 'location', label: 'Локация / Место', defaultVisible: true },
  { id: 'status', label: 'Статус', defaultVisible: true },
  { id: 'tags', label: 'Теги', defaultVisible: true },
  { id: 'commissionDate', label: 'Ввод в экспл.', defaultVisible: true },
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

  // Filters
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || '');
  const [tagFilter, setTagFilter] = useState(searchParams?.get('tagId') || '');

  // Master-Detail Quick View Drawer State
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [quickViewDetails, setQuickViewDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  // Load Full Details when equipment selected for Quick View Side Drawer
  useEffect(() => {
    if (!selectedEquipment) {
      setQuickViewDetails(null);
      return;
    }

    let isMounted = true;
    setLoadingDetails(true);

    fetch(`/api/eps/equipment/${selectedEquipment.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data.success) {
          setQuickViewDetails(data.data);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (isMounted) setLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedEquipment]);

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

  // Quick status update from Master-Detail Drawer
  const handleQuickStatusUpdate = async (newStatus: string) => {
    if (!selectedEquipment) return;
    try {
      const res = await fetch(`/api/eps/equipment/${selectedEquipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Статус оборудования успешно обновлен', { variant: 'success' });
        setSelectedEquipment((prev) => (prev ? { ...prev, status: newStatus } : null));
        fetchEquipment();
      } else {
        enqueueSnackbar(data.error || 'Не удалось обновить статус', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при обновлении статуса', { variant: 'error' });
    }
  };

  const canCreate = hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);
  const canEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
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
        case 'manufacturer':
          aVal = `${a.manufacturer || ''} ${a.model || ''}`;
          bVal = `${b.manufacturer || ''} ${b.model || ''}`;
          break;
        case 'location':
          aVal = a.location || '';
          bVal = b.location || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'commissionDate':
          aVal = a.commissionDate ? new Date(a.commissionDate).getTime() : 0;
          bVal = b.commissionDate ? new Date(b.commissionDate).getTime() : 0;
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
    setSelectedEquipment(eq);
  };

  // Bulk Export Handlers
  const handleBulkExport = () => {
    const idsToExport = selectedIds.length > 0 ? selectedIds : equipmentList.map((i) => i.id);
    if (idsToExport.length === 0) {
      enqueueSnackbar('Нет оборудования для экспорта', { variant: 'warning' });
      return;
    }
    const url = `/api/eps/reports/export?format=csv&ids=${idsToExport.join(',')}`;
    window.open(url, '_blank');
    enqueueSnackbar(`Экспорт ${idsToExport.length} записей запущен`, { variant: 'info' });
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
              size="small"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleBulkExport}
              sx={{
                borderRadius: '8px',
                borderColor: '#e2e8f0',
                color: '#334155',
                px: 2,
                py: 0.75,
                fontWeight: 600,
                backgroundColor: '#ffffff',
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
                size="small"
                startIcon={<AddIcon />}
                onClick={() => router.push('/eps/new')}
                sx={{
                  borderRadius: '8px',
                  fontWeight: 600,
                  px: 2,
                  py: 0.75,
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
        showDensityToggle
        density={density}
        onDensityChange={setDensity}
        columns={EPS_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={fetchEquipment}
        refreshing={loading}
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
                      <PrecisionManufacturingIcon sx={{ fontSize: 44, color: '#94a3b8' }} />
                    )}
                    <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                      <StatusBadge status={eq.status} />
                    </Box>
                  </Box>

                  <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          color: '#64748b',
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
                            <span>{eq.counts.maintenancePlans}</span>
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
                <TableCell sx={{ width: 130, fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'inventoryNumber'}
                    direction={sortField === 'inventoryNumber' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('inventoryNumber')}
                  >
                    ИНВ. НОМЕР
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('name') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    НАИМЕНОВАНИЕ ОБОРУДОВАНИЯ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('manufacturer') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'manufacturer'}
                    direction={sortField === 'manufacturer' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('manufacturer')}
                  >
                    ПРОИЗВОДИТЕЛЬ / МОДЕЛЬ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('location') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'location'}
                    direction={sortField === 'location' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('location')}
                  >
                    ЛОКАЦИЯ / МЕСТО
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('status') && (
                <TableCell sx={{ width: 140, fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    СТАТУС
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('tags') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  ТЕГИ
                </TableCell>
              )}

              {visibleColumns.includes('commissionDate') && (
                <TableCell sx={{ width: 120, fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'commissionDate'}
                    direction={sortField === 'commissionDate' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('commissionDate')}
                  >
                    ВВОД В ЭКСПЛ.
                  </TableSortLabel>
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEquipmentList.map((eq) => {
              const isSelected = selectedEquipment?.id === eq.id;
              const isChecked = selectedIds.includes(eq.id);
              return (
                <TableRow
                  key={eq.id}
                  hover
                  selected={isSelected}
                  sx={{
                    cursor: 'pointer',
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(2, 132, 199, 0.06) !important',
                    },
                  }}
                  onClick={() => handleRowClick(eq)}
                  onDoubleClick={() => router.push(`/eps/${eq.id}`)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ pl: 2 }}>
                    <Checkbox
                      size="small"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedIds((prev) =>
                          prev.includes(eq.id) ? prev.filter((id) => id !== eq.id) : [...prev, eq.id]
                        );
                      }}
                      inputProps={{ 'aria-label': `Выбрать ${eq.name}` }}
                    />
                  </TableCell>

                  {visibleColumns.includes('inventoryNumber') && (
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: '#475569',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                        }}
                      >
                        {eq.inventoryNumber || '—'}
                      </Typography>
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
                          lineHeight: 1.3,
                        }}
                      >
                        {eq.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', mt: 0.25 }}>
                        {eq.serialNumber ? `Зав. №: ${eq.serialNumber}` : 'Единица основных средств'}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes('manufacturer') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155', fontSize: '0.8125rem' }}>
                        {eq.manufacturer || '—'}
                      </Typography>
                      {eq.model && (
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem', display: 'block', mt: 0.25 }}>
                          {eq.model}
                        </Typography>
                      )}
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Master-Detail Quick View Side Drawer using shared DetailDrawer */}
      <DetailDrawer
        open={Boolean(selectedEquipment)}
        onClose={() => setSelectedEquipment(null)}
        width={480}
        loading={loadingDetails}
        title={
          selectedEquipment ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={selectedEquipment.inventoryNumber || 'Б/Н'}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700, fontFamily: 'monospace' }}
              />
              <Typography variant="subtitle1" fontWeight={700}>
                Быстрый просмотр
              </Typography>
            </Box>
          ) : (
            'Быстрый просмотр'
          )
        }
        footerActions={
          selectedEquipment ? (
            <Button
              variant="contained"
              fullWidth
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => router.push(`/eps/${selectedEquipment.id}`)}
              sx={{ py: 1.25, fontWeight: 600 }}
            >
              Перейти в полный паспорт
            </Button>
          ) : undefined
        }
      >
        {selectedEquipment && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {loadingDetails ? (
              <PageLoading text="Загрузка сведений..." minHeight={200} size={28} />
            ) : (
              <>
                <Typography variant="h6" fontWeight={700} color="primary.main">
                  {selectedEquipment.name}
                </Typography>

                {/* Photo Preview if available */}
                {selectedEquipment.primaryPhoto && (
                  <Box
                    component="img"
                    src={`/api/files/${selectedEquipment.primaryPhoto}`}
                    alt={selectedEquipment.name}
                    sx={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                )}

                {/* Status Quick Updater */}
                <Card sx={{ p: 2, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', elevation: 0 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                    ТЕКУЩИЙ СТАТУС
                  </Typography>
                  {canEdit ? (
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={selectedEquipment.status}
                      onChange={(e) => handleQuickStatusUpdate(e.target.value)}
                    >
                      {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                        <MenuItem key={key} value={key}>
                          {info.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <StatusBadge status={selectedEquipment.status} />
                  )}
                </Card>

                {/* Specifications */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Паспортные параметры:
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary', width: '45%' }}>Заводской номер</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{selectedEquipment.serialNumber || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Производитель</TableCell>
                        <TableCell>{selectedEquipment.manufacturer || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Модель</TableCell>
                        <TableCell>{selectedEquipment.model || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Локация установки</TableCell>
                        <TableCell>{selectedEquipment.location || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Ввод в эксплуатацию</TableCell>
                        <TableCell>{formatDate(selectedEquipment.commissionDate)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>

                {/* Custom Fields Summary */}
                {quickViewDetails?.customFields && Object.keys(quickViewDetails.customFields).length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Дополнительные характеристики:
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(quickViewDetails.customFields).map(([k, v]) => (
                          <TableRow key={k}>
                            <TableCell sx={{ color: 'text.secondary', width: '45%' }}>{k.replace(/_/g, ' ')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {typeof v === 'boolean' ? (v ? 'Да' : 'Нет') : String(v)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}

                {/* Attached Documents List */}
                {quickViewDetails?.documents && quickViewDetails.documents.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Прикрепленные документы ({quickViewDetails.documents.length}):
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {quickViewDetails.documents.slice(0, 3).map((d: any) => (
                        <Paper key={d.id} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ overflow: 'hidden' }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {d.originalName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {d.docType}
                            </Typography>
                          </Box>
                          <IconButton size="small" component="a" href={`/api/files/${d.filePath}`} target="_blank" aria-label="Открыть документ">
                            <LaunchIcon fontSize="small" />
                          </IconButton>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </DetailDrawer>

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
