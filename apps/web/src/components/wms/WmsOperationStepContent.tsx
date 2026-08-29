'use client';

import React from 'react';
import { Box } from '@mui/material';
import { WmsOperationItemsStep } from './WmsOperationItemsStep';
import { WmsOperationReviewStep } from './WmsOperationReviewStep';
import { WmsOperationSetupStep } from './WmsOperationSetupStep';
import type {
  EquipmentOption,
  NomenclatureOption,
  OperationLineItem,
  OperationType,
  WarehouseOption,
} from './WmsOperationWizardDialog';
import type { OperationTypeOption } from './WmsOperationSetupStep';

export interface WmsOperationStepContentProps {
  activeStep: number;
  operationType: OperationType;
  operationTypes: OperationTypeOption[];
  warehouses: WarehouseOption[];
  transferWarehouses: WarehouseOption[];
  warehouseId: string;
  targetWarehouseId: string;
  recipientName: string;
  isAdmin: boolean;
  currentWarehouse: WarehouseOption | null;
  userDisplayName?: string | null;
  itemWriteOffType: 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER';
  equipmentList: EquipmentOption[];
  selectedItemEquipment: EquipmentOption | null;
  nomenclatures: NomenclatureOption[];
  selectedNomenclature: NomenclatureOption | null;
  searchInputValue: string;
  itemQty: string;
  lineItems: OperationLineItem[];
  isOutflow: boolean;
  getWarehouseStock: (nomenclatureId: string) => number;
  getAvailableStock: (nomenclatureId: string) => number;
  getCurrentOpBannerTitle: () => string;
  operationSummaryLabel: string;
  comment: string;
  isSubmitting: boolean;
  targetWarehouseName?: string;
  onOperationTypeChange: (type: OperationType) => void;
  onWarehouseChange: (warehouseId: string) => void;
  onTargetWarehouseChange: (warehouseId: string) => void;
  onRecipientNameChange: (recipientName: string) => void;
  onItemWriteOffTypeChange: (type: 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER') => void;
  onSelectedItemEquipmentChange: (equipment: EquipmentOption | null) => void;
  onSearchInputValueChange: (value: string) => void;
  onSelectedNomenclatureChange: (nomenclature: NomenclatureOption | null) => void;
  onOpenCreateNomenclatureDialog: (suggestedName?: string) => void;
  onItemQuantityChange: (quantity: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function WmsOperationStepContent({
  activeStep,
  operationType,
  operationTypes,
  warehouses,
  transferWarehouses,
  warehouseId,
  targetWarehouseId,
  recipientName,
  isAdmin,
  currentWarehouse,
  userDisplayName,
  itemWriteOffType,
  equipmentList,
  selectedItemEquipment,
  nomenclatures,
  selectedNomenclature,
  searchInputValue,
  itemQty,
  lineItems,
  isOutflow,
  getWarehouseStock,
  getAvailableStock,
  getCurrentOpBannerTitle,
  operationSummaryLabel,
  comment,
  isSubmitting,
  targetWarehouseName,
  onOperationTypeChange,
  onWarehouseChange,
  onTargetWarehouseChange,
  onRecipientNameChange,
  onItemWriteOffTypeChange,
  onSelectedItemEquipmentChange,
  onSearchInputValueChange,
  onSelectedNomenclatureChange,
  onOpenCreateNomenclatureDialog,
  onItemQuantityChange,
  onAddItem,
  onRemoveItem,
  onBack,
  onNext,
  onSubmit,
}: WmsOperationStepContentProps) {
  return (
    <Box sx={{ mt: 1.5 }}>
      {activeStep === 0 && (
        <WmsOperationSetupStep
          operationType={operationType}
          operationTypes={operationTypes}
          warehouses={warehouses}
          transferWarehouses={transferWarehouses}
          warehouseId={warehouseId}
          targetWarehouseId={targetWarehouseId}
          recipientName={recipientName}
          isAdmin={isAdmin}
          currentWarehouse={currentWarehouse}
          userDisplayName={userDisplayName}
          onOperationTypeChange={onOperationTypeChange}
          onWarehouseChange={onWarehouseChange}
          onTargetWarehouseChange={onTargetWarehouseChange}
          onRecipientNameChange={onRecipientNameChange}
          onNext={onNext}
        />
      )}

      {activeStep === 1 && (
        <WmsOperationItemsStep
          operationType={operationType}
          currentOpMeta={operationTypes.find((option) => option.type === operationType) || operationTypes[0]}
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
          onItemWriteOffTypeChange={onItemWriteOffTypeChange}
          onSelectedItemEquipmentChange={onSelectedItemEquipmentChange}
          onSearchInputValueChange={onSearchInputValueChange}
          onSelectedNomenclatureChange={onSelectedNomenclatureChange}
          onOpenCreateNomenclatureDialog={onOpenCreateNomenclatureDialog}
          onItemQuantityChange={onItemQuantityChange}
          onAddItem={onAddItem}
          onRemoveItem={onRemoveItem}
          onBack={onBack}
          onNext={onNext}
        />
      )}

      {activeStep === 2 && (
        <WmsOperationReviewStep
          operationType={operationType}
          operationSummaryLabel={operationSummaryLabel}
          currentWarehouse={currentWarehouse}
          targetWarehouseName={targetWarehouseName}
          recipientName={recipientName}
          comment={comment}
          lineItems={lineItems}
          getWarehouseStock={getWarehouseStock}
          isSubmitting={isSubmitting}
          onBack={onBack}
          onSubmit={onSubmit}
        />
      )}
    </Box>
  );
}
