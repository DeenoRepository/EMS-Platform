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
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';
import { FormDialog, StatusBadge } from '@/components/ui';
import CreateNomenclatureDialog from './CreateNomenclatureDialog';

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
  writeOffReason?: string;
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
    title: 'Списание ТМЦ',
    description: 'Монтаж на оборудование (ТОиР), списание в брак, неликвид или утилизация',
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
  const [itemWriteOffType, setItemWriteOffType] = useState<'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER'>('EQUIPMENT');

  // Nomenclature creation dialog state
  const [isCreateNomDialogOpen, setIsCreateNomDialogOpen] = useState(false);
  const [nomDialogInitialName, setNomDialogInitialName] = useState('');

  // Metadata dictionaries & stock balance cache
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [transferWarehouses, setTransferWarehouses] = useState<WarehouseOption[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, { quantity: number; cell?: string }>>({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = Boolean(
    user?.roles?.includes('admin') ||
    user?.permissions?.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    user?.permissions?.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
  );

  // Automatically determine the warehouse assigned to current user (1 employee = 1 warehouse)
  const assignedWarehouse = useMemo(() => {
    if (!warehouses.length) return null;
    const userWh = warehouses.find((w) => w.responsibleUserId === user?.userId);
    if (userWh) return userWh;
    return warehouses[0];
  }, [warehouses, user?.userId]);

  const currentWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === warehouseId) || assignedWarehouse;
  }, [warehouses, warehouseId, assignedWarehouse]);

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
      setIsCreateNomDialogOpen(false);

      // Load dictionaries
      Promise.all([
        fetch('/api/wms/warehouses').then((r) => r.json()),
        fetch('/api/wms/warehouses?forTransfer=true').then((r) => r.json()),
        fetch('/api/eps/equipment?limit=200').then((r) => r.json()),
        fetch('/api/wms/nomenclature?limit=500').then((r) => r.json()),
        fetch('/api/wms/categories').then((r) => r.json()).catch(() => ({ success: false })),
      ])
        .then(([whData, transferWhData, eqData, nomData, catData]) => {
          if (whData.success && whData.data) {
            setWarehouses(whData.data);
            const userWh = whData.data.find((w: WarehouseOption) => w.responsibleUserId === user?.userId) || whData.data[0];
            if (userWh) {
              setWarehouseId(userWh.id);
            }
          }
          if (transferWhData.success && transferWhData.data) {
            setTransferWarehouses(transferWhData.data);
            const userWh = whData.data?.find((w: WarehouseOption) => w.responsibleUserId === user?.userId) || whData.data?.[0];
            const targetWh = transferWhData.data.find((w: WarehouseOption) => w.id !== userWh?.id) || transferWhData.data[0];
            if (targetWh) {
              setTargetWarehouseId(targetWh.id);
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



  const handleOpenCreateNomDialog = (suggestedName?: string) => {
    const nameToSet = (suggestedName || searchInputValue || '').trim();
    setNomDialogInitialName(nameToSet);
    setIsCreateNomDialogOpen(true);
  };

  const handleNomenclatureCreated = (createdNom: any) => {
    const formattedNom: NomenclatureOption = {
      id: createdNom.id,
      name: createdNom.name,
      article: createdNom.article,
      unit: createdNom.unit,
      category: createdNom.category,
    };
    setNomenclatures((prev) => [formattedNom, ...prev]);
    setSelectedNomenclature(formattedNom);
    setSearchInputValue('');
    setIsCreateNomDialogOpen(false);

    // If quantity is specified, automatically add to line items for RECEIPT
    const qty = parseFloat(itemQty) || 1;
    if (operationType === 'RECEIPT' && qty > 0) {
      setLineItems((prev) => [
        ...prev,
        {
          nomenclatureId: formattedNom.id,
          nomenclatureName: formattedNom.name,
          nomenclatureArticle: formattedNom.article || undefined,
          unit: formattedNom.unit,
          quantity: qty,
        },
      ]);
      enqueueSnackbar(`Позиция «${formattedNom.name}» создана и добавлена в приход`, { variant: 'success' });
      setSelectedNomenclature(null);
      setItemQty('1');
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
    let finalEquipmentName: string | undefined = undefined;
    let finalEquipmentId: string | undefined = undefined;
    let finalWriteOffReason: string | undefined = undefined;

    if (operationType === 'ISSUE_WRITE_OFF') {
      if (itemWriteOffType === 'EQUIPMENT') {
        if (eqObj) {
          finalEquipmentId = eqObj.id;
          finalEquipmentName = `${eqObj.name} (${eqObj.inventoryNumber})`;
          finalWriteOffReason = `Оборудование: ${eqObj.name} (${eqObj.inventoryNumber})`;
        } else {
          finalWriteOffReason = 'Общее списание на оборудование';
        }
      } else if (itemWriteOffType === 'DEFECT') {
        finalWriteOffReason = 'Списание в брак / дефект';
      } else if (itemWriteOffType === 'SCRAP') {
        finalWriteOffReason = 'Списание в неликвид';
      } else {
        finalWriteOffReason = 'Утилизация / износ';
      }
    }

    setLineItems((prev) => [
      ...prev,
      {
        nomenclatureId: selectedNomenclature.id,
        nomenclatureName: selectedNomenclature.name,
        nomenclatureArticle: selectedNomenclature.article || undefined,
        unit: selectedNomenclature.unit,
        quantity: qty,
        equipmentId: finalEquipmentId,
        equipmentName: finalEquipmentName,
        writeOffReason: finalWriteOffReason,
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
      if (operationType === 'TRANSFER') {
        const res = await fetch('/api/wms/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceWarehouseId: warehouseId,
            targetWarehouseId,
            isRequest: false,
            requestReason: comment.trim() || undefined,
            items: lineItems.map((item) => ({
              nomenclatureId: item.nomenclatureId,
              quantity: item.quantity,
            })),
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          enqueueSnackbar(json.message || 'Перемещение успешно оформлено и ожидает приемки получателем', { variant: 'success' });
          onSuccess(json.data.id);
          onClose();
        } else {
          enqueueSnackbar(json.error || 'Ошибка оформления перемещения', { variant: 'error' });
        }
        return;
      }

      const res = await fetch('/api/wms/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: operationType,
          warehouseId,
          targetWarehouseId: undefined,
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

  const getOperationSummaryLabel = () => {
    if (operationType === 'ISSUE_WRITE_OFF') {
      const reasons = new Set(lineItems.map((i) => i.writeOffReason).filter(Boolean));
      const hasEq = lineItems.some((i) => i.equipmentName);
      if (hasEq) {
        return 'Списание на оборудование';
      }
      if (reasons.has('Списание в брак / дефект')) {
        return 'Списание в брак / дефект';
      }
      if (reasons.has('Списание в неликвид')) {
        return 'Списание в неликвид';
      }
      if (reasons.has('Утилизация / износ')) {
        return 'Списание на утилизацию';
      }
      return 'Списание ТМЦ';
    }
    return currentOpMeta.title;
  };

  const getCurrentOpBannerTitle = () => {
    if (operationType === 'ISSUE_WRITE_OFF') {
      if (itemWriteOffType === 'DEFECT') return 'Списание ТМЦ (Брак / Дефект)';
      if (itemWriteOffType === 'SCRAP') return 'Списание ТМЦ (Неликвид)';
      if (itemWriteOffType === 'OTHER') return 'Списание ТМЦ (Утилизация / Износ)';
      return 'Списание ТМЦ (Установка на оборудование)';
    }
    return currentOpMeta.title;
  };

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

            {/* Склад проведения операции: для кладовщика строго его закрепленный склад, для администратора - выбор */}
            <Box>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase' }}>
                {operationType === 'TRANSFER' ? 'Исходный склад списания (Закреплен за вами):' : 'Склад проведения операции (МОЛ):'}
              </Typography>
              {!isAdmin && currentWarehouse ? (
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
                        {currentWarehouse.name} ({currentWarehouse.code})
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        Материально ответственное лицо:{' '}
                        <b>{user?.displayName || currentWarehouse.responsibleUser?.displayName || 'Вы (Текущий сотрудник)'}</b>
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
              ) : (
                <TextField
                  select
                  fullWidth
                  required
                  label={operationType === 'TRANSFER' ? 'Исходный склад списания (МОЛ)' : 'Склад проведения операции (МОЛ)'}
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  helperText="Выберите склад, на котором проводятся складские операции"
                  SelectProps={{
                    displayEmpty: true,
                  }}
                >
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code}) {w.responsibleUser?.displayName ? `— МОЛ: ${w.responsibleUser.displayName}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              )}
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
                SelectProps={{
                  displayEmpty: true,
                }}
              >
                {(transferWarehouses.length > 0 ? transferWarehouses : warehouses)
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
                        {getCurrentOpBannerTitle()}
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
                      {currentWarehouse ? `${currentWarehouse.name} (${currentWarehouse.code})` : '—'}
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
                {operationType === 'RECEIPT' && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenCreateNomDialog('')}
                    sx={{ fontWeight: 600, textTransform: 'none', color: '#0284c7' }}
                  >
                    + Новая номенклатура
                  </Button>
                )}
              </Box>

              <Grid container spacing={1.5} alignItems="flex-start">
                {operationType === 'ISSUE_WRITE_OFF' && (
                  <Grid item xs={12}>
                    <Stack spacing={1.5} sx={{ mb: 1, p: 1.5, bgcolor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.75 }}>
                          Причина / основание списания:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip
                            icon={<PrecisionManufacturingIcon sx={{ fontSize: 16 }} />}
                            label="Установка на оборудование (ТОиР)"
                            clickable
                            color={itemWriteOffType === 'EQUIPMENT' ? 'primary' : 'default'}
                            variant={itemWriteOffType === 'EQUIPMENT' ? 'filled' : 'outlined'}
                            onClick={() => setItemWriteOffType('EQUIPMENT')}
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          />
                          <Chip
                            label="Брак / Дефект"
                            clickable
                            color={itemWriteOffType === 'DEFECT' ? 'error' : 'default'}
                            variant={itemWriteOffType === 'DEFECT' ? 'filled' : 'outlined'}
                            onClick={() => setItemWriteOffType('DEFECT')}
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          />
                          <Chip
                            label="Неликвид / Истек срок"
                            clickable
                            color={itemWriteOffType === 'SCRAP' ? 'warning' : 'default'}
                            variant={itemWriteOffType === 'SCRAP' ? 'filled' : 'outlined'}
                            onClick={() => setItemWriteOffType('SCRAP')}
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          />
                          <Chip
                            label="Утилизация / Износ"
                            clickable
                            color={itemWriteOffType === 'OTHER' ? 'default' : 'default'}
                            variant={itemWriteOffType === 'OTHER' ? 'filled' : 'outlined'}
                            onClick={() => setItemWriteOffType('OTHER')}
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          />
                        </Stack>
                      </Box>

                      {itemWriteOffType === 'EQUIPMENT' && (
                        <TextField
                          select
                          size="small"
                          fullWidth
                          label="Целевое оборудование (из реестра EPS)"
                          value={itemEquipmentId}
                          onChange={(e) => setItemEquipmentId(e.target.value)}
                          helperText="Укажите единицу оборудования, на которую монтируется деталь, или оставьте пустым для общего списания"
                          sx={{ bgcolor: '#ffffff' }}
                        >
                          <MenuItem value="">— Не привязано к конкретному оборудованию (Общий монтаж) —</MenuItem>
                          {equipmentList.map((eq) => (
                            <MenuItem key={eq.id} value={eq.id}>
                              {eq.name} ({eq.inventoryNumber})
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    </Stack>
                  </Grid>
                )}

                <Grid item xs={12} sm={7.5} md={8}>
                  <Autocomplete
                    size="small"
                    options={nomenclatures}
                    getOptionLabel={(option) => `${option.name} (${option.article || option.unit})`}
                    value={selectedNomenclature}
                    inputValue={searchInputValue}
                    onInputChange={(_, newInputValue) => setSearchInputValue(newInputValue)}
                    onChange={(_, val) => {
                      if (val && val.isNewAction) {
                        handleOpenCreateNomDialog(searchInputValue);
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
                    slotProps={{
                      popper: {
                        placement: 'bottom-start',
                        sx: {
                          zIndex: 1400,
                          boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                          borderRadius: '10px',
                          '& .MuiAutocomplete-listbox': {
                            p: 1,
                            maxHeight: 320,
                          },
                        },
                      },
                    }}
                    renderOption={(props, option) => {
                      if (option.isNewAction) {
                        return (
                          <li {...props} key={option.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 1, color: '#0284c7', fontWeight: 600 }}>
                              <AddIcon fontSize="small" />
                              <Typography variant="body2">{option.name}</Typography>
                            </Box>
                          </li>
                        );
                      }
                      const stock = getWarehouseStock(option.id);
                      const isAvailable = stock > 0;
                      return (
                        <li {...props} key={option.id} style={{ ...props.style, padding: 0 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                              py: 1,
                              px: 1.5,
                              borderRadius: '6px',
                              gap: 2,
                            }}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  lineHeight: 1.35,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {option.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                                {option.article ? `Арт: ${option.article}` : 'Без артикула'} • {option.category?.name || 'Без категории'} • {option.unit}
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
                                fontSize: '0.725rem',
                                height: 24,
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
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
                        operationType === 'RECEIPT' &&
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
                        <Typography variant="body2" color="text.secondary" sx={{ mb: operationType === 'RECEIPT' ? 1 : 0 }}>
                          Позиция не найдена в справочнике ТМЦ
                        </Typography>
                        {operationType === 'RECEIPT' && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenCreateNomDialog(searchInputValue)}
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          >
                            Создать «{searchInputValue}»
                          </Button>
                        )}
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

                <Grid item xs={6} sm={2.25} md={2}>
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
                          ? `0 ${selectedNomenclature.unit}`
                          : parseFloat(itemQty) > getAvailableStock(selectedNomenclature.id)
                          ? `Превышает (${getAvailableStock(selectedNomenclature.id)})`
                          : `Доступно: ${getAvailableStock(selectedNomenclature.id)}`
                        : undefined
                    }
                    inputProps={{ min: 0.01, step: 'any' }}
                    InputProps={{
                      endAdornment: isOutflow && selectedNomenclature && getAvailableStock(selectedNomenclature.id) > 0 ? (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setItemQty(String(getAvailableStock(selectedNomenclature.id)))}
                            sx={{ minWidth: 'auto', p: '2px 4px', fontSize: '0.7rem', fontWeight: 700, color: '#0284c7' }}
                          >
                            Макс
                          </Button>
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />
                </Grid>

                <Grid item xs={6} sm={2.25} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                    disabled={
                      !selectedNomenclature ||
                      (isOutflow && (getAvailableStock(selectedNomenclature.id) <= 0 || parseFloat(itemQty) > getAvailableStock(selectedNomenclature.id) || isNaN(parseFloat(itemQty)) || parseFloat(itemQty) <= 0))
                    }
                    sx={{ height: 40, borderRadius: '8px', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    Добавить
                  </Button>
                </Grid>
              </Grid>

              {/* Banner when user typed a name that does not exist (ONLY for RECEIPT) */}
              {operationType === 'RECEIPT' && searchInputValue.trim() !== '' && !nomenclatures.some((n) => n.name.toLowerCase().includes(searchInputValue.toLowerCase()) || (n.article && n.article.toLowerCase().includes(searchInputValue.toLowerCase()))) && (
                <Alert
                  severity="info"
                  action={
                    <Button
                      color="primary"
                      size="small"
                      variant="contained"
                      onClick={() => handleOpenCreateNomDialog(searchInputValue)}
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
                        {operationType === 'ISSUE_WRITE_OFF' && (
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Назначение / Оборудование</TableCell>
                        )}
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
                            </TableCell>
                            <TableCell sx={{ py: 1, color: '#64748b', fontSize: '0.75rem' }}>
                              {item.nomenclatureArticle || '—'}
                            </TableCell>
                            {operationType === 'ISSUE_WRITE_OFF' && (
                              <TableCell sx={{ py: 1 }}>
                                {item.equipmentName ? (
                                  <Chip
                                    size="small"
                                    icon={<PrecisionManufacturingIcon sx={{ fontSize: '14px !important' }} />}
                                    label={item.equipmentName}
                                    color="warning"
                                    variant="outlined"
                                    sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24, maxWidth: 220 }}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    label={item.writeOffReason || 'Списание в неликвид/брак'}
                                    variant="outlined"
                                    sx={{ fontWeight: 500, fontSize: '0.75rem', height: 24, color: '#64748b' }}
                                  />
                                )}
                              </TableCell>
                            )}
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
                    <StatusBadge status={operationType} label={getOperationSummaryLabel()} />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Закрепленный склад:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: '#0f172a' }}>
                    {currentWarehouse ? `${currentWarehouse.name} (${currentWarehouse.code})` : '—'}
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
                      {operationType === 'ISSUE_WRITE_OFF' && (
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Назначение / Оборудование</TableCell>
                      )}
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
                          </TableCell>
                          <TableCell sx={{ py: 1, color: '#64748b', fontSize: '0.75rem' }}>
                            {item.nomenclatureArticle || '—'}
                          </TableCell>
                          {operationType === 'ISSUE_WRITE_OFF' && (
                            <TableCell sx={{ py: 1 }}>
                              {item.equipmentName ? (
                                <Chip
                                  size="small"
                                  icon={<PrecisionManufacturingIcon sx={{ fontSize: '14px !important' }} />}
                                  label={item.equipmentName}
                                  color="warning"
                                  variant="outlined"
                                  sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24, maxWidth: 220 }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  label={item.writeOffReason || 'Списание в неликвид/брак'}
                                  variant="outlined"
                                  sx={{ fontWeight: 500, fontSize: '0.75rem', height: 24, color: '#64748b' }}
                                />
                              )}
                            </TableCell>
                          )}
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

      {/* Модальное окно создания новой номенклатуры */}
      <CreateNomenclatureDialog
        open={isCreateNomDialogOpen}
        onClose={() => setIsCreateNomDialogOpen(false)}
        onCreated={handleNomenclatureCreated}
        initialName={nomDialogInitialName}
        categories={categories}
      />
    </FormDialog>
  );
}

export default WmsOperationWizardDialog;
