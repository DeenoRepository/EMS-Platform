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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState(searchParams?.get('tagId') || '');

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
        pageSize: viewMode === 'grid' ? '12' : '20',
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (tagFilter) params.append('tagId', tagFilter);

      const res = await fetch(`/api/eps/equipment?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items || []);
          setTotal(json.data.total || 0);
          setTotalPages(json.data.totalPages || 1);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEquipment();
  };

  const canCreate = hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);

  return (
    <Box>
      <PageHeader
        title="EPS — Паспортизация оборудования"
        subtitle="Единый реестр технологического оборудования предприятия, документации и технических характеристик"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Оборудование' }]}
        actions={
          canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/eps/new')}
            >
              Добавить оборудование
            </Button>
          )
        }
      />

      {/* Filters Bar */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', flexGrow: 1 }}>
            <TextField
              size="small"
              placeholder="Поиск по названию, инвентарному или серийному номеру..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
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
              label="Тег / Категория"
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

            <Button type="submit" variant="outlined" size="medium">
              Применить
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, mode) => mode && setViewMode(mode)}
              size="small"
            >
              <ToggleButton value="table" aria-label="table view">
                <Tooltip title="Табличный вид">
                  <ViewListIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="grid" aria-label="grid view">
                <Tooltip title="Карточки">
                  <ViewModuleIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Card>

      {/* Content Area: Table or Grid */}
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
            <Table>
              <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Инв. номер</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Наименование оборудования</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Производитель / Модель</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Локация / Цех</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Теги</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ввод в экспл.</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((eq) => {
                  const statusInfo = EQUIPMENT_STATUS_MAP[eq.status] || { label: eq.status, color: 'default' };
                  return (
                    <TableRow
                      key={eq.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/eps/${eq.id}`)}
                    >
                      <TableCell>
                        <Chip
                          label={eq.inventoryNumber || 'Б/Н'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
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
                        <Typography variant="body2">{eq.manufacturer || '—'}</Typography>
                        {eq.model && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {eq.model}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{eq.location || '—'}</TableCell>
                      <TableCell>
                        <Chip label={statusInfo.label} size="small" color={statusInfo.color as any} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {eq.tags.map((t) => (
                            <Chip
                              key={t.id}
                              label={t.name}
                              size="small"
                              sx={{
                                fontSize: '0.75rem',
                                height: 20,
                                backgroundColor: t.color ? `${t.color}15` : undefined,
                                color: t.color || 'text.primary',
                                borderColor: t.color || undefined,
                              }}
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDate(eq.commissionDate)}</TableCell>
                      <TableCell align="right">
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
              Всего единиц оборудования: {total}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, val) => setPage(val)}
              color="primary"
              size="small"
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
                <Grid item xs={12} sm={6} md={4} key={eq.id}>
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
                    onClick={() => router.push(`/eps/${eq.id}`)}
                  >
                    {/* Card Photo Preview or Placeholder */}
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
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {eq.location || '—'}
                        </Typography>
                      </Box>

                      <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3} sx={{ mb: 1 }}>
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
