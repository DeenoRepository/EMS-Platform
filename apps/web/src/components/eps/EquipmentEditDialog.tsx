'use client';

import React from 'react';
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { DatePickerField, FormDialog, StatusBadge } from '@/components/ui';
import type { CustomSectionDef, EquipmentDetails } from '@/app/eps/[id]/page';

export type EquipmentEditForm = {
  name?: string;
  inventoryNumber?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  status?: string;
  commissionDate?: string;
};

interface EquipmentEditDialogProps {
  open: boolean;
  equipment: EquipmentDetails;
  sections: CustomSectionDef[];
  unassignedFields: CustomSectionDef['fields'];
  editForm: EquipmentEditForm;
  editCustomFields: Record<string, unknown>;
  onClose: () => void;
  onSave: (submitForApproval: boolean) => void | Promise<void>;
  onFormChange: (form: EquipmentEditForm) => void;
  onCustomFieldChange: (key: string, value: unknown) => void;
}

export function EquipmentEditDialog({
  open,
  equipment,
  sections,
  unassignedFields,
  editForm,
  editCustomFields,
  onClose,
  onSave,
  onFormChange,
  onCustomFieldChange,
}: EquipmentEditDialogProps) {
  const updateForm = (field: keyof EquipmentEditForm, value: string) => {
    onFormChange({ ...editForm, [field]: value });
  };

  const renderCustomField = (field: CustomSectionDef['fields'][number]) => {
    if (field.fieldType === 'BOOLEAN') {
      return (
        <Grid item xs={12} sm={6} key={field.key}>
          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(editCustomFields[field.key])}
                  onChange={(event) => onCustomFieldChange(field.key, event.target.checked)}
                  color="primary"
                />
              }
              label={<Typography variant="body2">{field.name}</Typography>}
            />
          </Paper>
        </Grid>
      );
    }

    if (field.fieldType === 'SELECT' && field.options && Array.isArray(field.options)) {
      return (
        <Grid item xs={12} sm={6} key={field.key}>
          <TextField
            select
            label={field.name}
            fullWidth
            size="small"
            value={editCustomFields[field.key] || ''}
            onChange={(event) => onCustomFieldChange(field.key, event.target.value)}
          >
            <MenuItem value="">— Не выбрано —</MenuItem>
            {field.options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      );
    }

    return (
      <Grid item xs={12} sm={6} key={field.key}>
        <TextField
          label={field.unit ? `${field.name} (${field.unit})` : field.name}
          type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'}
          InputLabelProps={field.fieldType === 'DATE' ? { shrink: true } : undefined}
          fullWidth
          size="small"
          value={editCustomFields[field.key] ?? ''}
          onChange={(event) => onCustomFieldChange(field.key, event.target.value)}
        />
      </Grid>
    );
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Редактирование паспорта оборудования"
      icon={<PrecisionManufacturingIcon color="primary" />}
      maxWidth="md"
      actions={
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Button variant="text" onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Отмена
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => onSave(false)}
              disabled={!editForm.name}
              sx={{ borderRadius: '8px', fontWeight: 600 }}
            >
              Сохранить в черновик
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => onSave(true)}
              disabled={!editForm.name}
              sx={{ borderRadius: '8px', fontWeight: 700 }}
            >
              Отправить на согласование
            </Button>
          </Box>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 2 }}>
            Основные параметры
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Наименование оборудования" fullWidth size="small" required value={editForm.name || ''} onChange={(event) => updateForm('name', event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Инвентарный номер" fullWidth size="small" value={editForm.inventoryNumber || ''} onChange={(event) => updateForm('inventoryNumber', event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Заводской / Серийный номер" fullWidth size="small" value={editForm.serialNumber || ''} onChange={(event) => updateForm('serialNumber', event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Производитель" fullWidth size="small" value={editForm.manufacturer || ''} onChange={(event) => updateForm('manufacturer', event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Модель" fullWidth size="small" value={editForm.model || ''} onChange={(event) => updateForm('model', event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Место установки (Локация)" fullWidth size="small" value={editForm.location || ''} onChange={(event) => updateForm('location', event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePickerField label="Дата ввода в эксплуатацию" value={editForm.commissionDate ? editForm.commissionDate.substring(0, 10) : ''} onChange={(value) => updateForm('commissionDate', value ?? '')} size="small" fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="edit-status-label">Статус оборудования</InputLabel>
                <Select labelId="edit-status-label" label="Статус оборудования" value={editForm.status || 'ACTIVE'} onChange={(event) => updateForm('status', event.target.value)}>
                  {Object.entries(EQUIPMENT_STATUS_MAP).map(([key]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusBadge status={key} />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {sections.map((section) => (
          <Box key={section.id}>
            <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 2 }}>
              {section.name}
            </Typography>
            <Grid container spacing={2}>{section.fields.map(renderCustomField)}</Grid>
          </Box>
        ))}

        {unassignedFields.length > 0 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.secondary" sx={{ mb: 2 }}>
              Дополнительные характеристики
            </Typography>
            <Grid container spacing={2}>{unassignedFields.map(renderCustomField)}</Grid>
          </Box>
        )}
      </Box>
    </FormDialog>
  );
}
