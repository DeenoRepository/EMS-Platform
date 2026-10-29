'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS } from '@ems/shared';
import { FormDialog } from '@/components/ui';
import CreateNomenclatureDialog from './CreateNomenclatureDialog';
import {
  OperationType,
  WarehouseOption,
  EquipmentOption,
  NomenclatureOption,
  CategoryOption,
  StorageCellItem,
  ZoneWithCells,
  OperationLineItem,
  WmsOperationWizardDialogProps,
  NOMENCLATURE_TYPES,
  OPERATION_TYPES,
  getOperationSummaryLabel as getOpSummaryLabelHelper,
  getCurrentOpBannerTitle as getOpBannerTitleHelper,
} from './wizard/types';
import { WizardStepParameters } from './wizard/WizardStepParameters';
import { WizardStepItems } from './wizard/WizardStepItems';
import { WizardStepReview } from './wizard/WizardStepReview';
import { submitWmsWizardOperation } from './wizard/submitOperation';
import { useWmsWizardDictionaries } from './wizard/useWmsWizardDictionaries';
import { useWarehouseStockAndZones } from './wizard/useWarehouseStockAndZones';
import {
  validateAndFormatLineItem,
  validateStepZero,
  validateStepOne,
} from './wizard/wizardValidation';

export type {
  OperationType,
  OperationLineItem,
  WmsOperationWizardDialogProps,
};
export { NOMENCLATURE_TYPES, OPERATION_TYPES };

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

  // Form fields state
  const [recipientName, setRecipientName] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [comment, setComment] = useState('');

  // Step 2 Form: Items
  const [lineItems, setLineItems] = useState<OperationLineItem[]>([]);
  const [selectedNomenclature, setSelectedNomenclature] = useState<NomenclatureOption | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemCellId, setItemCellId] = useState('');
  const [itemEquipmentId, setItemEquipmentId] = useState('');
  const [selectedItemEquipment, setSelectedItemEquipment] = useState<EquipmentOption | null>(null);
  const [itemWriteOffType, setItemWriteOffType] = useState<'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER'>('EQUIPMENT');

  const [isCreateNomDialogOpen, setIsCreateNomDialogOpen] = useState(false);
  const [nomDialogInitialName, setNomDialogInitialName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = Boolean(
    user?.roles?.includes('admin') ||
    user?.permissions?.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    user?.permissions?.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
  );

  const {
    warehouses,
    transferWarehouses,
    equipmentList,
    nomenclatures,
    setNomenclatures,
    categories,
    warehouseId,
    setWarehouseId,
    targetWarehouseId,
    setTargetWarehouseId,
    assignedWarehouse,
  } = useWmsWizardDictionaries(open, user?.userId, initialNomenclatureId);

  const {
    warehouseZones,
    stockMap,
    isLoadingStock,
    flatWarehouseCells,
  } = useWarehouseStockAndZones(warehouseId, setNomenclatures);

  const currentWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === warehouseId) || assignedWarehouse;
  }, [warehouses, warehouseId, assignedWarehouse]);

  const isOutflow = operationType === 'ISSUE_EMPLOYEE' || operationType === 'ISSUE_WRITE_OFF' || operationType === 'TRANSFER';

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
    if (open) {
      setActiveStep(0);
      setOperationType(initialType);
      setLineItems([]);
      setSelectedNomenclature(null);
      setSearchInputValue('');
      setItemQty('1');
      setItemCellId('');
      setItemEquipmentId('');
      setSelectedItemEquipment(null);
      setRecipientName('');
      setEquipmentId('');
      setComment('');
      setIsCreateNomDialogOpen(false);
    }
  }, [open, initialType]);

  useEffect(() => {
    if (open && initialNomenclatureId && nomenclatures.length > 0) {
      const matched = nomenclatures.find((n) => n.id === initialNomenclatureId);
      if (matched) {
        setSelectedNomenclature(matched);
      }
    }
  }, [open, initialNomenclatureId, nomenclatures]);



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

    /* Automatic receipt item creation when quantity is provided */
    const qty = parseFloat(createdNom.initialQuantity) || parseFloat(itemQty) || 1;
    const cell = createdNom.initialCellId || itemCellId || null;
    if (operationType === 'RECEIPT' && qty > 0) {
      setLineItems((prev) => [
        ...prev,
        {
          nomenclatureId: formattedNom.id,
          nomenclatureName: formattedNom.name,
          nomenclatureArticle: formattedNom.article || undefined,
          unit: formattedNom.unit,
          quantity: qty,
          cellId: cell,
        },
      ]);
      enqueueSnackbar(`Позиция «${formattedNom.name}» (${qty} ${formattedNom.unit}) создана и добавлена в приход`, { variant: 'success' });
      setSelectedNomenclature(null);
      setItemQty('1');
      setItemCellId('');
    }
  };


  const handleAddItem = () => {
    if (!selectedNomenclature) {
      enqueueSnackbar('Выберите номенклатурную позицию или создайте новую', { variant: 'warning' });
      return;
    }
    const qty = parseFloat(itemQty);
    const available = isOutflow ? getAvailableStock(selectedNomenclature.id) : 0;
    const eqObj = equipmentList.find((e) => e.id === itemEquipmentId);

    const { error, lineItem } = validateAndFormatLineItem({
      nomenclature: selectedNomenclature,
      qty,
      isOutflow,
      availableStock: available,
      operationType,
      itemWriteOffType,
      equipment: eqObj,
      cellId: itemCellId,
    });

    if (error || !lineItem) {
      enqueueSnackbar(error || 'Ошибка добавления позиции', { variant: isOutflow && available <= 0 ? 'error' : 'warning' });
      return;
    }

    setLineItems((prev) => [...prev, lineItem]);
    setSelectedNomenclature(null);
    setSearchInputValue('');
    setItemQty('1');
    setItemCellId('');
    setItemEquipmentId('');
    setSelectedItemEquipment(null);
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], quantity: newQty };
      }
      return updated;
    });
  };

  const handleUpdateItemCell = (index: number, newCellId: string) => {
    setLineItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], cellId: newCellId || null };
      }
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = () => {
    if (activeStep === 0) {
      const stepZero = validateStepZero(warehouseId, operationType, targetWarehouseId);
      if (!stepZero.isValid) {
        enqueueSnackbar(stepZero.error || 'Ошибка параметров склада', { variant: 'warning' });
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      let currentItems = [...lineItems];
      if (currentItems.length === 0 && selectedNomenclature) {
        const qty = parseFloat(itemQty);
        if (!isNaN(qty) && qty > 0) {
          const autoItem: OperationLineItem = {
            nomenclatureId: selectedNomenclature.id,
            nomenclatureName: selectedNomenclature.name,
            nomenclatureArticle: selectedNomenclature.article || undefined,
            unit: selectedNomenclature.unit,
            quantity: qty,
            cellId: operationType === 'RECEIPT' ? itemCellId || null : null,
          };
          currentItems = [autoItem];
          setLineItems(currentItems);
          setSelectedNomenclature(null);
          setItemQty('1');
          setItemCellId('');
        }
      }

      const stepOne = validateStepOne(currentItems, isOutflow, getWarehouseStock);
      if (!stepOne.isValid) {
        enqueueSnackbar(stepOne.error || 'Ошибка проверки позиций ТМЦ', { variant: isOutflow ? 'error' : 'warning' });
        return;
      }
      setActiveStep(2);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitWmsWizardOperation({
        operationType,
        warehouseId,
        targetWarehouseId: operationType === 'TRANSFER' ? targetWarehouseId : undefined,
        comment,
        recipientName,
        equipmentId,
        lineItems,
      });

      if (result.success && result.operationId) {
        enqueueSnackbar(result.message || 'Операция успешно проведена', { variant: 'success' });
        onSuccess(result.operationId);
        onClose();
      } else {
        enqueueSnackbar(result.error || 'Ошибка проведения операции', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при проведении операции', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentOpMeta = OPERATION_TYPES.find((o) => o.type === operationType) || OPERATION_TYPES[0];

  const getOperationSummaryLabel = () => {
    return getOpSummaryLabelHelper(operationType, lineItems, currentOpMeta.title);
  };

  const getCurrentOpBannerTitle = () => {
    return getOpBannerTitleHelper(operationType, itemWriteOffType, currentOpMeta.title);
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
          <WizardStepParameters
            operationType={operationType}
            setOperationType={setOperationType}
            warehouseId={warehouseId}
            setWarehouseId={setWarehouseId}
            targetWarehouseId={targetWarehouseId}
            setTargetWarehouseId={setTargetWarehouseId}
            recipientName={recipientName}
            setRecipientName={setRecipientName}
            warehouses={warehouses}
            transferWarehouses={transferWarehouses}
            currentWarehouse={currentWarehouse || null}
            isAdmin={isAdmin}
            userDisplayName={user?.displayName}
            onNext={handleNextStep}
          />
        )}


        {/* STEP 1: Подбор позиций ТМЦ */}
        {activeStep === 1 && (
          <WizardStepItems
            operationType={operationType}
            currentWarehouse={currentWarehouse || null}
            targetWarehouseId={targetWarehouseId}
            warehouses={warehouses}
            recipientName={recipientName}
            nomenclatures={nomenclatures}
            selectedNomenclature={selectedNomenclature}
            searchInputValue={searchInputValue}
            itemQty={itemQty}
            itemCellId={itemCellId}
            itemEquipmentId={itemEquipmentId}
            selectedItemEquipment={selectedItemEquipment}
            itemWriteOffType={itemWriteOffType}
            equipmentList={equipmentList}
            warehouseZones={warehouseZones}
            flatWarehouseCells={flatWarehouseCells}
            lineItems={lineItems}
            isOutflow={isOutflow}
            getCurrentOpBannerTitle={getCurrentOpBannerTitle}
            getWarehouseStock={getWarehouseStock}
            getAvailableStock={getAvailableStock}
            onSetSearchInputValue={setSearchInputValue}
            onSetSelectedNomenclature={setSelectedNomenclature}
            onSetItemQty={setItemQty}
            onSetItemCellId={setItemCellId}
            onSetItemEquipmentId={setItemEquipmentId}
            onSetSelectedItemEquipment={setSelectedItemEquipment}
            onSetItemWriteOffType={setItemWriteOffType}
            onOpenCreateNomDialog={handleOpenCreateNomDialog}
            onAddItem={handleAddItem}
            onUpdateItemQuantity={handleUpdateItemQuantity}
            onUpdateItemCell={handleUpdateItemCell}
            onRemoveItem={handleRemoveItem}
            onBack={() => setActiveStep(0)}
            onNext={handleNextStep}
          />
        )}


        {/* STEP 2: Сводка и Проведение */}
        {activeStep === 2 && (
          <WizardStepReview
            operationType={operationType}
            getOperationSummaryLabel={getOperationSummaryLabel}
            currentWarehouse={currentWarehouse || null}
            targetWarehouseId={targetWarehouseId}
            warehouses={warehouses}
            recipientName={recipientName}
            comment={comment}
            lineItems={lineItems}
            getWarehouseStock={getWarehouseStock}
            flatWarehouseCells={flatWarehouseCells}
            isSubmitting={isSubmitting}
            onBack={() => setActiveStep(1)}
            onSubmit={handleSubmit}
          />
        )}

      </Box>

      {/* Модальное окно создания новой номенклатуры */}
      <CreateNomenclatureDialog
        open={isCreateNomDialogOpen}
        onClose={() => setIsCreateNomDialogOpen(false)}
        onCreated={handleNomenclatureCreated}
        initialName={nomDialogInitialName}
        categories={categories}
        showReceiptFields={operationType === 'RECEIPT'}
        warehouseName={warehouses.find((w) => w.id === warehouseId)?.name}
        cells={flatWarehouseCells}
        initialQuantity={parseFloat(itemQty) || 1}
      />
    </FormDialog>
  );
}

export default WmsOperationWizardDialog;
