'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { FormDialog } from '@/components/ui';
import { APPROVAL_TYPE_MAP, EQUIPMENT_STATUS_MAP } from '@ems/shared';

interface PassportCreateApprovalDialogProps {
  open: boolean;
  equipmentName?: string;
  inventoryNumber?: string | null;
  approvalType: string;
  targetStatus: string;
  title: string;
  description: string;
  submitting: boolean;
  onClose: () => void;
  onTypeChange: (type: string) => void;
  onTargetStatusChange: (status: string) => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (desc: string) => void;
  onSubmit: () => void;
}

export function PassportCreateApprovalDialog({
  open,
  equipmentName,
  inventoryNumber,
  approvalType,
  targetStatus,
  title,
  description,
  submitting,
  onClose,
  onTypeChange,
  onTargetStatusChange,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
}: PassportCreateApprovalDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Создание заявки на согласование"
      icon={<FactCheckOutlinedIcon color="primary" />}
      maxWidth="sm"
      loading={submitting}
      submitLabel={submitting ? 'Отправка...' : 'Подать заявку'}
      onSubmit={onSubmit}
      submitDisabled={!title.trim() || submitting}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Оборудование:
          </Typography>
          <Typography variant="subtitle2" fontWeight={700}>
            {equipmentName} • Инв. №: {inventoryNumber || 'Б/Н'}
          </Typography>
        </Paper>

        <TextField
          select
          size="small"
          label="Тип согласования"
          value={approvalType}
          onChange={(e) => onTypeChange(e.target.value)}
          fullWidth
          required
        >
          {Object.entries(APPROVAL_TYPE_MAP).map(([k, label]) => (
            <MenuItem key={k} value={k}>
              {label}
            </MenuItem>
          ))}
        </TextField>

        {approvalType === 'STATUS_CHANGE' && (
          <TextField
            select
            size="small"
            label="Целевой рабочий статус"
            value={targetStatus}
            onChange={(e) => onTargetStatusChange(e.target.value)}
            fullWidth
            required
          >
            {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, info]) => (
              <MenuItem key={k} value={k}>
                {info.label}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          label="Тема заявки"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          size="small"
          fullWidth
          required
          placeholder="Например: Согласование акта списания в связи с износом"
        />

        <TextField
          label="Обоснование / Описание"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          multiline
          rows={3}
          size="small"
          fullWidth
          placeholder="Укажите подробную причину, номер служебной записки или дефектной ведомости..."
        />
      </Box>
    </FormDialog>
  );
}
