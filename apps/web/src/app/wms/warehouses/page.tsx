'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  IconButton,
  TextField,
  FormControlLabel,
  Switch,
  Skeleton,
  Stack,
  Tooltip,
  Divider,
  Paper,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  InputAdornment,
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import GridViewIcon from '@mui/icons-material/GridView';
import TableRowsIcon from '@mui/icons-material/TableRows';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';
import {
  StatCard,
  StatusBadge,
  EmptyState,
  FormDialog,
  SearchInput,
  DataTableWrapper,
} from '@/components/ui';
import { WarehouseTopologyModal } from '@/components/wms';

interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  responsibleUserId?: string | null;
  responsibleUser?: {
    id: string;
    displayName: string;
    ldapLogin: string;
    email?: string | null;
  } | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    stockItems: number;
    operations: number;
    inventories: number;
  };
}

export default function WmsWarehousesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [users, setUsers] = useState<{ id: string; displayName: string; ldapLogin: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');

  // Modal: Add / Edit Warehouse
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal: Topology & Cells (Interactive 2D Visualizer)
  const [isTopologyOpen, setIsTopologyOpen] = useState(false);
  const [selectedWarehouseForTopology, setSelectedWarehouseForTopology] = useState<WarehouseItem | null>(null);

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const [whRes, usersRes] = await Promise.all([
        fetch('/api/wms/warehouses?forManage=true'),
        fetch('/api/users'),
      ]);

      if (whRes.ok) {
        const json = await whRes.json();
        if (json.success) {
          setWarehouses(json.data);
        }
      }
      if (usersRes.ok) {
        const json = await usersRes.json();
        if (json.success) {
          setUsers(json.data);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке складов', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setLocation('');
    setResponsibleUserId('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleGenerateWarehouseCode = () => {
    const prefix = 'WH';
    const rand = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}-${rand}`);
  };

  const handleOpenEdit = (w: WarehouseItem) => {
    setEditingId(w.id);
    setName(w.name);
    setCode(w.code);
    setLocation(w.location || '');
    setResponsibleUserId(w.responsibleUserId || '');
    setIsActive(w.isActive);
    setIsModalOpen(true);
  };

  const handleOpenTopology = (w: WarehouseItem) => {
    setSelectedWarehouseForTopology(w);
    setIsTopologyOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      enqueueSnackbar('Укажите наименование склада', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/wms/warehouses/${editingId}` : '/api/wms/warehouses';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          location: location.trim() || undefined,
          responsibleUserId: responsibleUserId ? responsibleUserId.trim() : null,
          isActive,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(editingId ? 'Склад обновлен' : 'Склад успешно создан', { variant: 'success' });
        setIsModalOpen(false);
        fetchWarehouses();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения склада', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при сохранении склада', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = useMemo(() => {
    return Boolean(
      user?.roles?.includes('admin') ||
      hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
    );
  }, [user, hasPermission]);

  const visibleWarehouses = useMemo(() => {
    if (isAdmin) return warehouses;
    return warehouses.filter((w) => w.responsibleUserId === user?.userId);
  }, [warehouses, isAdmin, user?.userId]);

  const filteredWarehouses = useMemo(() => {
    if (!search.trim()) return visibleWarehouses;
    const q = search.toLowerCase();
    return visibleWarehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.location && w.location.toLowerCase().includes(q)) ||
        (w.responsibleUser && w.responsibleUser.displayName.toLowerCase().includes(q))
    );
  }, [visibleWarehouses, search]);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const paginatedWarehouses = useMemo(() => {
    return filteredWarehouses.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredWarehouses, page, rowsPerPage]);

  const totalWarehouses = visibleWarehouses.length;
  const activeWarehouses = visibleWarehouses.filter((w) => w.isActive).length;
  const totalStockItems = visibleWarehouses.reduce((acc, w) => acc + (w._count?.stockItems || 0), 0);
  const totalOperations = visibleWarehouses.reduce((acc, w) => acc + (w._count?.operations || 0), 0);

  return (
    <Box sx={{ width: '100%', pb: 2 }}>
      <PageHeader
        title="Склады и зоны хранения"
        subtitle="Справочник складских комплексов, топология зон и ячеек адресного хранения ТМЦ"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Склады' },
        ]}
        actions={
          hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              aria-label="Создать новый склад"
              sx={{
                height: 36,
                px: 2,
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '8px',
                textTransform: 'none',
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
              }}
            >
              Создать склад
            </Button>
          )
        }
      />

      {/* Summary KPI Cards Bar */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего складов"
            value={totalWarehouses}
            subtitle="Зарегистрировано комплексов"
            icon={<WarehouseOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Активные склады"
            value={activeWarehouses}
            subtitle="Готовы к операциям"
            icon={<WarehouseOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Учетных остатков"
            value={totalStockItems}
            subtitle="Позиций на складах"
            icon={<GridViewIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Проведено операций"
            value={totalOperations}
            subtitle="Приход, расход, перемещения"
            icon={<MeetingRoomOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(124, 58, 237, 0.08)"
            iconColor="#7c3aed"
            accentColor="#7c3aed"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {/* Search & View Toggle Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 2.5,
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ maxWidth: 360, width: '100%' }}>
          <SearchInput
            placeholder="Поиск по названию, коду или кладовщику..."
            value={search}
            onSearch={(v: string) => setSearch(v)}
          />
        </Box>


        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, next) => next && setViewMode(next)}
          sx={{ bgcolor: '#f8fafc' }}
        >
          <ToggleButton value="grid" aria-label="Сетка карточек">
            <GridViewIcon fontSize="small" sx={{ mr: 0.5 }} />
            Карточки
          </ToggleButton>
          <ToggleButton value="table" aria-label="Таблица">
            <TableRowsIcon fontSize="small" sx={{ mr: 0.5 }} />
            Таблица
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {isLoading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card sx={{ height: '100%', p: 2.5, borderRadius: '12px' }}>
                <Skeleton variant="text" width={140} height={28} />
                <Skeleton variant="rounded" height={22} sx={{ my: 1.5 }} />
                <Skeleton variant="rounded" height={60} sx={{ mb: 1.5 }} />
                <Skeleton variant="rounded" height={36} />
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filteredWarehouses.length === 0 ? (
        <EmptyState
          paper
          icon={<WarehouseOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title={search ? 'Склады не найдены' : 'Склады еще не зарегистрированы'}
          description={
            search
              ? 'Попробуйте изменить поисковый запрос'
              : 'Создайте первый складской комплекс для учета товарно-материальных ценностей и настройки адресного хранения.'
          }
          actionText={!search && hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE) ? 'Создать склад' : undefined}
          onAction={!search && hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE) ? handleOpenCreate : undefined}
        />
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2.5}>
          {filteredWarehouses.map((w) => (
            <Grid item xs={12} sm={6} md={4} key={w.id}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
                    borderColor: '#cbd5e1',
                  },
                }}
              >
                <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          bgcolor: 'rgba(2, 132, 199, 0.08)',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <WarehouseOutlinedIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                        {w.name}
                      </Typography>
                    </Box>
                    {(user?.roles.includes('admin') ||
                      hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE)) && (
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(w)}
                        aria-label={`Редактировать ${w.name}`}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#0f172a' } }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip label={`Код: ${w.code}`} size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: '4px' }} />
                    <StatusBadge status={w.isActive ? 'ACTIVE' : 'DRAFT'} />
                  </Stack>

                  {/* Responsible Person Widget */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      p: 1.25,
                      mb: 1.5,
                      bgcolor: w.responsibleUserId === user?.userId ? 'rgba(2, 132, 199, 0.06)' : '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: w.responsibleUserId === user?.userId ? '#bae6fd' : '#e2e8f0',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        bgcolor: w.responsibleUser ? '#0284c7' : '#94a3b8',
                      }}
                    >
                      {w.responsibleUser ? w.responsibleUser.displayName.charAt(0) : '?'}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', lineHeight: 1.1 }}>
                        Ответственное лицо:
                      </Typography>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: w.responsibleUser ? '#0f172a' : '#94a3b8',
                        }}
                      >
                        {w.responsibleUser ? w.responsibleUser.displayName : 'Не назначен'}
                      </Typography>
                    </Box>
                    {w.responsibleUserId === user?.userId && (
                      <Chip
                        label="Мой склад"
                        size="small"
                        color="primary"
                        sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700 }}
                      />
                    )}
                  </Box>

                  {w.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: '#64748b' }}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 16 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>{w.location}</Typography>
                    </Box>
                  )}

                  <Box sx={{ mt: 'auto', pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                    <Grid container spacing={1} sx={{ mb: 1.5 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Номенклатурных позиций
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                          {w._count.stockItems}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Всего операций
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                          {w._count.operations}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      startIcon={<MeetingRoomOutlinedIcon />}
                      onClick={() => handleOpenTopology(w)}
                      aria-label={`Топология и ячейки склада ${w.name}`}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: '#0284c7',
                        '&:hover': { bgcolor: '#0369a1' },
                      }}
                    >
                      Топология и ячейки
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <DataTableWrapper
          page={page}
          pageSize={rowsPerPage}
          total={filteredWarehouses.length}
          onPageChange={(_, newPage) => setPage(newPage)}
          onPageSizeChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          pageSizeOptions={[15, 25, 50, 100]}
          stickyHeader
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ minWidth: 160 }}>Наименование</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Код</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Статус</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Ответственный</TableCell>
                <TableCell align="right" sx={{ minWidth: 120 }}>Позиций ТМЦ</TableCell>
                <TableCell align="right" sx={{ minWidth: 100 }}>Операций</TableCell>
                <TableCell align="center" sx={{ minWidth: 100 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedWarehouses.map((w) => (
                <TableRow key={w.id} hover>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{w.name}</TableCell>
                  <TableCell>
                    <Chip label={w.code} size="small" variant="outlined" sx={{ borderRadius: '4px', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={w.isActive ? 'ACTIVE' : 'DRAFT'} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {w.responsibleUser?.displayName || '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                    {w._count.stockItems}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                    {w._count.operations}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<MeetingRoomOutlinedIcon />}
                        onClick={() => handleOpenTopology(w)}
                        sx={{ borderRadius: '6px', fontSize: '0.6875rem', textTransform: 'none' }}
                      >
                        Топология
                      </Button>
                      {(user?.roles.includes('admin') ||
                        hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE)) && (
                        <IconButton size="small" onClick={() => handleOpenEdit(w)} aria-label="Редактировать склад">
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {/* Модальное окно создания / редактирования склада */}
      <FormDialog
        open={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingId ? 'Редактирование склада' : 'Создание нового склада'}
        subtitle="Настройка параметров складского комплекса и ответственного персонала"
        icon={<WarehouseOutlinedIcon color="primary" />}
        maxWidth="sm"
        loading={isSubmitting}
        submitLabel={isSubmitting ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать склад'}
        onSubmit={handleSubmit}
        submitDisabled={isSubmitting || !name.trim()}
      >
        <Stack spacing={2.25}>
          <TextField
            fullWidth
            required
            label="Наименование склада"
            placeholder="например, Центральный склад запчастей"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField
            fullWidth
            label="Складской код / Идентификатор"
            placeholder="WH-MAIN"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            helperText="Используется в накладных и адресах ячеек"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoAwesomeIcon sx={{ fontSize: 16, color: '#7c3aed' }} />}
                    onClick={handleGenerateWarehouseCode}
                    sx={{
                      height: 36,
                      borderRadius: '6px',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      borderColor: '#e2e8f0',
                      color: '#475569',
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        borderColor: '#7c3aed',
                        color: '#7c3aed',
                        bgcolor: 'rgba(124, 58, 237, 0.04)',
                      },
                    }}
                  >
                    Автокод
                  </Button>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Местоположение / Локация"
            placeholder="Корпус 4, цех №1..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <FormControl fullWidth>
            <InputLabel id="responsible-user-label">Ответственное лицо (Кладовщик)</InputLabel>
            <Select
              labelId="responsible-user-label"
              value={responsibleUserId}
              label="Ответственное лицо (Кладовщик)"
              onChange={(e) => setResponsibleUserId(e.target.value)}
            >
              <MenuItem value="">
                <em>— Не назначен —</em>
              </MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.displayName} ({u.ldapLogin})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ pt: 0.5 }}>
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" />}
              label={<Typography variant="body2" fontWeight={600} color="#1e293b">Склад активен для проведения операций</Typography>}
            />
          </Box>
        </Stack>
      </FormDialog>

      {/* 2D Topology Modal */}
      <WarehouseTopologyModal
        open={isTopologyOpen}
        onClose={() => setIsTopologyOpen(false)}
        warehouse={selectedWarehouseForTopology}
        onRefreshParent={fetchWarehouses}
      />
    </Box>
  );
}
