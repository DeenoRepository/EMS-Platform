'use client';

import React from 'react';
import {
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { FormDialog } from '@/components/ui';
import { InventoryWarehouseOption } from './types';

interface CreateInventoryDialogProps {
  open: boolean;
  warehouses: InventoryWarehouseOption[];
  selectedWarehouseId: string;
  comment: string;
  isSubmitting: boolean;
  onClose: () => void;
  onWarehouseChange: (val: string) => void;
  onCommentChange: (val: string) => void;
  onSubmit: () => void;
}

export function CreateInventoryDialog({
  open,
  warehouses,
  selectedWarehouseId,
  comment,
  isSubmitting,
  onClose,
  onWarehouseChange,
  onCommentChange,
  onSubmit,
}: CreateInventoryDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Инициализация инвентаризации"
      subtitle="Создание описи фактического наличия ТМЦ и фиксация учетных остатков"
      icon={<FactCheckOutlinedIcon color="primary" />}
      maxWidth="sm"
      loading={isSubmitting}
      submitLabel={isSubmitting ? 'Создание...' : 'Начать инвентаризацию'}
      onSubmit={onSubmit}
      submitDisabled={isSubmitting || !selectedWarehouseId}
    >
      <Stack spacing={2.5}>
        <FormControl fullWidth required>
          <InputLabel id="inventory-warehouse-select-label">Склад проведения инвентаризации</InputLabel>
          <Select
            labelId="inventory-warehouse-select-label"
            value={selectedWarehouseId}
            label="Склад проведения инвентаризации *"
            onChange={(e) => onWarehouseChange(e.target.value)}
          >
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name} ({w.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Основание / Приказ / Примечание"
          placeholder="например: Приказ №12 от 15.10.2026 плановая полугодовая ревизия..."
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          multiline
          rows={3}
        />
      </Stack>
    </FormDialog>
  );
}
