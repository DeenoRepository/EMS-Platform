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
  Divider,
  Alert,
  Autocomplete,
} from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { useSnackbar } from 'notistack';
import { FormDialog, StatusBadge } from '@/components/ui';

export type OperationType = 'RECEIPT' | 'ISSUE_EMPLOYEE' | 'ISSUE_WRITE_OFF' | 'TRANSFER';

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string;
}

interface NomenclatureOption {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  category?: { name: string } | null;
}

interface OperationLineItem {
  nomenclatureId: string;
  nomenclatureName: string;
  nomenclatureArticle?: string;
  unit: string;
  quantity: number;
  equipmentId?: string;
  equipmentName?: string;
}

interface WmsOperationWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (operationId: string) => void;
  initialType?: OperationType;
  initialNomenclatureId?: string;
}

const OPERATION_TYPES = [
  {
    type: 'RECEIPT' as OperationType,
    title: 'Приход ТМЦ',
    description: 'Поступление материалов и запчастей на склад',
    icon: <MoveToInboxIcon />,
    color: '#16a34a',
    bgcolor: 'rgba(22, 163, 74, 0.08)',
  },
  {
    type: 'ISSUE_EMPLOYEE' as OperationType,
    title: 'Выдача сотруднику',
    description: 'Выдача расходников или инструмента в подотчет',
    icon: <PersonIcon />,
    color: '#1d4ed8',
    bgcolor: 'rgba(29, 78, 216, 0.08)',
  },
  {
    type: 'ISSUE_WRITE_OFF' as OperationType,
    title: 'Списание на станок',
    description: 'Установка детали на оборудование или утилизация',
    icon: <DeleteSweepIcon />,
    color: '#d97706',
    bgcolor: 'rgba(217, 119, 6, 0.08)',
  },
  {
    type: 'TRANSFER' as OperationType,
    title: 'Перемещение',
    description: 'Перемещение ТМЦ между складами предприятия',
    icon: <SwapHorizIcon />,
    color: '#7c3aed',
    bgcolor: 'rgba(124, 58, 237, 0.08)',
  },
];

export default function WmsOperationWizardDialog({
  open,
  onClose,
  onSuccess,
  initialType = 'RECEIPT',
  initialNomenclatureId,
}: WmsOperationWizardDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  // Stepper state (0: Параметры, 1: Подбор позиций, 2: Проведение)
  const [activeStep, setActiveStep] = useState(0);

  // Form Fields
  const [operationType, setOperationType] = useState<OperationType>(initialType);
  const [warehouseId, setWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [comment, setComment] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<OperationLineItem[]>([]);

  // Dictionaries
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item Selector in Step 2
  const [selectedNomenclature, setSelectedNomenclature] = useState<NomenclatureOption | null>(null);
  const [itemQty, setItemQty] = useState('1');
  const [itemEquipmentId, setItemEquipmentId] = useState('');

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setOperationType(initialType);
      // Load dictionaries
      Promise.all([
        fetch('/api/wms/warehouses').then((r) => r.json()),
        fetch('/api/equipment?limit=200').then((r) => r.json()),
        fetch('/api/wms/nomenclature?limit=500').then((r) => r.json()),
      ])
        .then(([whData, eqData, nomData]) => {
          if (whData.success) {
            setWarehouses(whData.data);
            if (whData.data.length > 0 && !warehouseId) {
              setWarehouseId(whData.data[0].id);
            }
          }
          if (eqData.success) {
            setEquipmentList(eqData.data.items || eqData.data || []);
          }
          if (nomData.success) {
            setNomenclatures(nomData.data.items || nomData.data || []);
          }
        })
        .catch(console.error);
    }
  }, [open, initialType]);

  const handleAddItem = () => {
    if (!selectedNomenclature) {
      enqueueSnackbar('Выберите номенклатурную позицию', { variant: 'warning' });
      return;
    }
    const qty = parseFloat(itemQty);
    if (isNaN(qty) || qty <= 0) {
      enqueueSnackbar('Укажите корректное количество (> 0)', { variant: 'warning' });
      return;
    }

    const eqObj = equipmentList.find((e) => e.id === itemEquipmentId);

    setLineItems((prev) => [
      ...prev,
      {
        nomenclatureId: selectedNomenclature.id,
        nomenclatureName: selectedNomenclature.name,
        nomenclatureArticle: selectedNomenclature.article || undefined,
        unit: selectedNomenclature.unit,
        quantity: qty,
        equipmentId: itemEquipmentId || undefined,
        equipmentName: eqObj?.name,
      },
    ]);

    setSelectedNomenclature(null);
    setItemQty('1');
    setItemEquipmentId('');
  };

  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = () => {
    if (activeStep === 0) {
      if (!warehouseId) {
        enqueueSnackbar('Выберите основной склад', { variant: 'warning' });
        return;
      }
      if (operationType === 'TRANSFER' && (!targetWarehouseId || targetWarehouseId === warehouseId)) {
        enqueueSnackbar('Выберите склад-получатель, отличный от исходного склада', { variant: 'warning' });
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (lineItems.length === 0) {
        enqueueSnackbar('Добавьте хотя бы одну позицию ТМЦ', { variant: 'warning' });
        return;
      }
      setActiveStep(2);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wms/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: operationType,
          warehouseId,
          targetWarehouseId: operationType === 'TRANSFER' ? targetWarehouseId : undefined,
          equipmentId: operationType === 'ISSUE_WRITE_OFF' && equipmentId ? equipmentId : undefined,
          recipientName: operationType === 'ISSUE_EMPLOYEE' ? recipientName.trim() : undefined,
          comment: comment.trim() || undefined,
          items: lineItems.map((item) => ({
            nomenclatureId: item.nomenclatureId,
            quantity: item.quantity,
            equipmentId: item.equipmentId || undefined,
          })),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Складская операция успешно проведена', { variant: 'success' });
        onSuccess(json.data.id);
        onClose();
      } else {
        enqueueSnackbar(json.error || 'Ошибка проведения операции', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при проведении операции', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentOpMeta = OPERATION_TYPES.find((o) => o.type === operationType) || OPERATION_TYPES[0];

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Мастер оформления складской операции"
      subtitle="Пошаговое проведение прихода, перемещения или списания ТМЦ"
      icon={currentOpMeta.icon}
      maxWidth="md"
      steps={['1. Параметры операции', '2. Подбор позиций ТМЦ', '3. Проведение и акт']}
      activeStep={activeStep}
      onStepChange={(step) => setActiveStep(step)}
      hideActions
    >
      <Box sx={{ mt: 1.5 }}>
        {/* STEP 0: Выбор типа и складов */}
        {activeStep === 0 && (
          <Stack spacing={3}>
            {/* Operation Type Grid */}
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1.5 }}>
                Выберите тип складской операции:
              </Typography>
              <Grid container spacing={1.5}>
                {OPERATION_TYPES.map((op) => {
                  const isSelected = operationType === op.type;
                  return (
                    <Grid item xs={12} sm={6} key={op.type}>
                      <Paper
                        elevation={0}
                        onClick={() => setOperationType(op.type)}
                        sx={{
                          p: 2,
                          borderRadius: '10px',
                          border: '2px solid',
                          borderColor: isSelected ? op.color : '#e2e8f0',
                          bgcolor: isSelected ? op.bgcolor : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          transition: 'all 0.18s ease',
                          '&:hover': {
                            borderColor: op.color,
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '8px',
                            bgcolor: isSelected ? op.color : '#f1f5f9',
                            color: isSelected ? '#ffffff' : op.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {op.icon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {op.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6875rem' }} noWrap>
                            {op.description}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            {/* Warehouse Selectors */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={operationType === 'TRANSFER' ? 6 : 12}>
                <TextField
                  select
                  fullWidth
                  required
                  label={operationType === 'TRANSFER' ? 'Исходный склад (Списание)' : 'Склад проведения'}
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {operationType === 'TRANSFER' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Целевой склад (Поступление)"
                    value={targetWarehouseId}
                    onChange={(e) => setTargetWarehouseId(e.target.value)}
                  >
                    {warehouses
                      .filter((w) => w.id !== warehouseId)
                      .map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid>
              )}
            </Grid>

            {/* Additional Fields per Type */}
            {operationType === 'ISSUE_WRITE_OFF' && (
              <TextField
                select
                fullWidth
                label="Целевой станок / Оборудование (опционально)"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                helperText="Для автоматической привязки списанных ТМЦ к паспорту станка"
              >
                <MenuItem value="">
                  <em>— Без привязки к конкретному станку —</em>
                </MenuItem>
                {equipmentList.map((eq) => (
                  <MenuItem key={eq.id} value={eq.id}>
                    {eq.name} (Инв. №: {eq.inventoryNumber})
                  </MenuItem>
                ))}
              </TextField>
            )}

            {operationType === 'ISSUE_EMPLOYEE' && (
              <TextField
                fullWidth
                required
                label="ФИО Получателя / Сотрудника"
                placeholder="Иванов И.И. (Цех №2)"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            )}

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Основание / Примечание к операции"
              placeholder="Номер накладной, заявка ТОиР, приказ..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button
                variant="contained"
                onClick={handleNextStep}
                sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}
              >
                Далее: Подбор номенклатуры →
              </Button>
            </Box>
          </Stack>
        )}

        {/* STEP 1: Подбор позиций ТМЦ */}
        {activeStep === 1 && (
          <Stack spacing={2.5}>
            {/* Quick Item Add Card */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5 }}>
                Добавить позицию ТМЦ:
              </Typography>

              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    size="small"
                    options={nomenclatures}
                    getOptionLabel={(option) => `${option.name} (${option.article || option.unit})`}
                    value={selectedNomenclature}
                    onChange={(_, val) => setSelectedNomenclature(val)}
                    renderInput={(params) => <TextField {...params} label="Поиск номенклатуры..." placeholder="Название или артикул..." />}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    label={`Кол-во (${selectedNomenclature?.unit || 'ед'})`}
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    inputProps={{ min: 0.01, step: 1 }}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                    sx={{ height: 40, borderRadius: '8px', fontWeight: 600 }}
                  >
                    Добавить
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* List of Added Line Items */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                Позиции в операции ({lineItems.length}):
              </Typography>

              {lineItems.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: '8px' }}>
                  В операцию еще не добавлено ни одной позиции. Воспользуйтесь поиском выше.
                </Alert>
              ) : (
                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Номенклатура</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Артикул</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Количество</TableCell>
                        <TableCell align="center" sx={{ width: 50 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>
                            {item.nomenclatureName}
                          </TableCell>
                          <TableCell sx={{ py: 1, color: '#64748b', fontSize: '0.75rem' }}>
                            {item.nomenclatureArticle || '—'}
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.5 }}>
                            <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setActiveStep(0)} sx={{ fontWeight: 600 }}>
                ← Назад
              </Button>
              <Button
                variant="contained"
                onClick={handleNextStep}
                disabled={lineItems.length === 0}
                sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}
              >
                Далее: Проведение операции →
              </Button>
            </Box>
          </Stack>
        )}

        {/* STEP 2: Сводка и Проведение */}
        {activeStep === 2 && (
          <Stack spacing={2.5}>
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Все параметры операции заполнены. Проверьте сводные данные перед проведением в базе данных.
            </Alert>

            {/* Summary Paper */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Тип операции:
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusBadge status={operationType} />
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Склад:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                    {warehouses.find((w) => w.id === warehouseId)?.name || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Позиций ТМЦ:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                    {lineItems.length} наим.
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Общее кол-во:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                    {lineItems.reduce((sum, i) => sum + i.quantity, 0)} ед.
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setActiveStep(1)} sx={{ fontWeight: 600 }}>
                ← Назад к подбору
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleSubmit}
                disabled={isSubmitting}
                sx={{ borderRadius: '8px', px: 4, fontWeight: 700 }}
              >
                {isSubmitting ? 'Проведение...' : 'Провести операцию'}
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </FormDialog>
  );
}
