'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Skeleton,
  Stack,
  Tooltip,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import GridViewIcon from '@mui/icons-material/GridView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';
import { StatCard, StatusBadge, EmptyState, PageLoading } from '@/components/ui';

interface StorageCell {
  id: string;
  zoneId: string;
  code: string;
  name?: string | null;
  _count?: {
    stockItems: number;
  };
}

interface StorageZone {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  description?: string | null;
  cells: StorageCell[];
}

interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  location?: string | null;
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
  const { hasPermission } = useAuth();

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal: Add / Edit Warehouse
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal: Manage Zones & Cells
  const [isZonesModalOpen, setIsZonesModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseItem | null>(null);
  const [zones, setZones] = useState<StorageZone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);

  // Add Zone Form
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCode, setNewZoneCode] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [isAddingZone, setIsAddingZone] = useState(false);

  // Add Cell Form (per active zone)
  const [activeZoneIdForCell, setActiveZoneIdForCell] = useState<string | null>(null);
  const [newCellCode, setNewCellCode] = useState('');
  const [newCellName, setNewCellName] = useState('');
  const [isAddingCell, setIsAddingCell] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/wms/warehouses');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setWarehouses(json.data);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки складов:', err);
      enqueueSnackbar('Ошибка загрузки списка складов', { variant: 'error' });
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
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (w: WarehouseItem) => {
    setEditingId(w.id);
    setName(w.name);
    setCode(w.code);
    setLocation(w.location || '');
    setIsActive(w.isActive);
    setIsModalOpen(true);
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
    } catch (err) {
      enqueueSnackbar('Ошибка сети при сохранении склада', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Zones management
  const fetchZones = async (whId: string) => {
    setIsLoadingZones(true);
    try {
      const res = await fetch(`/api/wms/warehouses/${whId}/zones`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setZones(json.data);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки зон склада:', err);
    } finally {
      setIsLoadingZones(false);
    }
  };

  const handleOpenZonesModal = (w: WarehouseItem) => {
    setSelectedWarehouse(w);
    setIsZonesModalOpen(true);
    fetchZones(w.id);
  };

  const handleCreateZone = async () => {
    if (!selectedWarehouse || !newZoneName.trim() || !newZoneCode.trim()) {
      enqueueSnackbar('Укажите название и код зоны', { variant: 'warning' });
      return;
    }

    setIsAddingZone(true);
    try {
      const res = await fetch(`/api/wms/warehouses/${selectedWarehouse.id}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newZoneName.trim(),
          code: newZoneCode.trim(),
          description: newZoneDesc.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Зона склада создана', { variant: 'success' });
        setNewZoneName('');
        setNewZoneCode('');
        setNewZoneDesc('');
        fetchZones(selectedWarehouse.id);
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания зоны', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при создании зоны', { variant: 'error' });
    } finally {
      setIsAddingZone(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!selectedWarehouse) return;
    try {
      const res = await fetch(`/api/wms/zones/${zoneId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Зона удалена', { variant: 'success' });
        fetchZones(selectedWarehouse.id);
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления зоны', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при удалении зоны', { variant: 'error' });
    }
  };

  const handleCreateCell = async (zoneId: string) => {
    if (!selectedWarehouse || !newCellCode.trim()) {
      enqueueSnackbar('Укажите номер/код ячейки', { variant: 'warning' });
      return;
    }

    setIsAddingCell(true);
    try {
      const res = await fetch(`/api/wms/zones/${zoneId}/cells`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCellCode.trim(),
          name: newCellName.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Ячейка добавлена', { variant: 'success' });
        setNewCellCode('');
        setNewCellName('');
        setActiveZoneIdForCell(null);
        fetchZones(selectedWarehouse.id);
      } else {
        enqueueSnackbar(json.error || 'Ошибка добавления ячейки', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при добавлении ячейки', { variant: 'error' });
    } finally {
      setIsAddingCell(false);
    }
  };

  const handleDeleteCell = async (zoneId: string, cellId: string) => {
    if (!selectedWarehouse) return;
    try {
      const res = await fetch(`/api/wms/zones/${zoneId}/cells?cellId=${cellId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Ячейка удалена', { variant: 'success' });
        fetchZones(selectedWarehouse.id);
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления ячейки', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при удалении ячейки', { variant: 'error' });
    }
  };

  const totalWarehouses = warehouses.length;
  const activeWarehouses = warehouses.filter((w) => w.isActive).length;
  const totalStockItems = warehouses.reduce((acc, w) => acc + (w._count?.stockItems || 0), 0);
  const totalOperations = warehouses.reduce((acc, w) => acc + (w._count?.operations || 0), 0);

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto', pb: 4 }}>
      <PageHeader
        title="Склады и зоны хранения"
        subtitle="Справочник складских комплексов, топология зон и ячеек адресного хранения ТМЦ"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Склады' },
        ]}
        actions={
          hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              aria-label="Создать новый склад"
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

      {isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card sx={{ height: '100%', p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Skeleton variant="text" width={140} height={28} />
                  <Skeleton variant="circular" width={28} height={28} />
                </Box>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Skeleton variant="rounded" width={80} height={22} />
                  <Skeleton variant="rounded" width={70} height={22} />
                </Stack>
                <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={40} />
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : warehouses.length === 0 ? (
        <EmptyState
          paper
          icon={<WarehouseOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="Склады еще не зарегистрированы"
          description="Создайте первый складской комплекс для учета товарно-материальных ценностей и настройки адресного хранения."
          actionText={hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) ? 'Создать склад' : undefined}
          onAction={hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) ? handleOpenCreate : undefined}
        />
      ) : (
        <Grid container spacing={3}>
          {warehouses.map((w) => (
            <Grid item xs={12} sm={6} md={4} key={w.id}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) => theme.shadows[4],
                  },
                }}
              >
                <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarehouseOutlinedIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        {w.name}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(w)}
                      aria-label={`Редактировать ${w.name}`}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={`Код: ${w.code}`} size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: '4px' }} />
                    <StatusBadge status={w.isActive ? 'ACTIVE' : 'DRAFT'} />
                  </Stack>

                  {w.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'text.secondary' }}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 18 }} />
                      <Typography variant="body2">{w.location}</Typography>
                    </Box>
                  )}

                  <Box sx={{ mt: 'auto', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Grid container spacing={1} sx={{ mb: 1.5 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Номенклатурных позиций
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {w._count.stockItems}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Всего операций
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {w._count.operations}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<GridViewIcon />}
                      onClick={() => handleOpenZonesModal(w)}
                      aria-label={`Зоны и ячейки склада ${w.name}`}
                    >
                      Зоны и ячейки хранения
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Модальное окно создания / редактирования склада */}
      <Dialog open={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingId ? 'Редактирование склада' : 'Создание нового склада'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
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
              helperText="Оставьте пустым для автогенерации кода"
            />

            <TextField
              fullWidth
              label="Местоположение / Локация"
              placeholder="Корпус 4, цех №1..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" />}
              label={<Typography variant="body2" fontWeight={600}>Склад активен для операций</Typography>}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать склад'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модальное окно управления адресным хранением (Зоны и Ячейки) */}
      <Dialog
        open={isZonesModalOpen}
        onClose={() => setIsZonesModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MeetingRoomOutlinedIcon color="primary" />
          Адресное хранение: {selectedWarehouse?.name} ({selectedWarehouse?.code})
        </DialogTitle>
        <DialogContent dividers>
          {isLoadingZones ? (
            <PageLoading text="Загрузка зон и ячеек склада..." minHeight={180} size={28} />
          ) : (
            <Stack spacing={3}>
              {/* Форма быстрого добавления новой зоны */}
              {hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                    + Создать новую зону хранения
                  </Typography>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        size="small"
                        fullWidth
                        required
                        label="Название зоны"
                        placeholder="Зона A (Мелкие узлы)"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size="small"
                        fullWidth
                        required
                        label="Код зоны"
                        placeholder="ZONE-A"
                        value={newZoneCode}
                        onChange={(e) => setNewZoneCode(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3.5}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Описание / Назначение"
                        placeholder="Стеллажи 1-5"
                        value={newZoneDesc}
                        onChange={(e) => setNewZoneDesc(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={1.5}>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        onClick={handleCreateZone}
                        disabled={isAddingZone}
                        sx={{ py: 0.9 }}
                      >
                        {isAddingZone ? '...' : 'Создать'}
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* Список зон и ячеек */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Зоны и ячейки склада ({zones.length})
                </Typography>

                {zones.length === 0 ? (
                  <EmptyState
                    title="Зоны хранения не созданы"
                    description="В этом складе пока нет созданных зон хранения. Используйте форму выше для создания первой зоны."
                    minHeight={160}
                  />
                ) : (
                  <Stack spacing={1.5}>
                    {zones.map((zone) => (
                      <Accordion key={zone.id} variant="outlined" defaultExpanded sx={{ borderRadius: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {zone.name}
                              </Typography>
                              <Chip label={zone.code} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                              {zone.description && (
                                <Typography variant="caption" color="text.secondary">
                                  ({zone.description})
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={`${zone.cells.length} ячеек`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteZone(zone.id);
                                  }}
                                  aria-label={`Удалить зону ${zone.name}`}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                          <Divider sx={{ mb: 2 }} />

                          {/* Ячейки внутри зоны */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                              Ячейки и места размещения:
                            </Typography>
                            {zone.cells.length === 0 ? (
                              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                В зоне пока нет ячеек
                              </Typography>
                            ) : (
                              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                {zone.cells.map((cell) => (
                                  <Chip
                                    key={cell.id}
                                    label={`${cell.code}${cell.name ? ` (${cell.name})` : ''}`}
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                    onDelete={
                                      hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE)
                                        ? () => handleDeleteCell(zone.id, cell.id)
                                        : undefined
                                    }
                                    sx={{ fontWeight: 600 }}
                                  />
                                ))}
                              </Stack>
                            )}
                          </Box>

                          {/* Форма добавления ячейки в зону */}
                          {hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && (
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1.5 }}>
                              <TextField
                                size="small"
                                placeholder="Код ячейки (напр. 01-A, Ряд-1)"
                                value={activeZoneIdForCell === zone.id ? newCellCode : ''}
                                onChange={(e) => {
                                  setActiveZoneIdForCell(zone.id);
                                  setNewCellCode(e.target.value);
                                }}
                                sx={{ width: 220 }}
                              />
                              <TextField
                                size="small"
                                placeholder="Описание (опц.)"
                                value={activeZoneIdForCell === zone.id ? newCellName : ''}
                                onChange={(e) => {
                                  setActiveZoneIdForCell(zone.id);
                                  setNewCellName(e.target.value);
                                }}
                                sx={{ width: 200 }}
                              />
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => handleCreateCell(zone.id)}
                                disabled={isAddingCell || activeZoneIdForCell !== zone.id || !newCellCode.trim()}
                              >
                                Добавить ячейку
                              </Button>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsZonesModalOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
