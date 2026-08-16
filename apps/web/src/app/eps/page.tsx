'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
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
import PageHeader from '@/components/layout/PageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { EQUIPMENT_STATUS_MAP, formatDate, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';

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
        pageSize: viewMode === 'grid' ? '12' : '25',
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

          // Update Status Counts summary if not filtered
          if (!statusFilter && !search && !tagFilter) {
            let active = 0, underRepair = 0, inStorage = 0, decommissioned = 0;
            fetchedItems.forEach((it) => {
              if (it.status === 'ACTIVE') active++;
              else if (it.status === 'UNDER_REPAIR') underRepair++;
              else if (it.status === 'IN_STORAGE') inStorage++;
              else if (it.status === 'DECOMMISSIONED') decommissioned++;
            });
            setStatusCounts({
              total: json.data.total || 0,
              active,
              underRepair,
              inStorage,
              decommissioned,
            });
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки каталога оборудования', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tagFilter, viewMode, enqueueSnackbar]);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const handleRowClick = async (eq: EquipmentItem) => {
    setSelectedEquipment(eq);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/eps/equipment/${eq.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setQuickViewDetails(json.data);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEquipment();
  };

  const handleKpiFilter = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter('');
    } else {
      setStatusFilter(status);
    }
    setPage(1);
  };

  const canCreate = hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);
  const canEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
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
              sx={{ px: 2, py: 1, fontWeight: 600 }}
            >
              Конструктор отчетов
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileUploadOutlinedIcon />}
              onClick={() => router.push('/eps/import')}
              sx={{ px: 2, py: 1, fontWeight: 600 }}
            >
              Импорт данных
            </Button>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push('/eps/new')}
                sx={{ px: 2.5, py: 1, fontWeight: 600 }}
              >
                Добавить оборудование
              </Button>
            )}
          </Box>
        }
      />

      {/* Top KPI Metric Cards Bar (Compact Enterprise Grid) */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === '' ? '2px solid #0284c7' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === '' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="primary.main" fontWeight={700} fontSize="0.6875rem">
                ВСЕГО ЕДИНИЦ
              </Typography>
              <PrecisionManufacturingIcon color="primary" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: '#0f172a', fontSize: '1.25rem' }}>
              {statusCounts.total}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('ACTIVE')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === 'ACTIVE' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'ACTIVE' ? 'rgba(22, 163, 74, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="success.main" fontWeight={700} fontSize="0.6875rem">
                В РАБОТЕ
              </Typography>
              <CheckCircleOutlineIcon color="success" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'success.main', fontSize: '1.25rem' }}>
              {statusCounts.active}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('UNDER_REPAIR')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === 'UNDER_REPAIR' ? '2px solid #d97706' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'UNDER_REPAIR' ? 'rgba(217, 119, 6, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="warning.main" fontWeight={700} fontSize="0.6875rem">
                НА РЕМОНТЕ
              </Typography>
              <BuildCircleOutlinedIcon color="warning" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'warning.main', fontSize: '1.25rem' }}>
              {statusCounts.underRepair}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('IN_STORAGE')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === 'IN_STORAGE' ? '2px solid #64748b' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'IN_STORAGE' ? 'rgba(100, 116, 139, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize="0.6875rem">
                НА СКЛАДЕ
              </Typography>
              <InventoryIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'text.primary', fontSize: '1.25rem' }}>
              {statusCounts.inStorage}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('DECOMMISSIONED')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === 'DECOMMISSIONED' ? '2px solid #dc2626' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'DECOMMISSIONED' ? 'rgba(220, 38, 38, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="error.main" fontWeight={700} fontSize="0.6875rem">
                СПИСАНО
              </Typography>
              <CancelOutlinedIcon sx={{ color: 'error.main', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'error.main', fontSize: '1.25rem' }}>
              {statusCounts.decommissioned}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Toolbar */}
      <Card sx={{ p: 1.25, mb: 2 }}>
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            display: 'flex',
            gap: 1.5,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', flexGrow: 1 }}>
            <TextField
              size="small"
              placeholder="Поиск по названию, инвентарному..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 280, flexGrow: { xs: 1, md: 0 } }}
            />

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
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Все теги</MenuItem>
              {tags.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>

            <Button type="submit" variant="outlined" size="small" sx={{ px: 2 }}>
              Применить
            </Button>
            {(search || statusFilter || tagFilter) && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setTagFilter('');
                  setPage(1);
                }}
                color="inherit"
              >
                Сбросить
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, mode) => mode && setViewMode(mode)}
              size="small"
            >
              <ToggleButton value="table" aria-label="table view" sx={{ p: 0.5 }}>
                <Tooltip title="Табличный вид">
                  <ViewListIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="grid" aria-label="grid view" sx={{ p: 0.5 }}>
                <Tooltip title="Сетка карточек">
                  <ViewModuleIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Card>

      {/* Main Table / Grid Container */}
      {loading ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Card>
      ) : items.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <PrecisionManufacturingIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Оборудование не найдено
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Попробуйте изменить параметры поиска или сбросить фильтры
          </Typography>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push('/eps/new')}>
              Создать единицу оборудования
            </Button>
          )}
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Инв. номер</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Наименование оборудования</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Производитель / Модель</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Локация / Место</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Теги</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 150 }}>Связи</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 120 }}>Ввод в экспл.</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: 110 }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((eq) => {
                  const statusInfo = EQUIPMENT_STATUS_MAP[eq.status] || { label: eq.status, color: 'default' };
                  const isSelected = selectedEquipment?.id === eq.id;
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
                      <TableCell>
                        <Chip
                          label={eq.inventoryNumber || 'Б/Н'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontFamily: 'monospace' }}
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
                        <Chip label={statusInfo.label} size="small" color={statusInfo.color as any} sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {eq.tags.map((t) => (
                            <Chip
                              key={t.id}
                              label={t.name}
                              size="small"
                              sx={{
                                fontSize: '0.725rem',
                                height: 22,
                                backgroundColor: t.color ? `${t.color}15` : undefined,
                                color: t.color || 'text.primary',
                                borderColor: t.color || undefined,
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
                              <DescriptionOutlinedIcon fontSize="inherit" />
                              <span>{eq.counts.documents}</span>
                            </Box>
                          </Tooltip>
                          <Tooltip title="Планов ТО">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              <ConstructionOutlinedIcon fontSize="inherit" />
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
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Всего единиц оборудования в реестре: {total} (кликните по строке для быстрого просмотра)
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, val) => setPage(val)}
              color="primary"
              size="medium"
            />
          </Box>
        </Card>
      ) : (
        /* Grid Card View */
        <Box>
          <Grid container spacing={3}>
            {items.map((eq) => {
              const statusInfo = EQUIPMENT_STATUS_MAP[eq.status] || { label: eq.status, color: 'default' };
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={eq.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)',
                      },
                    }}
                    onClick={() => handleRowClick(eq)}
                  >
                    <Box
                      sx={{
                        height: 140,
                        backgroundColor: '#f1f5f9',
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
                        <PrecisionManufacturingIcon sx={{ fontSize: 48, color: '#94a3b8' }} />
                      )}
                      <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          color={statusInfo.color as any}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Box>

                    <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Chip
                          label={eq.inventoryNumber || 'Б/Н'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {eq.location || '—'}
                        </Typography>
                      </Box>

                      <Typography variant="subtitle2" fontWeight={700} lineHeight={1.3} sx={{ mb: 1 }}>
                        {eq.name}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {eq.manufacturer} {eq.model && `• ${eq.model}`}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2, flexGrow: 1 }}>
                        {eq.tags.map((t) => (
                          <Chip
                            key={t.id}
                            label={t.name}
                            size="small"
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              backgroundColor: t.color ? `${t.color}15` : undefined,
                              color: t.color || 'text.primary',
                            }}
                          />
                        ))}
                      </Box>

                      <Box
                        sx={{
                          pt: 1.5,
                          borderTop: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span>📄 Документов: {eq.counts.documents}</span>
                        <span>🔧 ТО: {eq.counts.maintenancePlans}</span>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, val) => setPage(val)}
              color="primary"
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
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CircularProgress size={32} />
                </Box>
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
                      <Chip
                        label={EQUIPMENT_STATUS_MAP[selectedEquipment.status]?.label || selectedEquipment.status}
                        color={EQUIPMENT_STATUS_MAP[selectedEquipment.status]?.color as any}
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
    </Box>
  );
}

export default function EquipmentListPage() {
  return (
    <Suspense
      fallback={
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Card>
      }
    >
      <EquipmentListContent />
    </Suspense>
  );
}
