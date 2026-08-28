'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WmsOperationItemsStep } from './WmsOperationItemsStep';
import { WmsOperationReviewStep } from './WmsOperationReviewStep';
import { WmsOperationSetupStep } from './WmsOperationSetupStep';
import { Box } from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';
import { FormDialog } from '@/components/ui';
import CreateNomenclatureDialog from './CreateNomenclatureDialog';

export type OperationType = 'RECEIPT' | 'ISSUE_EMPLOYEE' | 'ISSUE_WRITE_OFF' | 'TRANSFER';

export interface WarehouseOption {
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

export interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string;
  model?: string | null;
  location?: string | null;
}

export interface NomenclatureOption {
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

export interface OperationLineItem {
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

const OPERATION_TYPES = [
  {
    type: 'RECEIPT' as OperationType,
    title: 'Приход ТМЦ',
    description: 'Поступление материалов и запчастей на закрепленный склад',
    icon: <MoveToInboxIcon />,
    color: 'success.main',
    bgcolor: 'rgba(22, 163, 74, 0.08)',
  },
  {
    type: 'ISSUE_EMPLOYEE' as OperationType,
    title: 'Выдача сотруднику',
    description: 'Выдача расходников или инструмента в подотчет',
    icon: <PersonIcon />,
    color: 'info.dark',
    bgcolor: 'rgba(29, 78, 216, 0.08)',
  },
  {
    type: 'ISSUE_WRITE_OFF' as OperationType,
    title: 'Списание ТМЦ',
    description: 'Монтаж на оборудование (ТОиР), списание в брак, неликвид или утилизация',
    icon: <DeleteSweepIcon />,
    color: 'warning.main',
    bgcolor: 'rgba(217, 119, 6, 0.08)',
  },
  {
    type: 'TRANSFER' as OperationType,
    title: 'Межскладское перемещение',
    description: 'Трансфер с закрепленного склада на другой склад',
    icon: <SwapHorizIcon />,
    color: 'secondary.main',
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
  const [selectedItemEquipment, setSelectedItemEquipment] = useState<EquipmentOption | null>(null);
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
  const [, setIsLoadingStock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = Boolean(
    user?.roles?.includes('admin') ||
    user?.permissions?.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    user?.permissions?.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
  );

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

  const fetchStock = useCallback(async (whId: string) => {
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

  const getWarehouseStock = useCallback((nomId: string) => {
    return stockMap[nomId]?.quantity || 0;
  }, [stockMap]);

  const getAvailableStock = useCallback((nomId: string) => {
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
      setSelectedItemEquipment(null);
      setRecipientName('');
      setEquipmentId('');
      setTargetWarehouseId('');
      setComment('');
      setIsCreateNomDialogOpen(false);

      Promise.all([
        fetch('/api/wms/warehouses').then((r) => r.json()),
        fetch('/api/wms/warehouses?forTransfer=true').then((r) => r.json()),
        fetch('/api/eps/equipment?pageSize=1000').then((r) => r.json()),
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
    setSelectedItemEquipment(null);
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
      if (hasEq) return 'Списание на оборудование';
      if (reasons.has('Списание в брак / дефект')) return 'Списание в брак / дефект';
      if (reasons.has('Списание в неликвид')) return 'Списание в неликвид';
      if (reasons.has('Утилизация / износ')) return 'Списание на утилизацию';
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
        {activeStep === 0 && (
          <WmsOperationSetupStep
            operationType={operationType}
            operationTypes={OPERATION_TYPES}
            warehouses={warehouses}
            transferWarehouses={transferWarehouses}
            warehouseId={warehouseId}
            targetWarehouseId={targetWarehouseId}
            recipientName={recipientName}
            isAdmin={isAdmin}
            currentWarehouse={currentWarehouse}
            userDisplayName={user?.displayName}
            onOperationTypeChange={setOperationType}
            onWarehouseChange={setWarehouseId}
            onTargetWarehouseChange={setTargetWarehouseId}
            onRecipientNameChange={setRecipientName}
            onNext={handleNextStep}
          />
        )}

        {activeStep === 1 && (
          <WmsOperationItemsStep
            operationType={operationType}
            currentOpMeta={currentOpMeta}
            currentWarehouse={currentWarehouse}
            targetWarehouseId={targetWarehouseId}
            warehouses={warehouses}
            recipientName={recipientName}
            itemWriteOffType={itemWriteOffType}
            equipmentList={equipmentList}
            selectedItemEquipment={selectedItemEquipment}
            nomenclatures={nomenclatures}
            selectedNomenclature={selectedNomenclature}
            searchInputValue={searchInputValue}
            itemQty={itemQty}
            lineItems={lineItems}
            isOutflow={isOutflow}
            getWarehouseStock={getWarehouseStock}
            getAvailableStock={getAvailableStock}
            getCurrentOpBannerTitle={getCurrentOpBannerTitle}
            onItemWriteOffTypeChange={setItemWriteOffType}
            onSelectedItemEquipmentChange={(equipment) => {
              setSelectedItemEquipment(equipment);
              setItemEquipmentId(equipment?.id || '');
            }}
            onSearchInputValueChange={setSearchInputValue}
            onSelectedNomenclatureChange={setSelectedNomenclature}
            onOpenCreateNomenclatureDialog={handleOpenCreateNomDialog}
            onItemQuantityChange={setItemQty}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onBack={() => setActiveStep(0)}
            onNext={handleNextStep}
          />
        )}

        {activeStep === 2 && (
          <WmsOperationReviewStep
            operationType={operationType}
            operationSummaryLabel={getOperationSummaryLabel()}
            currentWarehouse={currentWarehouse}
            targetWarehouseName={warehouses.find((warehouse) => warehouse.id === targetWarehouseId)?.name}
            recipientName={recipientName}
            comment={comment}
            lineItems={lineItems}
            getWarehouseStock={getWarehouseStock}
            isSubmitting={isSubmitting}
            onBack={() => setActiveStep(1)}
            onSubmit={handleSubmit}
          />
        )}
      </Box>

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
