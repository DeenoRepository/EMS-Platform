'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { FormDialog } from '@/components/ui';

interface TransferRejectDialogProps {
  open: boolean;
  onClose: () => void;
  transfer: {
    id: string;
    transferNumber: string;
    status: string;
    sourceWarehouse: { name: string; code: string };
    targetWarehouse: { name: string; code: string };
    items?: Array<{
      quantity: number | string;
      nomenclature?: { name: string; unit?: string };
    }>;
  } | null;
  onSuccess: () => void;
}

export default function TransferRejectDialog({
  open,
  onClose,
  transfer,
  onSuccess,
}: TransferRejectDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transfer) return null;

  const isInTransit = transfer.status === 'IN_TRANSIT';

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 3) {
      setError('Укажите подробную причину отклонения (не менее 3 символов)');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/wms/transfers/${transfer.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: trimmed }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setReason('');
        onSuccess();
        onClose();
      } else {
        setError(json.error || 'Ошибка отклонения перемещения');
      }
    } catch {
      setError('Ошибка сети при отправке запроса');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title={isInTransit ? 'Отклонение приемки ТМЦ' : 'Отклонение запроса на перемещение'}
      subtitle={`Перемещение № ${transfer.transferNumber}`}
      icon={<BlockIcon color="error" />}
      maxWidth="sm"
      loading={isSubmitting}
      submitLabel={isInTransit ? 'Отклонить приемку и вернуть ТМЦ' : 'Отклонить запрос'}
      submitColor="error"
      submitIcon={<BlockIcon />}
      onSubmit={handleSubmit}
      submitDisabled={isSubmitting || reason.trim().length < 3}
    >
      <Stack spacing={2.5}>
        <Alert severity="warning" sx={{ borderRadius: '8px' }}>
          {isInTransit ? (
            <Typography variant="body2">
              При отклонении приемки все позиции перемещения (<b>{transfer.items?.length || 0} поз.</b>) будут{' '}
              <b>автоматически возвращены</b> на баланс склада-отправителя «{transfer.sourceWarehouse.name}».
            </Typography>
          ) : (
            <Typography variant="body2">
              Запрос со склада «{transfer.targetWarehouse.name}» будет отклонен. ТМЦ не будут списаны с вашего склада.
            </Typography>
          )}
        </Alert>

        {error && (
          <Alert severity="error" sx={{ borderRadius: '8px' }}>
            {error}
          </Alert>
        )}

        <Box>
          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase' }}>
            Причина / основание отклонения (обязательно):
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            required
            autoFocus
            placeholder={
              isInTransit
                ? 'Например: Расхождение по факту, повреждена упаковка, брак при транспортировке, пересортица...'
                : 'Например: Отсутствует свободный резерв, ТМЦ запланированы для ТОиР на текущей неделе...'
            }
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            helperText={`${reason.length}/500 символов (минимум 3 символа)`}
          />
        </Box>
      </Stack>
    </FormDialog>
  );
}
