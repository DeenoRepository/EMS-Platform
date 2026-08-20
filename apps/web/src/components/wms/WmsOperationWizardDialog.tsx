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
  Collapse,
  InputAdornment,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import BusinessIcon from '@mui/icons-material/Business';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { FormDialog, StatusBadge } from '@/components/ui';

export type OperationType = 'RECEIPT' | 'ISSUE_EMPLOYEE' | 'ISSUE_WRITE_OFF' | 'TRANSFER';

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  responsibleUserId?: string | null;
  responsibleUser?: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
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
  isNewAction?: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
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

const NOMENCLATURE_TYPES = [
  { id: 'SPARE_PART', label: 'Запчасть', icon: <PrecisionManufacturingIcon sx={{ fontSize: 16 }} />, prefix: 'SP' },
  { id: 'CONSUMABLE', label: 'Расходник', icon: <Inventory2OutlinedIcon sx={{ fontSize: 16 }} />, prefix: 'CS' },
  { id: 'TOOL', label: 'Инструмент', icon: <BuildOutlinedIcon sx={{ fontSize: 16 }} />, prefix: 'TL' },
  { id: 'LUBRICANT', label: 'Масла/ГСМ', icon: <ScienceOutlinedIcon sx={{ fontSize: 16 }} />, prefix: 'LB' },
  { id: 'PPE', label: 'СИЗ', icon: <SecurityOutlinedIcon sx={{ fontSize: 16 }} />, prefix: 'PPE' },
];

const OPERATION_TYPES = [
  {
    type: 'RECEIPT' as OperationType,
    title: 'Приход ТМЦ',
    description: 'Поступление материалов и запчастей на закрепленный склад',
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
    title: 'Межскладское перемещение',
    description: 'Трансфер с закрепленного склада на другой склад',
    icon: <SwapHorizIcon />,
    color: '#7c3aed',
    bgcolor: 'rgba(124, 58, 237, 0.08)',
  },
];

export function WmsOperationWizardDialog({
  open,
  onClose,
  onSuccess,
  initialType = 'RECEIPT',
  initialNomenclatureId,
}: WmsOperationWizardDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [operationType, setOperationType] = useState<OperationType>(initialType);

  // Step 1 Form: Details & Warehouses
  const [warehouseId, setWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [comment, setComment] = useState('');

  // Step 2 Form: Items
  const [lineItems, setLineItems] = useState<OperationLineItem[]>([]);
  const [selectedNomenclature, setSelectedNomenclature] = useState<NomenclatureOption | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemEquipmentId, setItemEquipmentId] = useState('');

  // Expanded In-Place Menu for Creating New Nomenclature
  const [isCreatingNewNom, setIsCreatingNewNom] = useState(false);
  const [isSubmittingNewNom, setIsSubmittingNewNom] = useState(false);
  const [newNomType, setNewNomType] = useState('SPARE_PART');
  const [newNomName, setNewNomName] = useState('');
  const [newNomArticle, setNewNomArticle] = useState('');
  const [newNomUnit, setNewNomUnit] = useState('шт');
  const [newNomCategoryId, setNewNomCategoryId] = useState('');
  const [newNomMinStock, setNewNomMinStock] = useState('');
  const [newNomDescription, setNewNomDescription] = useState('');
  const [newNomQty, setNewNomQty] = useState('1');

  // Metadata dictionaries & stock balance cache
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, { quantity: number; cell?: string }>>({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically determine the warehouse assigned to current user (1 employee = 1 warehouse)
  const assignedWarehouse = useMemo(() => {
    if (!warehouses.length) return null;
    // 1. Direct match by responsibleUserId
    const userWh = warehouses.find((w) => w.responsibleUserId === user?.userId);
    if (userWh) return userWh;
    // 2. Default fallback if admin or not set
    return warehouses[0];
  }, [warehouses, user?.userId]);

  const isOutflow = operationType === 'ISSUE_EMPLOYEE' || operationType === 'ISSUE_WRITE_OFF' || operationType === 'TRANSFER';

  const fetchStock = React.useCallback(async (whId: string) => {
    if (!whId) {
      setStockMap({});
      return;
    }
    setIsLoadingStock(true);
    try {
      const res = await fetch(`/api/wms/stock?warehouseId=${whId}&pageSize=1000`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const map: Record<string, { quantity: number; cell?: string }> = {};
          (json.data.items || []).forEach((s: any) => {
            map[s.nomenclatureId] = {
              quantity: Number(s.quantity),
              cell: s.cell?.code || s.cell?.name,
            };
          });
          setStockMap(map);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки остатков склада:', err);
    } finally {
      setIsLoadingStock(false);
    }
  }, []);

  const getWarehouseStock = React.useCallback((nomId: string) => {
    return stockMap[nomId]?.quantity || 0;
  }, [stockMap]);

  const getAvailableStock = React.useCallback((nomId: string) => {
    const rawStock = getWarehouseStock(nomId);
    const alreadyAdded = lineItems
      .filter((it) => it.nomenclatureId === nomId)
      .reduce((sum, it) => sum + it.quantity, 0);
    return Math.max(0, rawStock - alreadyAdded);
  }, [getWarehouseStock, lineItems]);

  useEffect(() => {
    if (warehouseId) {
      fetchStock(warehouseId);
    } else {
      setStockMap({});
    }
  }, [warehouseId, fetchStock]);

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setOperationType(initialType);
      setLineItems([]);
      setSelectedNomenclature(null);
      setSearchInputValue('');
      setItemQty('1');
      setItemEquipmentId('');
      setRecipientName('');
      setEquipmentId('');
      setTargetWarehouseId('');
      setComment('');
      setIsCreatingNewNom(false);

      // Load dictionaries
      Promise.all([
        fetch('/api/wms/warehouses').then((r) => r.json()),
        fetch('/api/eps/equipment?limit=200').then((r) => r.json()),
        fetch('/api/wms/nomenclature?limit=500').then((r) => r.json()),
        fetch('/api/wms/categories').then((r) => r.json()).catch(() => ({ success: false })),
      ])
        .then(([whData, eqData, nomData, catData]) => {
          if (whData.success && whData.data) {
            setWarehouses(whData.data);
            const userWh = whData.data.find((w: WarehouseOption) => w.responsibleUserId === user?.userId) || whData.data[0];
            if (userWh) {
              setWarehouseId(userWh.id);
            }
          }
          if (eqData.success) {
            setEquipmentList(eqData.data.items || eqData.data || []);
          }
          if (nomData.success) {
            const nomList = nomData.data.items || nomData.data || [];
            setNomenclatures(nomList);

            if (initialNomenclatureId) {
              const matched = nomList.find((n: NomenclatureOption) => n.id === initialNomenclatureId);
              if (matched) {
                setSelectedNomenclature(matched);
              }
            }
          }
          if (catData.success && catData.data) {
            setCategories(catData.data);
          }
        })
        .catch(console.error);
    }
  }, [open, initialType, initialNomenclatureId, user?.userId]);

  // Ensure warehouseId stays synchronized with assignedWarehouse
  useEffect(() => {
    if (assignedWarehouse && (!warehouseId || warehouseId !== assignedWarehouse.id)) {
      setWarehouseId(assignedWarehouse.id);
    }
  }, [assignedWarehouse, warehouseId]);

  const handleGenerateSku = () => {
    const typeObj = NOMENCLATURE_TYPES.find((t) => t.id === newNomType) || NOMENCLATURE_TYPES[0];
    const rand = Math.floor(1000 + Math.random() * 9000);
    setNewNomArticle(`${typeObj.prefix}-${rand}`);
  };

  const handleOpenNewNomExpandedMenu = (suggestedName?: string) => {
    const nameToSet = (suggestedName || searchInputValue || '').trim();
    setNewNomName(nameToSet);
    setNewNomType('SPARE_PART');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setNewNomArticle(`SP-${rand}`);
    setNewNomUnit('шт');
    setNewNomCategoryId(categories.length > 0 ? categories[0].id : '');
    setNewNomMinStock('');
    setNewNomDescription('');
    setNewNomQty(itemQty || '1');
    setIsCreatingNewNom(true);
  };

  const handleSaveAndAddNewNom = async () => {
    if (!newNomName.trim()) {
      enqueueSnackbar('Укажите наименование новой номенклатуры', { variant: 'warning' });
      return;
    }
    const qty = parseFloat(newNomQty);
    if (isNaN(qty) || qty <= 0) {
      enqueueSnackbar('Укажите корректное количество (> 0)', { variant: 'warning' });
      return;
    }

    setIsSubmittingNewNom(true);
    try {
      const res = await fetch('/api/wms/nomenclature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newNomName.trim(),
          article: newNomArticle.trim() || undefined,
          unit: newNomUnit.trim() || 'шт',
          categoryId: newNomCategoryId || undefined,
          description: newNomDescription.trim() || undefined,
          minStock: newNomMinStock ? parseFloat(newNomMinStock) : undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const createdNom: NomenclatureOption = {
          id: json.data.id,
          name: json.data.name,
          article: json.data.article,
          unit: json.data.unit,
          category: json.data.category,
        };

        setNomenclatures((prev) => [createdNom, ...prev]);

        setLineItems((prev) => [
          ...prev,
          {
            nomenclatureId: createdNom.id,
            nomenclatureName: createdNom.name,
            nomenclatureArticle: createdNom.article || undefined,
            unit: createdNom.unit,
            quantity: qty,
          },
        ]);

        enqueueSnackbar(`Позиция «${createdNom.name}» зарегистрирована и добавлена в приход`, { variant: 'success' });
        setIsCreatingNewNom(false);
        setSearchInputValue('');
        setSelectedNomenclature(null);
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания номенклатуры', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при регистрации номенклатуры', { variant: 'error' });
    } finally {
      setIsSubmittingNewNom(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedNomenclature) {
      enqueueSnackbar('Выберите номенклатурную позицию или создайте новую', { variant: 'warning' });
      return;
    }
    const qty = parseFloat(itemQty);
    if (isNaN(qty) || qty <= 0) {
      enqueueSnackbar('Укажите корректное количество (> 0)', { variant: 'warning' });
      return;
    }

    if (isOutflow) {
      const available = getAvailableStock(selectedNomenclature.id);
      if (available <= 0) {
        enqueueSnackbar(`Позиция «${selectedNomenclature.name}» отсутствует на складе (остаток 0)`, { variant: 'error' });
        return;
      }
      if (qty > available) {
        enqueueSnackbar(`Недостаточно остатка для «${selectedNomenclature.name}». Доступно: ${available} ${selectedNomenclature.unit}, запрошено: ${qty}`, { variant: 'error' });
        return;
      }
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
    setSearchInputValue('');
    setItemQty('1');
    setItemEquipmentId('');
  };

  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = () => {
    if (activeStep === 0) {
      if (!warehouseId) {
        enqueueSnackbar('Не определен закрепленный склад сотрудника', { variant: 'warning' });
        return;
      }
      if (operationType === 'TRANSFER' && (!targetWarehouseId || targetWarehouseId === warehouseId)) {
        enqueueSnackbar('Выберите склад-получатель, отличный от закрепленного склада', { variant: 'warning' });
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (lineItems.length === 0) {
        enqueueSnackbar('Добавьте хотя бы одну позицию ТМЦ', { variant: 'warning' });
        return;
      }
      if (isOutflow) {
        for (const item of lineItems) {
          const rawStock = getWarehouseStock(item.nomenclatureId);
          const totalRequested = lineItems
            .filter((it) => it.nomenclatureId === item.nomenclatureId)
            .reduce((sum, it) => sum + it.quantity, 0);
          if (totalRequested > rawStock) {
            enqueueSnackbar(`Превышен остаток для «${item.nomenclatureName}». На складе: ${rawStock} ${item.unit}, в операции: ${totalRequested} ${item.unit}`, { variant: 'error' });
            return;
          }
        }
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
        {/* STEP 0: Выбор типа и закрепленный склад */}
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
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          '&:hover': {
                            borderColor: op.color,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '8px',
                            bgcolor: isSelected ? '#ffffff' : op.bgcolor,
                            color: op.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {op.icon}
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0f172a' }}>
                            {op.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                            {op.description}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            <Divider />

            {/* Автоматически закрепленный склад сотрудника (Без выбора из списка) */}
            <Box>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase' }}>
                {operationType === 'TRANSFER' ? 'Исходный склад списания (Закреплен за вами):' : 'Склад проведения операции (МОЛ):'}
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  bgcolor: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '8px',
                      bgcolor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BusinessIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ lineHeight: 1.2 }}>
                      {assignedWarehouse ? `${assignedWarehouse.name} (${assignedWarehouse.code})` : 'Определение закрепленного склада...'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      Материально ответственное лицо:{' '}
                      <b>{user?.displayName || assignedWarehouse?.responsibleUser?.displayName || 'Текущий сотрудник'}</b>
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  icon={<LockOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                  label="Закреплен за МОЛ"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: '0.75rem', px: 0.5 }}
                />
              </Paper>
            </Box>

            {/* Выбор склада-получателя только для операции Перемещения */}
            {operationType === 'TRANSFER' && (
              <TextField
                select
                fullWidth
                required
                label="Склад-получатель (Зачисление перемещаемых ТМЦ)"
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                error={Boolean(targetWarehouseId && targetWarehouseId === warehouseId)}
                helperText={targetWarehouseId === warehouseId ? 'Склад-получатель должен отличаться от закрепленного исходного склада' : 'Выберите целевой склад, куда поступают ТМЦ'}
              >
                {warehouses
                  .filter((w) => w.id !== warehouseId)
                  .map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code}) {w.responsibleUser?.displayName ? `— МОЛ: ${w.responsibleUser.displayName}` : ''}
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

        {/* STEP 1: Подбор позиций ТМЦ + Расширенное меню создания новой номенклатуры */}
        {activeStep === 1 && (
          <Stack spacing={2.5}>
            {/* Top Operation Context & Warehouse Info Banner */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: '10px',
                bgcolor: currentOpMeta.bgcolor,
                borderColor: currentOpMeta.color,
                borderWidth: '1.5px',
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        bgcolor: '#ffffff',
                        color: currentOpMeta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                    >
                      {currentOpMeta.icon}
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
                        Проводимая операция:
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9375rem' }}>
                        {currentOpMeta.title}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                      {operationType === 'TRANSFER' ? 'Склад списания (МОЛ):' : 'Склад операции (МОЛ):'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {assignedWarehouse ? `${assignedWarehouse.name} (${assignedWarehouse.code})` : '—'}
                    </Typography>
                    {operationType === 'TRANSFER' && targetWarehouseId && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#7c3aed', fontWeight: 700, mt: 0.25 }}>
                        → Склад назначения: {warehouses.find((w) => w.id === targetWarehouseId)?.name}
                      </Typography>
                    )}
                    {operationType === 'ISSUE_EMPLOYEE' && recipientName && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#1d4ed8', fontWeight: 700, mt: 0.25 }}>
                        Получатель: {recipientName}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Quick Item Add / Search Card */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Поиск и добавление позиций ТМЦ:
                </Typography>
                {!isCreatingNewNom && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenNewNomExpandedMenu('')}
                    sx={{ fontWeight: 600, textTransform: 'none', color: '#0284c7' }}
                  >
                    + Новая номенклатура
                  </Button>
                )}
              </Box>

              <Grid container spacing={1.5} alignItems="center">
                {operationType === 'ISSUE_WRITE_OFF' && (
                  <Grid item xs={12}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Целевое оборудование / станок для списания детали (необязательно)"
                      value={itemEquipmentId}
                      onChange={(e) => setItemEquipmentId(e.target.value)}
                      helperText="Укажите конкретный станок при монтаже детали или оставьте пустым для общего списания / утилизации"
                      sx={{ bgcolor: '#ffffff', mb: 0.5 }}
                    >
                      <MenuItem value="">— Общее списание / Не привязано к станку —</MenuItem>
                      {equipmentList.map((eq) => (
                        <MenuItem key={eq.id} value={eq.id}>
                          {eq.name} ({eq.inventoryNumber})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    size="small"
                    options={nomenclatures}
                    getOptionLabel={(option) => `${option.name} (${option.article || option.unit})`}
                    value={selectedNomenclature}
                    inputValue={searchInputValue}
                    onInputChange={(_, newInputValue) => setSearchInputValue(newInputValue)}
                    onChange={(_, val) => {
                      if (val && val.isNewAction) {
                        handleOpenNewNomExpandedMenu(searchInputValue);
                      } else {
                        setSelectedNomenclature(val);
                        if (val && isOutflow) {
                          const av = getAvailableStock(val.id);
                          if (av > 0) {
                            setItemQty('1');
                          }
                        }
                      }
                    }}
                    renderOption={(props, option) => {
                      if (option.isNewAction) {
                        return (
                          <li {...props} key={option.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, color: '#0284c7', fontWeight: 600 }}>
                              <AddIcon fontSize="small" />
                              <Typography variant="body2">{option.name}</Typography>
                            </Box>
                          </li>
                        );
                      }
                      const stock = getWarehouseStock(option.id);
                      const isAvailable = stock > 0;
                      return (
                        <li {...props} key={option.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', py: 0.5 }}>
                            <Box sx={{ mr: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                {option.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {option.article ? `Арт: ${option.article}` : 'Без артикула'} • {option.category?.name || 'Без категории'}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={
                                isOutflow
                                  ? isAvailable
                                    ? `В наличии: ${stock} ${option.unit}`
                                    : `Нет на складе (0 ${option.unit})`
                                  : `Остаток: ${stock} ${option.unit}`
                              }
                              color={isOutflow ? (isAvailable ? 'success' : 'error') : 'default'}
                              variant={isOutflow && !isAvailable ? 'filled' : 'outlined'}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: 22,
                                flexShrink: 0,
                              }}
                            />
                          </Box>
                        </li>
                      );
                    }}
                    filterOptions={(options, params) => {
                      const filterVal = params.inputValue.toLowerCase().trim();
                      const filtered = options.filter(
                        (o) =>
                          o.name.toLowerCase().includes(filterVal) ||
                          (o.article && o.article.toLowerCase().includes(filterVal))
                      );

                      if (
                        filterVal !== '' &&
                        !options.some((o) => o.name.toLowerCase() === filterVal || (o.article && o.article.toLowerCase() === filterVal))
                      ) {
                        filtered.push({
                          id: '__NEW__',
                          name: `+ Создать новую позицию «${params.inputValue}»`,
                          unit: 'шт',
                          isNewAction: true,
                        });
                      }

                      return filtered;
                    }}
                    noOptionsText={
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Позиция не найдена в справочнике
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => handleOpenNewNomExpandedMenu(searchInputValue)}
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        >
                          Создать «{searchInputValue}»
                        </Button>
                      </Box>
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Поиск номенклатуры..."
                        placeholder="Название или артикул..."
                      />
                    )}
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
                    error={Boolean(selectedNomenclature && isOutflow && (parseFloat(itemQty) > getAvailableStock(selectedNomenclature.id) || getAvailableStock(selectedNomenclature.id) <= 0))}
                    helperText={
                      selectedNomenclature && isOutflow
                        ? getAvailableStock(selectedNomenclature.id) <= 0
                          ? `Нет в наличии (0 ${selectedNomenclature.unit})`
                          : parseFloat(itemQty) > getAvailableStock(selectedNomenclature.id)
                          ? `Превышает доступно (${getAvailableStock(selectedNomenclature.id)} ${selectedNomenclature.unit})`
                          : `Доступно: ${getAvailableStock(selectedNomenclature.id)} ${selectedNomenclature.unit}`
                        : undefined
                    }
                    inputProps={{ min: 0.01, step: 1 }}
                    InputProps={{
                      endAdornment: isOutflow && selectedNomenclature && getAvailableStock(selectedNomenclature.id) > 0 ? (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setItemQty(String(getAvailableStock(selectedNomenclature.id)))}
                            sx={{ minWidth: 'auto', p: '2px 6px', fontSize: '0.7rem', fontWeight: 700, color: '#0284c7' }}
                          >
                            Макс.
                          </Button>
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                    disabled={
                      !selectedNomenclature ||
                      (isOutflow && (getAvailableStock(selectedNomenclature.id) <= 0 || parseFloat(itemQty) > getAvailableStock(selectedNomenclature.id) || isNaN(parseFloat(itemQty)) || parseFloat(itemQty) <= 0))
                    }
                    sx={{ height: 40, borderRadius: '8px', fontWeight: 600 }}
                  >
                    Добавить
                  </Button>
                </Grid>
              </Grid>

              {/* Banner when user typed a name that does not exist */}
              {!isCreatingNewNom && searchInputValue.trim() !== '' && !nomenclatures.some((n) => n.name.toLowerCase().includes(searchInputValue.toLowerCase()) || (n.article && n.article.toLowerCase().includes(searchInputValue.toLowerCase()))) && (
                <Alert
                  severity="info"
                  action={
                    <Button
                      color="primary"
                      size="small"
                      variant="contained"
                      onClick={() => handleOpenNewNomExpandedMenu(searchInputValue)}
                      sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'none' }}
                    >
                      Создать и заполнить данные
                    </Button>
                  }
                  sx={{ mt: 2, borderRadius: '8px', alignItems: 'center' }}
                >
                  Позиции <b>«{searchInputValue}»</b> нет в справочнике ТМЦ. Создать её автоматически при приходе?
                </Alert>
              )}

              {/* ─── РАСШИРЕННОЕ МЕНЮ: Создание новой номенклатуры при приходе ─── */}
              <Collapse in={isCreatingNewNom}>
                <Paper
                  elevation={0}
                  sx={{
                    mt: 2,
                    p: 2.5,
                    borderRadius: '10px',
                    border: '2px dashed #38bdf8',
                    bgcolor: '#f0f9ff',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AutoAwesomeIcon sx={{ color: '#0284c7' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1' }}>
                        Карточка регистрации новой номенклатуры
                      </Typography>
                      <Chip label="Новая позиция" size="small" color="primary" sx={{ height: 22, fontWeight: 700 }} />
                    </Box>
                    <IconButton size="small" onClick={() => setIsCreatingNewNom(false)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    {/* Вид номенклатуры */}
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', display: 'block', mb: 0.75 }}>
                        Тип ТМЦ:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {NOMENCLATURE_TYPES.map((t) => (
                          <Chip
                            key={t.id}
                            icon={t.icon}
                            label={t.label}
                            clickable
                            onClick={() => {
                              setNewNomType(t.id);
                              const rand = Math.floor(1000 + Math.random() * 9000);
                              setNewNomArticle(`${t.prefix}-${rand}`);
                            }}
                            variant={newNomType === t.id ? 'filled' : 'outlined'}
                            color={newNomType === t.id ? 'primary' : 'default'}
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          />
                        ))}
                      </Stack>
                    </Grid>

                    {/* Наименование */}
                    <Grid item xs={12} sm={8}>
                      <TextField
                        size="small"
                        fullWidth
                        required
                        label="Наименование ТМЦ *"
                        placeholder="например: Подшипник радиальный 6204-2RS"
                        value={newNomName}
                        onChange={(e) => setNewNomName(e.target.value)}
                        sx={{ bgcolor: '#ffffff' }}
                      />
                    </Grid>

                    {/* Артикул с автогенерацией */}
                    <Grid item xs={12} sm={4}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Артикул / Код"
                        value={newNomArticle}
                        onChange={(e) => setNewNomArticle(e.target.value)}
                        sx={{ bgcolor: '#ffffff' }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Сгенерировать код">
                                <IconButton size="small" onClick={handleGenerateSku} edge="end">
                                  <AutoAwesomeIcon fontSize="small" color="primary" />
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Категория */}
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        label="Категория ТМЦ"
                        value={newNomCategoryId}
                        onChange={(e) => setNewNomCategoryId(e.target.value)}
                        sx={{ bgcolor: '#ffffff' }}
                      >
                        <MenuItem value="">— Без категории —</MenuItem>
                        {categories.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    {/* Ед. изм. */}
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        label="Единица измерения"
                        value={newNomUnit}
                        onChange={(e) => setNewNomUnit(e.target.value)}
                        sx={{ bgcolor: '#ffffff' }}
                      >
                        {['шт', 'компл', 'кг', 'л', 'м', 'пог. м', 'уп', 'м²'].map((u) => (
                          <MenuItem key={u} value={u}>
                            {u}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    {/* Мин. остаток */}
                    <Grid item xs={12} sm={4}>
                      <TextField
                        size="small"
                        fullWidth
                        type="number"
                        label="Мин. остаток (для дефицита)"
                        placeholder="например: 5"
                        value={newNomMinStock}
                        onChange={(e) => setNewNomMinStock(e.target.value)}
                        sx={{ bgcolor: '#ffffff' }}
                      />
                    </Grid>

                    {/* Количество в текущий приход */}
                    <Grid item xs={12} sm={4}>
                      <TextField
                        size="small"
                        fullWidth
                        type="number"
                        label={`Количество в приход (${newNomUnit})`}
                        value={newNomQty}
                        onChange={(e) => setNewNomQty(e.target.value)}
                        sx={{ bgcolor: '#ffffff' }}
                        inputProps={{ min: 0.01, step: 1 }}
                      />
                    </Grid>

                    {/* Описание */}
                    <Grid item xs={12} sm={8}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Описание / Назначение (необязательно)"
                        placeholder="Краткие характеристики, поставщик или марка..."
                        value={newNomDescription}
                        onChange={(e) => setNewNomDescription(e.target.value)}
                        sx={{ bgcolor: '#ffffff' }}
                      />
                    </Grid>

                    {/* Кнопки сохранения номенклатуры */}
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setIsCreatingNewNom(false)}
                          disabled={isSubmittingNewNom}
                        >
                          Отмена
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={isSubmittingNewNom ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                          onClick={handleSaveAndAddNewNom}
                          disabled={isSubmittingNewNom || !newNomName.trim()}
                          sx={{
                            fontWeight: 700,
                            bgcolor: '#0284c7',
                            '&:hover': { bgcolor: '#0369a1' },
                          }}
                        >
                          {isSubmittingNewNom ? 'Сохранение...' : 'Зарегистрировать и добавить в операцию'}
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>
              </Collapse>
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
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Остаток на складе</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Количество в операции</TableCell>
                        <TableCell align="center" sx={{ width: 50 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((item, idx) => {
                        const rawStock = getWarehouseStock(item.nomenclatureId);
                        const hasDeficit = isOutflow && item.quantity > rawStock;
                        return (
                          <TableRow key={idx} hover sx={hasDeficit ? { bgcolor: '#fef2f2' } : {}}>
                            <TableCell sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>
                              {item.nomenclatureName}
                              {item.equipmentName && (
                                <Typography variant="caption" sx={{ display: 'block', color: '#b45309', fontWeight: 600 }}>
                                  Оборудование: {item.equipmentName}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ py: 1, color: '#64748b', fontSize: '0.75rem' }}>
                              {item.nomenclatureArticle || '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>
                              <Chip
                                size="small"
                                label={`${rawStock} ${item.unit}`}
                                color={rawStock > 0 ? (hasDeficit ? 'error' : 'default') : 'error'}
                                variant="outlined"
                                sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1, fontWeight: 700, fontFeatureSettings: '"tnum"', color: hasDeficit ? '#dc2626' : 'inherit' }}>
                              {item.quantity} {item.unit}
                              {hasDeficit && (
                                <Typography variant="caption" sx={{ display: 'block', color: '#dc2626', fontWeight: 700 }}>
                                  Превышение остатка!
                                </Typography>
                              )}
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

            {/* Summary Review Card */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Тип операции:
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusBadge status={operationType} />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Закрепленный склад:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: '#0f172a' }}>
                    {assignedWarehouse ? `${assignedWarehouse.name} (${assignedWarehouse.code})` : '—'}
                  </Typography>
                </Grid>

                {operationType === 'TRANSFER' && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Склад назначения (Зачисление):
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: '#0f172a' }}>
                      {warehouses.find((w) => w.id === targetWarehouseId)?.name || '—'}
                    </Typography>
                  </Grid>
                )}

                {operationType === 'ISSUE_EMPLOYEE' && recipientName && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Получатель:
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: '#0f172a' }}>
                      {recipientName}
                    </Typography>
                  </Grid>
                )}

                {comment && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Примечание:
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, color: '#334155' }}>
                      {comment}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Line Items Review Table */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                Итоговый перечень позиций ({lineItems.length}):
              </Typography>
              <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Номенклатура</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Артикул</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Остаток на складе</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Количество к проведению</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((item, idx) => {
                      const rawStock = getWarehouseStock(item.nomenclatureId);
                      return (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>
                            {item.nomenclatureName}
                            {item.equipmentName && (
                              <Typography variant="caption" sx={{ display: 'block', color: '#b45309', fontWeight: 600 }}>
                                Оборудование: {item.equipmentName}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ py: 1, color: '#64748b', fontSize: '0.75rem' }}>
                            {item.nomenclatureArticle || '—'}
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1 }}>
                            <Chip
                              size="small"
                              label={`${rawStock} ${item.unit}`}
                              color={rawStock > 0 ? 'default' : 'error'}
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                            {item.quantity} {item.unit}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setActiveStep(1)} sx={{ fontWeight: 600 }}>
                ← Назад к позициям
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={isSubmitting || lineItems.length === 0}
                sx={{
                  borderRadius: '8px',
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                  bgcolor: '#16a34a',
                  '&:hover': { bgcolor: '#15803d' },
                }}
              >
                {isSubmitting ? 'Проведение в БД...' : 'Подтвердить и провести операцию'}
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </FormDialog>
  );
}

export default WmsOperationWizardDialog;
