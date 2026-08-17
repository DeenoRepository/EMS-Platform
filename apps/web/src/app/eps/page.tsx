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
  Pagination,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Drawer,
  Divider,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined';
import InventoryIcon from '@mui/icons-material/Inventory';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import Checkbox from '@mui/material/Checkbox';
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
  CriticalAlertBanner,
  BulkActionBar,
  PageLoading,
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
        if (json.success) {
          const fetchedItems: EquipmentItem[] = json.data.items || [];
          setItems(fetchedItems);
          setTotal(json.data.total || 0);
          setTotalPages(json.data.totalPages || 1);

          // Update Status Counts summary from API (global database count)
          if (json.data.statusCounts) {
            setStatusCounts(json.data.statusCounts);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки каталога оборудования', { variant: 'error' });
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

  const handleRowClick = async (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/eps/equipment/${item.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setQuickViewDetails(json.data);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetails(false);
    }
  };

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
        enqueueSnackbar('Статус оборудования обновлен', { variant: 'success' });
        setSelectedEquipment((prev) => (prev ? { ...prev, status: newStatus } : null));
        setQuickViewDetails((prev: any) => (prev ? { ...prev, status: newStatus } : null));
        fetchEquipment();
      }
    } catch {
      enqueueSnackbar('Ошибка обновления статуса', { variant: 'error' });
    }
  };

  const handleKpiFilter = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter('');
    } else {
      setStatusFilter(status);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTagFilter('');
    setPage(1);
  };

  const activeFilterCount = (search ? 1 : 0) + (statusFilter ? 1 : 0) + (tagFilter ? 1 : 0);
  const canCreate = hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);
  const canEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleBulkExport = () => {
    const selectedItems = items.filter((i) => selectedIds.includes(i.id));
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Инвентарный №,Наименование,Модель,Локация,Статус']
        .concat(
          selectedItems.map(
            (i) => `"${i.inventoryNumber || ''}","${i.name}","${i.model || ''}","${i.location || ''}","${i.status}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `equipment_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar(`Экспортировано записей: ${selectedItems.length}`, { variant: 'success' });
  };

  const handleBulkPrint = () => {
    enqueueSnackbar(`Сформирован пакет для печати (${selectedIds.length} паспортов)`, { variant: 'info' });
  };

  const criticalAlerts = useMemo(() => {
    const list = [];
    if (statusCounts.underRepair > 0) {
      list.push({
        id: 'repair-alert',
        severity: 'WARNING' as const,
        title: 'Оборудование требует завершения ремонта',
        description: `В статусе «В ремонте» находится ${statusCounts.underRepair} ед. оборудования. Проверьте регламенты и наряды ТО.`,
        count: statusCounts.underRepair,
        actionLabel: 'Показать список',
        onAction: () => handleKpiFilter('UNDER_REPAIR'),
      });
    }
    return list;
  }, [statusCounts.underRepair]);

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto', pb: selectedIds.length > 0 ? 8 : 2 }}>
      <PageHeader
        title="EPS — Паспортизация оборудования"
        subtitle="Единый реестр технологического оборудования предприятия, документации и технических характеристик"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Оборудование' }]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<AssessmentOutlinedIcon />}
              onClick={() => router.push('/eps/reports')}
              sx={{ px: 2, py: 0.75, fontWeight: 600 }}
            >
              Конструктор отчетов
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileUploadOutlinedIcon />}
              onClick={() => router.push('/eps/import')}
              sx={{ px: 2, py: 0.75, fontWeight: 600 }}
            >
              Импорт данных
            </Button>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push('/eps/new')}
                sx={{ px: 2.25, py: 0.75, fontWeight: 600 }}
              >
                Добавить оборудование
              </Button>
            )}
          </Box>
        }
      />

      {/* Critical Alerts Banner */}
      <CriticalAlertBanner alerts={criticalAlerts} />

      {/* Top KPI Metric Cards Bar with StatCard */}
      <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Всего оборудования"
            value={statusCounts.total}
            subtitle="Единиц в реестре предприятия"
            icon={<PrecisionManufacturingIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            active={statusFilter === ''}
            onClick={() => handleKpiFilter('')}
            loading={loading && statusCounts.total === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="В работе"
            value={statusCounts.active}
            subtitle="В штатной эксплуатации"
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
            subtitle="ТО или аварийные работы"
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
            title="На складе"
            value={statusCounts.inStorage}
            subtitle="Резерв и консервация"
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

      {/* Modern Filter and Search Toolbar */}
      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
        actions={
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, mode) => mode && setViewMode(mode)}
            size="small"
          >
            <ToggleButton value="table" aria-label="table view" sx={{ px: 1, py: 0.5 }}>
              <Tooltip title="Табличный вид">
                <ViewListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="grid" aria-label="grid view" sx={{ px: 1, py: 0.5 }}>
              <Tooltip title="Сетка карточек">
                <ViewModuleIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        }
      >
        <Box sx={{ minWidth: { xs: '100%', sm: 300, md: 360 } }}>
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
          sx={{ minWidth: 160 }}
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
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Все теги</MenuItem>
          {tags.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
      </FilterToolbar>

      {/* Main Table / Grid Container */}
      {items.length === 0 && !loading ? (
        <EmptyState
          paper
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
      ) : viewMode === 'table' ? (
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
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 48 }}>
                  <Checkbox
                    size="small"
                    indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(items.map((i) => i.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ width: 140 }}>Инв. номер</TableCell>
                <TableCell>Наименование оборудования</TableCell>
                <TableCell>Производитель / Модель</TableCell>
                <TableCell>Локация / Место</TableCell>
                <TableCell sx={{ width: 140 }}>Статус</TableCell>
                <TableCell>Теги</TableCell>
                <TableCell sx={{ width: 140 }}>Связи</TableCell>
                <TableCell sx={{ width: 120 }}>Ввод в экспл.</TableCell>
                <TableCell align="right" sx={{ width: 80 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((eq) => {
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
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={eq.inventoryNumber || 'Б/Н'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontFamily: 'monospace', borderRadius: '4px' }}
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
      ) : (
        /* Grid Card View */
        <Box>
          <Grid container spacing={2.5}>
            {items.map((eq) => (
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
                        sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20, borderRadius: '4px' }}
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

          {/* Grid View Pagination */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, val) => setPage(val)}
              color="primary"
              shape="rounded"
            />
          </Box>
        </Box>
      )}

      {/* Master-Detail Quick View Side Drawer (480px width on FHD 1920x1080) */}
      <Drawer
        anchor="right"
        open={Boolean(selectedEquipment)}
        onClose={() => setSelectedEquipment(null)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 480 },
            boxSizing: 'border-box',
            p: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {selectedEquipment && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer Header */}
            <Box
              sx={{
                p: 2.5,
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Chip
                  label={selectedEquipment.inventoryNumber || 'Б/Н'}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700, mb: 0.5 }}
                />
                <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                  Быстрый просмотр
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedEquipment(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Drawer Body */}
            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
              {loadingDetails ? (
                <PageLoading text="Загрузка сведений..." minHeight={200} size={28} />
              ) : (
                <>
                  <Typography variant="h6" fontWeight={700} color="primary.main" gutterBottom>
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
                        mb: 2.5,
                        border: '1px solid #e2e8f0',
                      }}
                    />
                  )}

                  {/* Status Quick Updater */}
                  <Card sx={{ p: 2, mb: 2.5, backgroundColor: '#f8fafc' }}>
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
                      <StatusBadge
                        status={selectedEquipment.status}
                      />
                    )}
                  </Card>

                  {/* Specifications */}
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Паспортные параметры:
                  </Typography>
                  <Table size="small" sx={{ mb: 2.5 }}>
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

                  {/* Custom Fields Summary */}
                  {quickViewDetails?.customFields && Object.keys(quickViewDetails.customFields).length > 0 && (
                    <>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Дополнительные характеристики:
                      </Typography>
                      <Table size="small" sx={{ mb: 2.5 }}>
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
                    </>
                  )}

                  {/* Attached Documents List */}
                  {quickViewDetails?.documents && quickViewDetails.documents.length > 0 && (
                    <>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Прикрепленные документы ({quickViewDetails.documents.length}):
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5 }}>
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
                            <IconButton size="small" component="a" href={`/api/files/${d.filePath}`} target="_blank">
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </Paper>
                        ))}
                      </Box>
                    </>
                  )}
                </>
              )}
            </Box>

            {/* Drawer Footer Action */}
            <Box sx={{ p: 2.5, borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
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
            </Box>
          </Box>
        )}
      </Drawer>

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
