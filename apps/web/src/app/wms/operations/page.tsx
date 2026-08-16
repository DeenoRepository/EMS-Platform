'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stack,
  Autocomplete,
  Tooltip,
  Divider,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, OPERATION_TYPE_MAP, formatDateTime } from '@ems/shared';

interface StockOperation {
  id: string;
  type: string;
  date: string;
  counterparty?: string | null;
  document?: string | null;
  comment?: string | null;
  warehouse: { id: string; name: string; code: string };
  createdBy: { displayName: string; ldapLogin: string };
  items: Array<{
    id: string;
    quantity: number;
    nomenclature: { id: string; name: string; article?: string | null; unit: string };
    equipment?: { id: string; name: string; inventoryNumber: string } | null;
  }>;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface NomenclatureOption {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  totalStock?: number;
}

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber?: string | null;
}

interface FormRow {
  nomenclature: NomenclatureOption | null;
  quantity: number | string;
  equipment: EquipmentOption | null;
}

function WmsOperationsContent() {
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuth();

  const [operations, setOperations] = useState<StockOperation[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureOption[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('action') || '');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Create Operation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [opType, setOpType] = useState<'RECEIPT' | 'ISSUE' | 'TRANSFER'>(
    (searchParams.get('action') as any) || 'RECEIPT'
  );
  const [opWarehouseId, setOpWarehouseId] = useState('');
  const [opTargetWarehouseId, setOpTargetWarehouseId] = useState('');
  const [opCounterparty, setOpCounterparty] = useState('');
  const [opDocument, setOpDocument] = useState('');
  const [opComment, setOpComment] = useState('');
  const [formRows, setFormRows] = useState<FormRow[]>([
    { nomenclature: null, quantity: 1, equipment: null },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fast Create Nomenclature inside Operation Modal
  const [isQuickNomOpen, setIsQuickNomOpen] = useState(false);
  const [quickNomName, setQuickNomName] = useState('');
  const [quickNomArticle, setQuickNomArticle] = useState('');
  const [quickNomUnit, setQuickNomUnit] = useState('шт');

  // Load initial dictionaries
  useEffect(() => {
    async function loadDictionaries() {
      try {
        const [wRes, nRes, eRes] = await Promise.all([
          fetch('/api/wms/warehouses'),
          fetch('/api/wms/nomenclature?limit=100'),
          fetch('/api/eps/equipment?pageSize=100'),
        ]);

        if (wRes.ok) {
          const wJson = await wRes.json();
          if (wJson.success) {
            setWarehouses(wJson.data);
            if (wJson.data.length > 0 && !opWarehouseId) {
              setOpWarehouseId(wJson.data[0].id);
            }
          }
        }

        if (nRes.ok) {
          const nJson = await nRes.json();
          if (nJson.success) setNomenclatures(nJson.data);
        }

        if (eRes.ok) {
          const eJson = await eRes.json();
          if (eJson.success && eJson.data.items) {
            setEquipmentList(
              eJson.data.items.map((eq: any) => ({
                id: eq.id,
                name: eq.name,
                inventoryNumber: eq.inventoryNumber,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки справочников:', err);
      }
    }
    loadDictionaries();
  }, [opWarehouseId]);

  // Open modal if action query parameter passed
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'RECEIPT' || action === 'ISSUE' || action === 'TRANSFER') {
      setOpType(action);
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const fetchOperations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse);
      if (selectedType) params.set('type', selectedType);
      params.set('page', String(page + 1));
      params.set('pageSize', String(rowsPerPage));

      const res = await fetch(`/api/wms/operations?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOperations(json.data.items);
          setTotalCount(json.data.total);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки журнала операций:', err);
      enqueueSnackbar('Ошибка загрузки журнала операций', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouse, selectedType, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // Form rows helpers
  const handleAddRow = () => {
    setFormRows((prev) => [...prev, { nomenclature: null, quantity: 1, equipment: null }]);
  };

  const handleRemoveRow = (index: number) => {
    if (formRows.length > 1) {
      setFormRows((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleRowChange = (index: number, field: keyof FormRow, value: any) => {
    setFormRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Quick Create Nomenclature
  const handleQuickCreateNomenclature = async () => {
    if (!quickNomName.trim()) {
      enqueueSnackbar('Укажите наименование номенклатуры', { variant: 'warning' });
      return;
    }

    try {
      const res = await fetch('/api/wms/nomenclature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickNomName.trim(),
          article: quickNomArticle.trim() || undefined,
          unit: quickNomUnit.trim() || 'шт',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Номенклатура успешно создана', { variant: 'success' });
        const newNom = json.data;
        setNomenclatures((prev) => [newNom, ...prev]);
        // Автоматически подставляем в последнюю строку
        setFormRows((prev) => {
          const lastIdx = prev.length - 1;
          const updated = [...prev];
          updated[lastIdx] = { ...updated[lastIdx], nomenclature: newNom };
          return updated;
        });
        setIsQuickNomOpen(false);
        setQuickNomName('');
        setQuickNomArticle('');
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания номенклатуры', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при создании номенклатуры', { variant: 'error' });
    }
  };

  // Submit Operation
  const handleSubmitOperation = async () => {
    if (!opWarehouseId) {
      enqueueSnackbar('Выберите склад операции', { variant: 'warning' });
      return;
    }

    if (opType === 'TRANSFER' && !opTargetWarehouseId) {
      enqueueSnackbar('Выберите склад-получатель для перемещения', { variant: 'warning' });
      return;
    }

    if (opType === 'TRANSFER' && opWarehouseId === opTargetWarehouseId) {
      enqueueSnackbar('Склад-отправитель и получатель не могут совпадать', { variant: 'warning' });
      return;
    }

    const validItems = formRows.filter(
      (r) => r.nomenclature && Number(r.quantity) > 0
    );

    if (validItems.length === 0) {
      enqueueSnackbar('Добавьте хотя бы одну корректную позицию ТМЦ с количеством > 0', {
        variant: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        warehouseId: opWarehouseId,
        targetWarehouseId: opType === 'TRANSFER' ? opTargetWarehouseId : undefined,
        type: opType,
        counterparty: opCounterparty || undefined,
        document: opDocument || undefined,
        comment: opComment || undefined,
        items: validItems.map((r) => ({
          nomenclatureId: r.nomenclature!.id,
          quantity: Number(r.quantity),
          equipmentId: opType === 'ISSUE' ? r.equipment?.id || null : null,
        })),
      };

      const res = await fetch('/api/wms/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Складская операция успешно проведена', { variant: 'success' });
        setIsCreateModalOpen(false);
        setFormRows([{ nomenclature: null, quantity: 1, equipment: null }]);
        setOpCounterparty('');
        setOpDocument('');
        setOpComment('');
        fetchOperations();
      } else {
        enqueueSnackbar(json.error || 'Ошибка проведения операции', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при проведении операции', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Складские операции"
        subtitle="Журнал прихода, списания на оборудование EPS, перемещений и корректировок"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Операции' },
        ]}
        actions={
          hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Оформить операцию
            </Button>
          )
        }
      />

      {/* Фильтры */}
      <Card sx={{ mb: 3, p: 2.5, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Тип операции"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">Все типы операций</MenuItem>
              <MenuItem value="RECEIPT">Приход (Поступление)</MenuItem>
              <MenuItem value="ISSUE">Расход (Списание на оборудование)</MenuItem>
              <MenuItem value="TRANSFER">Перемещение между складами</MenuItem>
              <MenuItem value="ADJUSTMENT">Корректировка (Инвентаризация)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Склад"
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">Все склады</MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {/* Таблица операций */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Дата / Время</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Тип</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Склад</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Документ / Контрагент</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Позиции ТМЦ и количества</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Списание на оборудование</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Автор</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : operations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Складские операции не найдены
                  </TableCell>
                </TableRow>
              ) : (
                operations.map((op) => {
                  const typeInfo = OPERATION_TYPE_MAP[op.type] || { label: op.type, color: 'default' };
                  return (
                    <TableRow key={op.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {formatDateTime(op.date)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeInfo.label}
                          size="small"
                          color={typeInfo.color as any}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {op.warehouse.name}
                        </Typography>
                        <Chip label={op.warehouse.code} size="small" variant="outlined" sx={{ mt: 0.2 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {op.document || '—'}
                        </Typography>
                        {op.counterparty && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {op.counterparty}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          {op.items.map((item) => (
                            <Box key={item.id} sx={{ fontSize: '0.875rem' }}>
                              <Typography component="span" fontWeight={600}>
                                {item.nomenclature.name}
                              </Typography>{' '}
                              <Typography component="span" color="text.secondary">
                                ({item.nomenclature.article || 'б/а'})
                              </Typography>
                              : <b>{item.quantity}</b> {item.nomenclature.unit}
                            </Box>
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {op.items.some((i) => i.equipment) ? (
                          <Stack spacing={0.5}>
                            {op.items
                              .filter((i) => i.equipment)
                              .map((i) => (
                                <Chip
                                  key={i.id}
                                  label={`${i.equipment!.name} (${i.equipment!.inventoryNumber})`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              ))}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2">{op.createdBy.displayName}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Строк на странице:"
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Модальное окно оформления складской операции */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => !isSubmitting && setIsCreateModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Оформление складской операции</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Тип операции */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant={opType === 'RECEIPT' ? 'contained' : 'outlined'}
                  color="success"
                  startIcon={<MoveToInboxIcon />}
                  onClick={() => setOpType('RECEIPT')}
                  sx={{ py: 1.2, fontWeight: 700 }}
                >
                  Приход ТМЦ
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant={opType === 'ISSUE' ? 'contained' : 'outlined'}
                  color="warning"
                  startIcon={<OutboxIcon />}
                  onClick={() => setOpType('ISSUE')}
                  sx={{ py: 1.2, fontWeight: 700 }}
                >
                  Расход / Списание
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant={opType === 'TRANSFER' ? 'contained' : 'outlined'}
                  color="info"
                  startIcon={<SwapHorizIcon />}
                  onClick={() => setOpType('TRANSFER')}
                  sx={{ py: 1.2, fontWeight: 700 }}
                >
                  Перемещение
                </Button>
              </Grid>
            </Grid>

            {/* Склады */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={opType === 'TRANSFER' ? 6 : 12}>
                <TextField
                  select
                  fullWidth
                  required
                  label={opType === 'TRANSFER' ? 'Склад-отправитель' : 'Склад'}
                  value={opWarehouseId}
                  onChange={(e) => setOpWarehouseId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {opType === 'TRANSFER' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Склад-получатель"
                    value={opTargetWarehouseId}
                    onChange={(e) => setOpTargetWarehouseId(e.target.value)}
                  >
                    {warehouses
                      .filter((w) => w.id !== opWarehouseId)
                      .map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid>
              )}
            </Grid>

            {/* Контрагент и основание */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={opType === 'RECEIPT' ? 'Поставщик / Источник' : 'Получатель / Подразделение'}
                  placeholder={opType === 'RECEIPT' ? 'ООО "ПромСнаб"' : 'Цех №1, мастер Иванов'}
                  value={opCounterparty}
                  onChange={(e) => setOpCounterparty(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Документ-основание"
                  placeholder="Накладная №124 от 12.05.2024"
                  value={opDocument}
                  onChange={(e) => setOpDocument(e.target.value)}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* Строки ТМЦ */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Спецификация ТМЦ ({formRows.length})
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setIsQuickNomOpen(true)}
                  color="secondary"
                >
                  + Создать новую номенклатуру
                </Button>
              </Box>

              <Stack spacing={2}>
                {formRows.map((row, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={opType === 'ISSUE' ? 5 : 8}>
                        <Autocomplete
                          options={nomenclatures}
                          getOptionLabel={(option) =>
                            `${option.name} ${option.article ? `[${option.article}]` : ''} (${option.unit})`
                          }
                          value={row.nomenclature}
                          onChange={(_, val) => handleRowChange(idx, 'nomenclature', val)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              required
                              size="small"
                              label={`Позиция ${idx + 1}`}
                              placeholder="Поиск по названию или артикулу..."
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <TextField
                          fullWidth
                          required
                          size="small"
                          type="number"
                          label="Количество"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                          InputProps={{
                            endAdornment: (
                              <Typography variant="caption" color="text.secondary">
                                {row.nomenclature?.unit || 'шт'}
                              </Typography>
                            ),
                          }}
                        />
                      </Grid>

                      {opType === 'ISSUE' && (
                        <Grid item xs={12} md={3.5}>
                          <Autocomplete
                            options={equipmentList}
                            getOptionLabel={(option) =>
                              `${option.name} (${option.inventoryNumber || 'б/н'})`
                            }
                            value={row.equipment}
                            onChange={(_, val) => handleRowChange(idx, 'equipment', val)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                label="Оборудование EPS (опционально)"
                                placeholder="Списать на узел..."
                              />
                            )}
                          />
                        </Grid>
                      )}

                      <Grid item xs={6} md={opType === 'ISSUE' ? 0.5 : 1}>
                        <IconButton
                          color="error"
                          disabled={formRows.length === 1}
                          onClick={() => handleRemoveRow(idx)}
                          size="small"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={handleAddRow}
                sx={{ mt: 1.5 }}
                variant="outlined"
                size="small"
              >
                Добавить строку
              </Button>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Примечание к операции"
              placeholder="Дополнительные сведения, комментарий к накладной..."
              value={opComment}
              onChange={(e) => setOpComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button
            variant="contained"
            color={opType === 'RECEIPT' ? 'success' : opType === 'ISSUE' ? 'warning' : 'info'}
            onClick={handleSubmitOperation}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Проведение...' : 'Провести операцию'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Быстрое создание номенклатуры из модального окна */}
      <Dialog
        open={isQuickNomOpen}
        onClose={() => setIsQuickNomOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Быстрое создание ТМЦ</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              required
              label="Наименование номенклатуры"
              value={quickNomName}
              onChange={(e) => setQuickNomName(e.target.value)}
            />
            <TextField
              fullWidth
              label="Артикул / Код"
              value={quickNomArticle}
              onChange={(e) => setQuickNomArticle(e.target.value)}
            />
            <TextField
              fullWidth
              label="Единица измерения"
              value={quickNomUnit}
              onChange={(e) => setQuickNomUnit(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsQuickNomOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleQuickCreateNomenclature}>
            Создать и выбрать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function WmsOperationsPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress />
        </Box>
      }
    >
      <WmsOperationsContent />
    </Suspense>
  );
}
