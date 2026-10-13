'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  TextField,
  MenuItem,
  Stack,
  Box,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import { useSnackbar } from 'notistack';
import { FormDialog } from '@/components/ui';

export interface BulkLocationItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  name: string;
  article?: string;
  unit?: string;
  quantity?: number;
  cellCode?: string | null;
}

interface StorageCell {
  id: string;
  code: string;
  name?: string | null;
}

interface StorageZone {
  id: string;
  name: string;
  code: string;
  cells: StorageCell[];
}

interface BulkLocationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedItems: BulkLocationItem[];
}

export default function BulkLocationModal({
  open,
  onClose,
  onSuccess,
  selectedItems,
}: BulkLocationModalProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [selectedCellId, setSelectedCellId] = useState('');
  const [zones, setZones] = useState<StorageZone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uniqueWarehouses = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    selectedItems.forEach((i) => {
      if (!map.has(i.warehouseId)) {
        map.set(i.warehouseId, { id: i.warehouseId, name: i.warehouseName, code: i.warehouseCode });
      }
    });
    return Array.from(map.values());
  }, [selectedItems]);

  const isMultiWarehouse = uniqueWarehouses.length > 1;
  const currentWarehouse = uniqueWarehouses.length === 1 ? uniqueWarehouses[0] : null;

  useEffect(() => {
    if (open) {
      setSelectedCellId('');
      if (currentWarehouse) {
        setIsLoadingZones(true);
        fetch(`/api/wms/warehouses/${currentWarehouse.id}/zones`)
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              setZones(json.data);
            } else {
              setZones([]);
            }
          })
          .catch((err) => {
            console.error('Ошибка загрузки ячеек склада:', err);
            setZones([]);
          })
          .finally(() => setIsLoadingZones(false));
      } else {
        setZones([]);
      }
    }
  }, [open, currentWarehouse]);

  const handleSubmit = async () => {
    if (selectedItems.length === 0) return;
    if (isMultiWarehouse) {
      enqueueSnackbar('Массовое перемещение возможно только в пределах одного склада', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wms/stock/batch-location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockItemIds: selectedItems.map((i) => i.id),
          cellId: selectedCellId || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(json.message || 'Ячейка успешно назначена для выбранных позиций', { variant: 'success' });
        onSuccess();
        onClose();
      } else {
        enqueueSnackbar(json.error || 'Ошибка при назначении ячеек', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при назначении ячеек', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCellsCount = useMemo(() => {
    return zones.reduce((sum, z) => sum + (z.cells?.length || 0), 0);
  }, [zones]);

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Массовое перемещение в ячейку"
      subtitle={`Закрепление адреса хранения для ${selectedItems.length} выбранных позиций`}
      icon={<PlaceOutlinedIcon color="primary" />}
      maxWidth="md"
      loading={isSubmitting}
      submitLabel={isSubmitting ? 'Сохранение...' : 'Применить перемещение'}
      onSubmit={handleSubmit}
      submitDisabled={isSubmitting || selectedItems.length === 0 || isMultiWarehouse}
    >
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {/* Предупреждение если выбраны ТМЦ с разных складов */}
        {isMultiWarehouse && (
          <Alert severity="warning" sx={{ borderRadius: '8px' }}>
            Вы выбрали позиции с разных складов: <b>{uniqueWarehouses.map((w) => w.name).join(', ')}</b>.
            Массовое размещение в ячейку возможно только в пределах одного склада. Пожалуйста, отфильтруйте список ТМЦ по одному складу.
          </Alert>
        )}

        {/* Карточка склада */}
        {currentWarehouse && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <WarehouseIcon color="primary" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Склад: {currentWarehouse.name} ({currentWarehouse.code})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Всего выбрано: {selectedItems.length} позиций ТМЦ
                </Typography>
              </Box>
            </Box>
            <Chip
              size="small"
              label={
                isLoadingZones
                  ? 'Загрузка зон...'
                  : totalCellsCount > 0
                  ? `Доступно ячеек: ${totalCellsCount}`
                  : 'Ячейки не созданы'
              }
              color={totalCellsCount > 0 ? 'primary' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Paper>
        )}

        {/* Выбор целевой ячейки */}
        {currentWarehouse && !isMultiWarehouse && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
              Целевая ячейка склада для всех выбранных позиций:
            </Typography>
            {isLoadingZones ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Загрузка структуры адресного хранения склада...
                </Typography>
              </Box>
            ) : totalCellsCount === 0 ? (
              <Alert severity="info" sx={{ borderRadius: '8px' }}>
                На данном складе еще не сконфигурированы зоны и ячейки хранения. Настроить топологию склада можно в разделе «Склады».
              </Alert>
            ) : (
              <TextField
                select
                fullWidth
                size="small"
                label="Выберите ячейку хранения"
                value={selectedCellId}
                onChange={(e) => setSelectedCellId(e.target.value)}
                helperText="Выбранная ячейка будет закреплена за всеми отмеченными позициями"
              >
                <MenuItem value="">
                  <em>— Без адреса (очистить ячейки у выбранных позиций) —</em>
                </MenuItem>
                {zones.map((zone) => [
                  <MenuItem key={`header-${zone.id}`} disabled sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>
                    {zone.name} ({zone.code})
                  </MenuItem>,
                  ...zone.cells.map((cell) => (
                    <MenuItem key={cell.id} value={cell.id} sx={{ pl: 4 }}>
                      {cell.code} {cell.name ? `— ${cell.name}` : ''}
                    </MenuItem>
                  )),
                ])}
              </TextField>
            )}
          </Box>
        )}

        {/* Перечень перемещаемых позиций */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
            Перемещаемые позиции ТМЦ ({selectedItems.length}):
          </Typography>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', maxHeight: 240, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Номенклатура</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Артикул</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Остаток</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Текущая ячейка</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ py: 0.75, fontWeight: 600, fontSize: '0.8125rem' }}>
                      {item.name}
                    </TableCell>
                    <TableCell sx={{ py: 0.75, color: 'text.secondary', fontSize: '0.75rem' }}>
                      {item.article || '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.75, fontFeatureSettings: '"tnum"', fontSize: '0.8125rem' }}>
                      {item.quantity ?? '—'} {item.unit || ''}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>
                      {item.cellCode ? (
                        <Chip
                          size="small"
                          label={item.cellCode}
                          color="default"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.7rem', height: 20 }}
                        />
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      </Stack>
    </FormDialog>
  );
}
