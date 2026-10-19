'use client';

import React from 'react';
import {
  Stack,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import { FormDialog } from '@/components/ui';

interface ReportSaveTemplateDialogProps {
  open: boolean;
  name: string;
  description: string;
  isPublic: boolean;
  saving: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (desc: string) => void;
  onIsPublicChange: (val: boolean) => void;
  onSubmit: () => void;
}

export function ReportSaveTemplateDialog({
  open,
  name,
  description,
  isPublic,
  saving,
  onClose,
  onNameChange,
  onDescriptionChange,
  onIsPublicChange,
  onSubmit,
}: ReportSaveTemplateDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Сохранить шаблон ведомости"
      subtitle="Сохранение текущего набора колонок и критериев фильтрации для быстрого доступа"
      icon={<BookmarkAddOutlinedIcon color="primary" />}
      maxWidth="xs"
      loading={saving}
      submitLabel={saving ? 'Сохранение...' : 'Сохранить шаблон'}
      onSubmit={onSubmit}
      submitDisabled={saving || !name.trim()}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          fullWidth
          required
          size="small"
          label="Наименование шаблона"
          placeholder="например, Отчет по износу цеха №2"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />

        <TextField
          fullWidth
          size="small"
          label="Краткое описание"
          placeholder="Для квартальной отчетности главного механика"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          multiline
          rows={2}
        />

        <FormControlLabel
          control={
            <Switch
              checked={isPublic}
              onChange={(e) => onIsPublicChange(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2">
              Доступен всем сотрудникам предприятия
            </Typography>
          }
        />
      </Stack>
    </FormDialog>
  );
}
