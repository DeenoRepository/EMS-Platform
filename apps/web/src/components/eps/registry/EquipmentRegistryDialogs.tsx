'use client';

import React from 'react';
import {
  EquipmentWizardDialog,
  EquipmentFilterDrawer,
  EquipmentBatchEditDialog,
  EquipmentPurgeDialog,
  EquipmentFilters,
} from '@/components/eps';
import { CustomSectionDefItem } from './types';

interface EquipmentRegistryDialogsProps {
  openCreateWizard: boolean;
  openFilterDrawer: boolean;
  openBatchEditDialog: boolean;
  openPurgeDialog: boolean;
  selectedIds: string[];
  filters: EquipmentFilters;
  sections: CustomSectionDefItem[];
  onCloseCreateWizard: () => void;
  onSuccessCreateWizard: (createdId?: string) => void;
  onCloseFilterDrawer: () => void;
  onApplyFilters: (filters: EquipmentFilters) => void;
  onResetFilters: () => void;
  onCloseBatchEdit: () => void;
  onSuccessBatchEdit: () => void;
  onClosePurge: () => void;
  onSuccessPurge: () => void;
}

export function EquipmentRegistryDialogs({
  openCreateWizard,
  openFilterDrawer,
  openBatchEditDialog,
  openPurgeDialog,
  selectedIds,
  filters,
  sections,
  onCloseCreateWizard,
  onSuccessCreateWizard,
  onCloseFilterDrawer,
  onApplyFilters,
  onResetFilters,
  onCloseBatchEdit,
  onSuccessBatchEdit,
  onClosePurge,
  onSuccessPurge,
}: EquipmentRegistryDialogsProps) {
  return (
    <>
      <EquipmentWizardDialog
        open={openCreateWizard}
        onClose={onCloseCreateWizard}
        onSuccess={onSuccessCreateWizard}
      />

      <EquipmentFilterDrawer
        open={openFilterDrawer}
        onClose={onCloseFilterDrawer}
        filters={filters}
        onApplyFilters={onApplyFilters}
        onResetFilters={onResetFilters}
      />

      <EquipmentBatchEditDialog
        open={openBatchEditDialog}
        selectedIds={selectedIds}
        onClose={onCloseBatchEdit}
        onSuccess={onSuccessBatchEdit}
      />

      <EquipmentPurgeDialog
        open={openPurgeDialog}
        onClose={onClosePurge}
        onSuccess={onSuccessPurge}
      />
    </>
  );
}
