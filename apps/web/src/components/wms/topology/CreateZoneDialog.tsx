'use client';

import React from 'react';
import { Stack, TextField } from '@mui/material';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { FormDialog } from '@/components/ui';

interface CreateZoneDialogProps {
  open: boolean;
  onClose: () => void;
  name: string;
  code: string;
  description: string;
  isLoading: boolean;
  onNameChange: (val: string) => void;
  onCodeChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onSubmit: () => void;
}

export function CreateZoneDialog({
  open,
  onClose,
  name,
  code,
  description,
  isLoading,
  onNameChange,
  onCodeChange,
  onDescriptionChange,
  onSubmit,
}: CreateZoneDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={() => !isLoading && onClose()}
      title="Создание зоны хранения"
      subtitle="Определите новую секцию или стеллажный ряд склада"
      icon={<LayersOutlinedIcon color="primary" />}
      maxWidth="xs"
      loading={isLoading}
      submitLabel={isLoading ? 'Создание...' : 'Создать зону'}
      onSubmit={onSubmit}
      submitDisabled={isLoading || !name.trim() || !code.trim()}
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField
          fullWidth
          required
          label="Название зоны"
          placeholder="например, Зона метизов и РТИ"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <TextField
          fullWidth
          required
          label="Код зоны (префикс)"
          placeholder="ZONE-A или RACK-01"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
        />
        <TextField
          fullWidth
          multiline
          rows={2}
          label="Описание / Назначение"
          placeholder="Стеллажи 1-6 левой стороны цеха..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </Stack>
    </FormDialog>
  );
}
