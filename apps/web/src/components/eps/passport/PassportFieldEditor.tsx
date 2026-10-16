'use client';

import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
} from '@mui/material';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { StatusBadge, DatePickerField } from '@/components/ui';
import { CustomFieldDef } from './types';

interface PassportFieldEditorProps {
  field: CustomFieldDef;
  value: any;
  onChange: (val: any) => void;
}

export function PassportFieldEditor({ field, value, onChange }: PassportFieldEditorProps) {
  const currentValue = value ?? '';

  if (field.fieldType === 'BOOLEAN') {
    return (
      <Grid item xs={12} sm={6} key={field.key}>
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(currentValue)}
                onChange={(e) => onChange(e.target.checked)}
                color="primary"
              />
            }
            label={<Typography variant="body2">{field.name}</Typography>}
          />
        </Paper>
      </Grid>
    );
  }

  if (field.key === 'status') {
    return (
      <Grid item xs={12} sm={6} key={field.key}>
        <FormControl fullWidth size="small">
          <InputLabel id={`edit-status-${field.key}`}>Статус оборудования</InputLabel>
          <Select
            labelId={`edit-status-${field.key}`}
            label="Статус оборудования"
            value={currentValue || 'ACTIVE'}
            onChange={(e) => onChange(e.target.value)}
          >
            {Object.entries(EQUIPMENT_STATUS_MAP).map(([k]) => (
              <MenuItem key={k} value={k}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusBadge status={k} />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    );
  }

  if (field.fieldType === 'DATE' || field.key === 'commissionDate' || field.key === 'commission_date') {
    return (
      <Grid item xs={12} sm={6} key={field.key}>
        <DatePickerField
          label={field.isRequired ? `${field.name} *` : field.name}
          value={currentValue ? String(currentValue).substring(0, 10) : ''}
          onChange={(val) => onChange(val || '')}
          size="small"
          fullWidth
          required={field.isRequired}
          error={field.isRequired && !currentValue ? 'Обязательное поле паспорта' : undefined}
        />
      </Grid>
    );
  }

  if (field.fieldType === 'SELECT' && field.options && Array.isArray(field.options)) {
    return (
      <Grid item xs={12} sm={6} key={field.key}>
        <TextField
          select
          label={field.isRequired ? `${field.name} *` : field.name}
          required={field.isRequired}
          error={Boolean(field.isRequired && !currentValue)}
          helperText={field.isRequired && !currentValue ? 'Обязательное поле паспорта' : undefined}
          fullWidth
          size="small"
          value={currentValue || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <MenuItem value="">— Не выбрано —</MenuItem>
          {field.options.map((opt: string) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    );
  }

  if (field.fieldType === 'TEXTAREA') {
    return (
      <Grid item xs={12} key={field.key}>
        <TextField
          label={field.isRequired ? `${field.name} *` : field.name}
          required={field.isRequired}
          error={Boolean(field.isRequired && !currentValue)}
          helperText={field.isRequired && !currentValue ? 'Обязательное поле паспорта' : undefined}
          fullWidth
          multiline
          rows={3}
          size="small"
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
        />
      </Grid>
    );
  }

  return (
    <Grid item xs={12} sm={6} key={field.key}>
      <TextField
        type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
        label={field.isRequired ? `${field.name} *` : field.name}
        required={field.isRequired}
        error={Boolean(field.isRequired && !currentValue)}
        helperText={field.isRequired && !currentValue ? 'Обязательное поле паспорта' : undefined}
        fullWidth
        size="small"
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
      />
    </Grid>
  );
}
