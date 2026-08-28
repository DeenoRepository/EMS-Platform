'use client';

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import { FormDialog } from '@/components/ui';

interface ReportSaveTemplateDialogProps {
  open: boolean;
  name: string;
  description: string;
  isPublic: boolean;
  saving: boolean;
  selectedColumnsCount: number;
  onClose: () => void;
  onNameChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onPublicChange: (val: boolean) => void;
  onSave: () => void;
}

export function ReportSaveTemplateDialog({
  open,
  name,
  description,
  isPublic,
  saving,
  selectedColumnsCount,
  onClose,
  onNameChange,
  onDescriptionChange,
  onPublicChange,
  onSave,
}: ReportSaveTemplateDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={() => !saving && onClose()}
      title="Сохранение шаблона отчета"
      icon={<BookmarkAddOutlinedIcon color="primary" />}
      maxWidth="sm"
      submitLabel={saving ? 'Сохранение...' : 'Сохранить шаблон'}
      onSubmit={onSave}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Будет сохранен текущий набор из <strong>{selectedColumnsCount} колонок</strong> и активные фильтры для быстрого повторного использования.
        </Typography>

        <TextField
          fullWidth
          required
          size="small"
          label="Название шаблона"
          placeholder="Например: Годовая инвентаризация цеха №2"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />

        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          label="Описание (опционально)"
          placeholder="Укажите назначение шаблона..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={isPublic}
              onChange={(e) => onPublicChange(e.target.checked)}
            />
          }
          label={
            <Typography variant="body2">
              Сделать шаблон доступным для всех сотрудников предприятия
            </Typography>
          }
        />
      </Box>
    </FormDialog>
  );
}

export default ReportSaveTemplateDialog;
