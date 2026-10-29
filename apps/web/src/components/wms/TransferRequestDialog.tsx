'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Stack, Alert, Paper, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { FormDialog } from '@/components/ui';
import {
  TransferWarehouseFields,
  TransferItemPicker,
  TransferItemsTable,
  WarehouseOption,
  NomenclatureOption,
  RequestLineItem,
  FONT_WEIGHT_BOLD,
} from './transfers/TransferRequestSubcomponents';
import { useTransferRequestData } from './transfers/useTransferRequestData';
import { submitTransferRequest } from './transfers/transferRequestService';

export type { NomenclatureOption, RequestLineItem };

interface TransferRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Основной диалог оформления запроса на перемещение ТМЦ
 */
export default function TransferRequestDialog({
  open,
  onClose,
  onSuccess,
}: TransferRequestDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const {
    warehouses,
    nomenclatures,
    sourceWarehouseId,
    setSourceWarehouseId,
    targetWarehouseId,
    stockMap,
    isLoadingStock,
  } = useTransferRequestData(open, user?.userId);

  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);
  const [selectedNomenclature, setSelectedNomenclature] = useState<NomenclatureOption | null>(null);
  const [itemQty, setItemQty] = useState('1');
  const [requestReason, setRequestReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLineItems([]);
      setSelectedNomenclature(null);
      setItemQty('1');
      setRequestReason('');
    }
  }, [open]);

  const targetWh = useMemo(
    () => warehouses.find((w) => w.id === targetWarehouseId) || null,
    [warehouses, targetWarehouseId]
  );

  const handleAddItem = () => {
    if (!selectedNomenclature) return;
    const qty = parseFloat(itemQty);
    if (isNaN(qty) || qty <= 0) {
      enqueueSnackbar('Укажите корректное количество (> 0)', { variant: 'warning' });
      return;
    }

    const existingIdx = lineItems.findIndex((it) => it.nomenclatureId === selectedNomenclature.id);
    if (existingIdx >= 0) {
      const updated = [...lineItems];
      updated[existingIdx].quantity += qty;
      setLineItems(updated);
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          nomenclatureId: selectedNomenclature.id,
          nomenclatureName: selectedNomenclature.name,
          nomenclatureArticle: selectedNomenclature.article || undefined,
          unit: selectedNomenclature.unit,
          quantity: qty,
        },
      ]);
    }
    setSelectedNomenclature(null);
    setItemQty('1');
  };

  const handleRemoveItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateTransferForm = () => {
    if (!sourceWarehouseId) {
      enqueueSnackbar('Выберите склад-донор, у которого запрашиваются ТМЦ', { variant: 'warning' });
      return false;
    }
    if (!targetWarehouseId) {
      enqueueSnackbar('Не определен ваш целевой склад', { variant: 'warning' });
      return false;
    }
    if (lineItems.length === 0) {
      enqueueSnackbar('Добавьте хотя бы одну позицию ТМЦ в заявку', { variant: 'warning' });
      return false;
    }
    return true;
  };

  const executeSubmit = async () => {
    if (!validateTransferForm()) return;
    setIsSubmitting(true);
    const result = await submitTransferRequest({
      sourceWarehouseId,
      targetWarehouseId,
      requestReason,
      items: lineItems,
    });
    setIsSubmitting(false);

    if (result.success) {
      enqueueSnackbar('Заявка на перемещение успешно отправлена кладовщику склада-донора', { variant: 'success' });
      onSuccess();
      onClose();
    } else {
      enqueueSnackbar(result.error || 'Ошибка отправки заявки', { variant: 'error' });
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Запрос на перемещение ТМЦ"
      subtitle="Заявка на перевод позиций с другого склада предприятия на ваш склад"
      icon={<MoveToInboxIcon color="primary" />}
      maxWidth="md"
      loading={isSubmitting}
      submitLabel="Направить запрос кладовщику"
      submitIcon={<SendIcon />}
      onSubmit={executeSubmit}
      submitDisabled={isSubmitting || !sourceWarehouseId || lineItems.length === 0}
    >
      <Stack spacing={2.5}>
        <Alert severity="info" icon={<MoveToInboxIcon />} sx={{ borderRadius: '8px' }}>
          Заявка поступит материально ответственному лицу склада-донора. После его согласования ТМЦ будут отгружены в ваш адрес.
        </Alert>

        <TransferWarehouseFields
          targetWh={targetWh}
          sourceWarehouseId={sourceWarehouseId}
          onSourceChange={setSourceWarehouseId}
          warehouses={warehouses}
          displayName={user?.displayName}
          requestReason={requestReason}
          onReasonChange={setRequestReason}
        />

        <Paper elevation={0} sx={{ p: 2, borderRadius: '8px', bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: FONT_WEIGHT_BOLD, color: 'text.primary', mb: 1.5 }}>
            Подбор запрашиваемых позиций ТМЦ:
          </Typography>

          <TransferItemPicker
            nomenclatures={nomenclatures}
            selectedNomenclature={selectedNomenclature}
            onNomenclatureChange={setSelectedNomenclature}
            itemQty={itemQty}
            onQtyChange={setItemQty}
            onAddItem={handleAddItem}
            stockMap={stockMap}
            isLoadingStock={isLoadingStock}
          />

          <TransferItemsTable
            items={lineItems}
            stockMap={stockMap}
            onRemove={handleRemoveItem}
          />
        </Paper>
      </Stack>
    </FormDialog>
  );
}
