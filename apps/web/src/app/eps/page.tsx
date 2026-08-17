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

  const equipmentList = Array.isArray(items) ? items : [];

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
        title="Реестр оборудования (EPS)"
        subtitle="Централизованный учет, паспортизация и жизненный цикл производственных активов"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Паспортизация EPS', href: '/eps' },
          { label: 'Реестр оборудования' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AssessmentOutlinedIcon />}
              onClick={() => router.push('/eps/reports')}
              sx={{ borderRadius: '8px' }}
            >
              Отчеты
            </Button>
            {canImport && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<FileUploadOutlinedIcon />}
                onClick={() => router.push('/eps/import')}
                sx={{ borderRadius: '8px' }}
              >
                Импорт Excel / CSV
              </Button>
            )}
            {canCreate && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => router.push('/eps/new')}
                sx={{
                  borderRadius: '8px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                }}
              >
                Новое оборудование
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
              title: `Внимание: ${statusCounts.underRepair} ед. оборудования находятся в статусе «В ремонте»`,
              description:
                'Требуется оперативный контроль проведения восстановительных работ и наличия необходимых запасных частей на складе.',
              actionLabel: 'Показать требующие ремонта',
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
            title="Всего активов"
            value={statusCounts.total}
            subtitle="Зарегистрировано в базе"
            icon={<PrecisionManufacturingIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
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
            subtitle="Штатная эксплуатация"
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
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
            subtitle="ТО или восстановление"
            icon={<BuildCircleOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
            active={statusFilter === 'UNDER_REPAIR'}
            onClick={() => handleKpiFilter('UNDER_REPAIR')}
            loading={loading && statusCounts.total === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="На хранении"
            value={statusCounts.inStorage}
            subtitle="Резерв на складе"
            icon={<InventoryIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(100, 116, 139, 0.08)"
            iconColor="#64748b"
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
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="#dc2626"
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
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, mode) => mode && setViewMode(mode)}
                size="small"
                sx={{ height: 36 }}
              >
                <ToggleButton value="table" aria-label="табличный вид" sx={{ px: 1.25, py: 0.5 }}>
                  <Tooltip title="Табличный вид">
                    <ViewListIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="grid" aria-label="сетка карточек" sx={{ px: 1.25, py: 0.5 }}>
                  <Tooltip title="Сетка карточек">
                    <ViewModuleIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 280, md: 340 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по наименованию, инвентарному или зав. номеру..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>

            <TextField
              select
              size="small"
              label="Статус"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">Все статусы</MenuItem>
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                <MenuItem key={key} value={key}>
                  {info.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Тег / Классификатор"
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">Все теги</MenuItem>
              {tags.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
          </FilterToolbar>
        }
        gridContent={
          <Grid container spacing={2.5}>
            {equipmentList.map((eq) => (
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
                      <Chip
                        label={eq.inventoryNumber || 'Б/Н'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20, borderRadius: '4px', fontFamily: 'monospace' }}
                      />
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
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 48 }}>
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
              <TableCell sx={{ width: 140, fontWeight: 700 }}>Инв. номер</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Наименование оборудования</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Производитель / Модель</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Локация / Место</TableCell>
              <TableCell sx={{ width: 140, fontWeight: 700 }}>Статус</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Теги</TableCell>
              <TableCell sx={{ width: 130, fontWeight: 700 }}>Связи</TableCell>
              <TableCell sx={{ width: 120, fontWeight: 700 }}>Ввод в экспл.</TableCell>
              <TableCell align="right" sx={{ width: 80, fontWeight: 700 }}>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {equipmentList.map((eq) => {
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
                      backgroundColor: 'rgba(2, 132, 199, 0.08) !important',
                    },
                  }}
                  onClick={() => handleRowClick(eq)}
                  onDoubleClick={() => router.push(`/eps/${eq.id}`)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
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
                  <TableCell>
                    <Chip
                      label={eq.inventoryNumber || 'Б/Н'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontFamily: 'monospace', borderRadius: '4px', height: 22 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                      {eq.name}
                    </Typography>
                    {eq.serialNumber && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Зав. №: {eq.serialNumber}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{eq.manufacturer || '—'}</Typography>
                    {eq.model && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {eq.model}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{eq.location || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={eq.status} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {eq.tags.map((t) => (
                        <Chip
                          key={t.id}
                          label={t.name}
                          size="small"
                          sx={{
                            fontSize: '0.6875rem',
                            height: 20,
                            backgroundColor: t.color ? `${t.color}15` : undefined,
                            color: t.color || 'text.primary',
                            borderColor: t.color || undefined,
                            borderRadius: '4px',
                          }}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                      <Tooltip title="Документов прикреплено">
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
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDate(eq.commissionDate)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Открыть полный паспорт">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/eps/${eq.id}`);
                        }}
                        aria-label={`Открыть паспорт ${eq.name}`}
                      >
                        <ArrowForwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
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
