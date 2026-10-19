'use client';

import React from 'react';
import {
  Stack,
  TextField,
  InputAdornment,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Box,
} from '@mui/material';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { FormDialog } from '@/components/ui';
import { WarehouseUserOption } from './types';

const FONT_SEMI_BOLD = 600;

interface WarehouseFormDialogProps {
  open: boolean;
  editingId: string | null;
  name: string;
  code: string;
  location: string;
  responsibleUserId: string;
  isActive: boolean;
  users: WarehouseUserOption[];
  isSubmitting: boolean;
  onClose: () => void;
  onNameChange: (val: string) => void;
  onCodeChange: (val: string) => void;
  onLocationChange: (val: string) => void;
  onResponsibleChange: (val: string) => void;
  onIsActiveChange: (val: boolean) => void;
  onGenerateCode: () => void;
  onSubmit: () => void;
}

export function WarehouseFormDialog({
  open,
  editingId,
  name,
  code,
  location,
  responsibleUserId,
  isActive,
  users,
  isSubmitting,
  onClose,
  onNameChange,
  onCodeChange,
  onLocationChange,
  onResponsibleChange,
  onIsActiveChange,
  onGenerateCode,
  onSubmit,
}: WarehouseFormDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editingId ? 'Редактирование склада' : 'Создание нового склада'}
      subtitle="Настройка параметров складского комплекса и ответственного персонала"
      icon={<WarehouseOutlinedIcon color="primary" />}
      maxWidth="sm"
      loading={isSubmitting}
      submitLabel={isSubmitting ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать склад'}
      onSubmit={onSubmit}
      submitDisabled={isSubmitting || !name.trim()}
    >
      <Stack spacing={2.25}>
        <TextField
          fullWidth
          required
          label="Наименование склада"
          placeholder="например, Центральный склад запчастей"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />

        <TextField
          fullWidth
          label="Складской код / Идентификатор"
          placeholder="WH-MAIN"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          helperText="Используется в накладных и адресах ячеек"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutoAwesomeIcon sx={{ fontSize: 16, color: 'secondary.main' }} />}
                  onClick={onGenerateCode}
                  sx={{
                    height: 36,
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontWeight: FONT_SEMI_BOLD,
                    fontSize: '0.8125rem',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      borderColor: 'secondary.main',
                      color: 'secondary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  Автокод
                </Button>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Местоположение / Локация"
          placeholder="Корпус 4, цех №1..."
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
        />

        <FormControl fullWidth>
          <InputLabel id="responsible-user-label">Ответственное лицо (Кладовщик)</InputLabel>
          <Select
            labelId="responsible-user-label"
            value={responsibleUserId}
            label="Ответственное лицо (Кладовщик)"
            onChange={(e) => onResponsibleChange(e.target.value)}
          >
            <MenuItem value="">
              <em>— Не назначен —</em>
            </MenuItem>
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.displayName} ({u.ldapLogin})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ pt: 0.5 }}>
          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => onIsActiveChange(e.target.checked)} color="primary" />}
            label={<Typography variant="body2" fontWeight={FONT_SEMI_BOLD} color="text.primary">Склад активен для проведения операций</Typography>}
          />
        </Box>
      </Stack>
    </FormDialog>
  );
}
