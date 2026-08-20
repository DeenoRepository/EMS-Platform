'use client';

import React from 'react';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { FormDialog } from '@/components/ui';
import { EquipmentWizardForm } from './EquipmentWizardForm';

export interface EquipmentWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newEquipmentId: string) => void;
}

export function EquipmentWizardDialog({
  open,
  onClose,
  onSuccess,
}: EquipmentWizardDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Мастер регистрации оборудования"
      subtitle="Пошаговое создание паспорта станка или агрегата в реестре EPS"
      icon={<PrecisionManufacturingIcon color="primary" />}
      maxWidth="md"
      hideActions
    >
      <EquipmentWizardForm
        mode="dialog"
        onSuccess={(id) => {
          onSuccess(id);
          onClose();
        }}
        onCancel={onClose}
      />
    </FormDialog>
  );
}

export default EquipmentWizardDialog;
