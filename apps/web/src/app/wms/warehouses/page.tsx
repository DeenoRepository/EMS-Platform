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
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HistoryToggleOffOutlinedIcon from '@mui/icons-material/HistoryToggleOffOutlined';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';

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

  // Modal: Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Склады и зоны хранения"
        subtitle="Справочник складских комплексов, цеховых складов и мест размещения ТМЦ"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Склады' },
        ]}
        actions={
          hasPermission(PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Создать склад
            </Button>
          )
        }
      />

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
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Склады еще не зарегистрированы
          </Typography>
        </Card>
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
                <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarehouseOutlinedIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        {w.name}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleOpenEdit(w)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={`Код: ${w.code}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                    <Chip
                      label={w.isActive ? 'Активен' : 'Отключен'}
                      size="small"
                      color={w.isActive ? 'success' : 'default'}
                      variant={w.isActive ? 'filled' : 'outlined'}
                    />
                  </Stack>

                  {w.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'text.secondary' }}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 18 }} />
                      <Typography variant="body2">{w.location}</Typography>
                    </Box>
                  )}

                  <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Grid container spacing={1}>
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
    </Box>
  );
}
