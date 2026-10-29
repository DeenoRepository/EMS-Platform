'use client';

import React from 'react';
import { Stack, TextField } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import { FormDialog } from '@/components/ui';

interface CreateCellDialogProps {
  open: boolean;
  onClose: () => void;
  zoneName?: string;
  zoneCode?: string;
  cellCode: string;
  cellName: string;
  isLoading: boolean;
  onCellCodeChange: (val: string) => void;
  onCellNameChange: (val: string) => void;
  onSubmit: () => void;
}

export function CreateCellDialog({
  open,
  onClose,
  zoneName,
  zoneCode,
  cellCode,
  cellName,
  isLoading,
  onCellCodeChange,
  onCellNameChange,
  onSubmit,
}: CreateCellDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={() => !isLoading && onClose()}
      title="Добавление ячейки хранения"
      subtitle={`Зона: ${zoneName || ''} (${zoneCode || ''})`}
      icon={<GridViewIcon color="primary" />}
      maxWidth="xs"
      loading={isLoading}
      submitLabel={isLoading ? 'Добавление...' : 'Добавить ячейку'}
      onSubmit={onSubmit}
      submitDisabled={isLoading || !cellCode.trim()}
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField
          fullWidth
          required
          label="Код ячейки / Адрес"
          placeholder="например, A-01-02-1"
          value={cellCode}
          onChange={(e) => onCellCodeChange(e.target.value)}
          helperText="Формат: Ряд-Стеллаж-Ярус-Место"
        />
        <TextField
          fullWidth
          label="Понятное название / Описание (опционально)"
          placeholder="Верхняя полка правый контейнер"
          value={cellName}
          onChange={(e) => onCellNameChange(e.target.value)}
        />
      </Stack>
    </FormDialog>
  );
}
