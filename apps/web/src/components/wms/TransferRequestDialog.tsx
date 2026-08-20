'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Stack,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Alert,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { FormDialog } from '@/components/ui';

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  responsibleUserId?: string | null;
  responsibleUser?: { displayName: string } | null;
}

interface NomenclatureOption {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  category?: { name: string } | null;
}

interface RequestLineItem {
  nomenclatureId: string;
  nomenclatureName: string;
  nomenclatureArticle?: string;
  unit: string;
  quantity: number;
}

interface TransferRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferRequestDialog({
  open,
  onClose,
  onSuccess,
}: TransferRequestDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [nomenclatures, setNomenclatures] = useState<NomenclatureOption[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Line items
  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);
  const [selectedNomenclature, setSelectedNomenclature] = useState<NomenclatureOption | null>(null);
  const [itemQty, setItemQty] = useState('1');
  const [requestReason, setRequestReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // My warehouse (destination)
  const myWarehouse = useMemo(() => {
    return warehouses.find((w) => w.responsibleUserId === user?.userId) || warehouses[0] || null;
  }, [warehouses, user?.userId]);

  useEffect(() => {
    if (open) {
      setLineItems([]);
      setSelectedNomenclature(null);
      setItemQty('1');
      setRequestReason('');
      setSourceWarehouseId('');

      // Load all warehouses
      fetch('/api/wms/warehouses?forTransfer=true')
        .then((r) => r.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setWarehouses(json.data);
            const myWh = json.data.find((w: any) => w.responsibleUserId === user?.userId) || json.data[0];
            if (myWh) {
              setTargetWarehouseId(myWh.id);
              const firstDonor = json.data.find((w: any) => w.id !== myWh.id);
              if (firstDonor) {
                setSourceWarehouseId(firstDonor.id);
              }
            }
          }
        })
        .catch(console.error);

      // Load nomenclatures
      fetch('/api/wms/nomenclature?limit=500')
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setNomenclatures(json.data.items || json.data || []);
          }
        })
        .catch(console.error);
    }
  }, [open, user?.userId]);

  // Load donor warehouse stock
  useEffect(() => {
    if (sourceWarehouseId) {
      setIsLoadingStock(true);
      fetch(`/api/wms/stock?warehouseId=${sourceWarehouseId}&pageSize=1000`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            const map: Record<string, number> = {};
            (json.data.items || []).forEach((s: any) => {
              map[s.nomenclatureId] = Number(s.quantity);
            });
            setStockMap(map);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingStock(false));
    } else {
      setStockMap({});
    }
  }, [sourceWarehouseId]);

  const handleAddItem = () => {
    if (!selectedNomenclature) return;
    const qty = parseFloat(itemQty);
    if (isNaN(qty) || qty <= 0) {
      enqueueSnackbar('Укажите корректное количество (> 0)', { variant: 'warning' });
      return;
    }

    const existingIdx = lineItems.findIndex((it) => it.nomenclatureId === selectedNomenclature.id);
    if (existingIdx >= 0) {
      const updated = [...lineItems];
      updated[existingIdx].quantity += qty;
      setLineItems(updated);
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          nomenclatureId: selectedNomenclature.id,
          nomenclatureName: selectedNomenclature.name,
          nomenclatureArticle: selectedNomenclature.article || undefined,
          unit: selectedNomenclature.unit,
          quantity: qty,
        },
      ]);
    }

    setSelectedNomenclature(null);
    setItemQty('1');
  };

  const handleRemoveItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!sourceWarehouseId) {
      enqueueSnackbar('Выберите склад-донор, у которого запрашиваются ТМЦ', { variant: 'warning' });
      return;
    }
    if (!targetWarehouseId) {
      enqueueSnackbar('Не определен ваш целевой склад', { variant: 'warning' });
      return;
    }
    if (lineItems.length === 0) {
      enqueueSnackbar('Добавьте хотя бы одну позицию ТМЦ в заявку', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wms/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceWarehouseId,
          targetWarehouseId,
          isRequest: true,
          requestReason: requestReason.trim() || undefined,
          items: lineItems.map((it) => ({
            nomenclatureId: it.nomenclatureId,
            quantity: it.quantity,
          })),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Заявка на перемещение успешно отправлена кладовщику склада-донора', { variant: 'success' });
        onSuccess();
        onClose();
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания заявки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при отправке заявки', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const donorWh = warehouses.find((w) => w.id === sourceWarehouseId);
  const myWh = warehouses.find((w) => w.id === targetWarehouseId);

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Запрос на перемещение ТМЦ"
      subtitle="Заявка на перевод позиций с другого склада предприятия на ваш склад"
      icon={<MoveToInboxIcon color="primary" />}
      maxWidth="md"
      loading={isSubmitting}
      submitLabel="Направить запрос кладовщику"
      submitIcon={<SendIcon />}
      onSubmit={handleSubmit}
      submitDisabled={isSubmitting || !sourceWarehouseId || lineItems.length === 0}
    >
      <Stack spacing={2.5}>
        <Alert severity="info" icon={<MoveToInboxIcon />} sx={{ borderRadius: '8px' }}>
          Заявка поступит материально ответственному лицу склада-донора. После его согласования ТМЦ будут отгружены в ваш адрес.
        </Alert>

        <Grid container spacing={2}>
          {/* Склад-получатель (Мой склад) */}
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mb: 0.75, textTransform: 'uppercase' }}>
              Склад назначения (Ваш склад):
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                {myWh ? `${myWh.name} (${myWh.code})` : 'Определение склада...'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                МОЛ: <b>{user?.displayName || 'Вы'}</b>
              </Typography>
            </Paper>
          </Grid>

          {/* Склад-донор */}
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mb: 0.75, textTransform: 'uppercase' }}>
              Склад-донор (Откуда запросить ТМЦ):
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              required
              value={sourceWarehouseId}
              onChange={(e) => setSourceWarehouseId(e.target.value)}
              SelectProps={{
                displayEmpty: true,
              }}
            >
              <MenuItem value="">
                <em>— Выберите склад-донор —</em>
              </MenuItem>
              {warehouses
                .filter((w) => w.id !== targetWarehouseId)
                .map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name} ({w.code}) {w.responsibleUser?.displayName ? `— МОЛ: ${w.responsibleUser.displayName}` : ''}
                  </MenuItem>
                ))}
            </TextField>
          </Grid>

          {/* Обоснование запроса */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Обоснование / причина запроса (необязательно)"
              placeholder="Например: Срочная потребность для ТОиР токарного станка, пополнение неснижаемого остатка..."
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
            />
          </Grid>
        </Grid>

        {/* Подбор номенклатуры */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: '8px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5 }}>
            Подбор запрашиваемых позиций ТМЦ:
          </Typography>

          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid item xs={12} sm={8}>
              <Autocomplete
                size="small"
                options={nomenclatures}
                getOptionLabel={(o) => `${o.name} (${o.article || o.unit})`}
                value={selectedNomenclature}
                onChange={(_, val) => setSelectedNomenclature(val)}
                renderOption={(props, option) => {
                  const stock = stockMap[option.id] || 0;
                  return (
                    <li {...props} key={option.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.name}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {option.article ? `Арт: ${option.article} • ` : ''}{option.unit}
                          </Typography>
                        </Box>
                        {sourceWarehouseId && (
                          <Chip
                            size="small"
                            label={`На складе-доноре: ${stock} ${option.unit}`}
                            color={stock > 0 ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.725rem' }}
                          />
                        )}
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Поиск номенклатуры..."
                    placeholder="Название или артикул..."
                  />
                )}
              />
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                size="small"
                fullWidth
                type="number"
                label={`Кол-во (${selectedNomenclature?.unit || 'ед'})`}
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                inputProps={{ min: 0.01, step: 'any' }}
              />
            </Grid>

            <Grid item xs={6} sm={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddItem}
                disabled={!selectedNomenclature || parseFloat(itemQty) <= 0 || isNaN(parseFloat(itemQty))}
                sx={{ height: 40, borderRadius: '8px', fontWeight: 600 }}
              >
                Добавить
              </Button>
            </Grid>
          </Grid>

          {/* Таблица добавленных строк */}
          {lineItems.length > 0 && (
            <Paper variant="outlined" sx={{ mt: 2, borderRadius: '8px', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#ffffff' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>№</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Номенклатура</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>
                      Наличие у донора
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>
                      Запрашиваемое кол-во
                    </TableCell>
                    <TableCell align="center" sx={{ width: 50 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((item, idx) => {
                    const donorStock = stockMap[item.nomenclatureId] || 0;
                    return (
                      <TableRow key={item.nomenclatureId} hover>
                        <TableCell sx={{ py: 1, color: '#64748b' }}>{idx + 1}</TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                            {item.nomenclatureName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {item.nomenclatureArticle ? `Арт: ${item.nomenclatureArticle} • ` : ''}
                            {item.unit}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1 }}>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${donorStock} ${item.unit}`}
                            color={donorStock >= item.quantity ? 'success' : 'warning'}
                            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, fontWeight: 700, color: '#0284c7' }}>
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.5 }}>
                          <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Paper>
      </Stack>
    </FormDialog>
  );
}
