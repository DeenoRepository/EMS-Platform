'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { FormDialog } from '@/components/ui';
import { ResponsibleUserSelect, type AuthorizedUser } from '@/components/eps';

interface PassportChangeRespDialogProps {
  open: boolean;
  equipmentName?: string;
  inventoryNumber?: string | null;
  currentRespPerson?: string | null;
  newRespName: string;
  saving: boolean;
  onClose: () => void;
  onNameChange: (name: string, user: AuthorizedUser | null) => void;
  onSubmit: () => void;
}

export function PassportChangeRespDialog({
  open,
  equipmentName,
  inventoryNumber,
  currentRespPerson,
  newRespName,
  saving,
  onClose,
  onNameChange,
  onSubmit,
}: PassportChangeRespDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Смена ответственного лица (МОЛ)"
      subtitle={`Оборудование: ${equipmentName} (Инв. № ${inventoryNumber || 'Б/Н'})`}
      icon={<PersonOutlineIcon color="primary" />}
      maxWidth="sm"
      actions={
        <>
          <Button onClick={onClose} color="inherit" size="small">
            Отмена
          </Button>
          <Button
            variant="contained"
            size="small"
            color="primary"
            disabled={saving || !newRespName.trim()}
            onClick={onSubmit}
          >
            {saving ? <CircularProgress size={16} /> : 'Назначить ответственного'}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Текущий ответственный в паспорте:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {currentRespPerson || 'Не назначен'}
          </Typography>
        </Box>

        <ResponsibleUserSelect
          label="Новое ответственное лицо (МОЛ)"
          value={newRespName}
          onChange={(name, user) => onNameChange(name, user || null)}
          required
        />

        <Typography variant="caption" color="text.secondary">
          Сотрудник выбирается из базы авторизованных пользователей проекта. При сохранении изменение фиксируется в журнале аудита паспорта оборудования.
        </Typography>
      </Box>
    </FormDialog>
  );
}
