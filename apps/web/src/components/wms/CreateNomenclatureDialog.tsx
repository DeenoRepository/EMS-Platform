'use client';

import React, { useState } from 'react';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useSnackbar } from 'notistack';
import { FormDialog } from '@/components/ui';
import {
  CategoryOption,
  StorageCellOption,
  CreatedNomenclatureResult,
} from './nomenclature/nomenclatureTypes';
import { NomenclatureFormBody } from './nomenclature/NomenclatureFormBody';
import { useCreateNomenclatureForm } from './nomenclature/useCreateNomenclatureForm';
import { submitCreateNomenclature } from './nomenclature/createNomenclatureService';

export type { CategoryOption, StorageCellOption, CreatedNomenclatureResult };

interface CreateNomenclatureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (createdItem: CreatedNomenclatureResult) => void;
  categories?: CategoryOption[];
  initialName?: string;
  initialType?: string;
  showReceiptFields?: boolean;
  warehouseName?: string;
  cells?: StorageCellOption[];
  initialQuantity?: number;
}

function buildCreatedResult(
  data: CreatedNomenclatureResult,
  showReceipt: boolean,
  qtyStr: string,
  cellId: string
): CreatedNomenclatureResult {
  const qty = parseFloat(qtyStr);
  return {
    ...data,
    initialQuantity: showReceipt ? (Number.isNaN(qty) ? 1 : qty) : undefined,
    initialCellId: showReceipt ? (cellId || null) : undefined,
  };
}

/**
 * Диалог создания новой номенклатуры (ТМЦ) и быстрого оприходования
 */
export default function CreateNomenclatureDialog({
  open,
  onClose,
  onCreated,
  categories: initialCategories,
  initialName = '',
  initialType = 'SPARE_PART',
  showReceiptFields = false,
  warehouseName,
  cells = [],
  initialQuantity = 1,
}: CreateNomenclatureDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useCreateNomenclatureForm({
    open,
    initialName,
    initialType,
    initialQuantity,
    initialCategories,
  });

  const handleFormSubmit = async () => {
    if (!form.name.trim()) {
      enqueueSnackbar('Укажите наименование номенклатуры (ТМЦ)', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    const result = await submitCreateNomenclature({
      name: form.name.trim(),
      article: form.article.trim() || undefined,
      unit: form.unit.trim() || 'шт',
      categoryId: form.categoryId || undefined,
      minStock: form.minStock ? Number(form.minStock) : undefined,
      description: form.description.trim() || undefined,
    });
    setIsSubmitting(false);

    if (result.success && result.data) {
      enqueueSnackbar('Номенклатура успешно создана', { variant: 'success' });
      form.handleReset();
      onCreated(buildCreatedResult(result.data, showReceiptFields, form.receiptQuantity, form.receiptCellId));
      onClose();
      return;
    }

    enqueueSnackbar(result.error || 'Ошибка создания номенклатуры', { variant: 'error' });
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <FormDialog
      open={open}
      onClose={handleClose}
      title="Создание позиции номенклатуры (ТМЦ)"
      subtitle="Регистрация новой позиции в справочнике запасных частей и материалов"
      icon={<Inventory2OutlinedIcon color="primary" />}
      maxWidth="md"
      loading={isSubmitting}
      submitLabel={isSubmitting ? 'Сохранение...' : 'Создать номенклатуру'}
      onSubmit={handleFormSubmit}
      submitDisabled={isSubmitting || !form.name.trim()}
    >
      <NomenclatureFormBody
        form={form}
        showReceiptFields={showReceiptFields}
        warehouseName={warehouseName}
        cells={cells}
      />
    </FormDialog>
  );
}

