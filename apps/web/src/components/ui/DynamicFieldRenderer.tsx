'use client';

import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Chip,
  InputAdornment,
} from '@mui/material';

export type DynamicFieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';

export interface DynamicFieldConfig {
  id?: string;
  name?: string;
  key?: string;
  label: string;
  fieldType: DynamicFieldType | string;
  options?: string[] | string | null;
  unit?: string | null;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
}

export interface DynamicFieldRendererProps {
  field: DynamicFieldConfig;
  value: any;
  onChange?: (value: any) => void;
  mode?: 'edit' | 'view';
  error?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  mode = 'edit',
  error,
  size = 'small',
  fullWidth = true,
  disabled = false,
  className,
}: DynamicFieldRendererProps) {
  const normType = (field.fieldType || 'TEXT').toUpperCase();

  // Parse select options if they are stored as JSON string or comma-separated
  const getOptions = (): string[] => {
    if (Array.isArray(field.options)) return field.options;
    if (typeof field.options === 'string') {
      try {
        const parsed = JSON.parse(field.options);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return field.options.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  // ----------------------------------------------------
  // VIEW MODE
  // ----------------------------------------------------
  if (mode === 'view') {
    const isValEmpty = value === null || value === undefined || value === '';

    if (isValEmpty) {
      return (
        <Typography variant="body2" color="text.secondary" className={className}>
          —
        </Typography>
      );
    }

    if (normType === 'BOOLEAN') {
      const boolVal = Boolean(value);
      return (
        <Chip
          label={boolVal ? 'Да' : 'Нет'}
          size="small"
          color={boolVal ? 'success' : 'default'}
          variant={boolVal ? 'filled' : 'outlined'}
          sx={{ height: 22, fontWeight: 600 }}
          className={className}
        />
      );
    }

    if (normType === 'SELECT') {
      return (
        <Chip
          label={String(value)}
          size="small"
          variant="outlined"
          sx={{ height: 22, fontWeight: 500 }}
          className={className}
        />
      );
    }

    if (normType === 'DATE') {
      const d = new Date(value);
      const dateText = isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('ru-RU');
      return (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }} className={className}>
          {dateText}
        </Typography>
      );
    }

    if (normType === 'NUMBER') {
      return (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFeatureSettings: '"tnum"' }} className={className}>
          {Number(value).toLocaleString('ru-RU')} {field.unit ? field.unit : ''}
        </Typography>
      );
    }

    return (
      <Typography variant="body2" className={className}>
        {String(value)} {field.unit ? field.unit : ''}
      </Typography>
    );
  }

  // ----------------------------------------------------
  // EDIT MODE
  // ----------------------------------------------------
  const handleChange = (newVal: any) => {
    if (onChange && !disabled) {
      onChange(newVal);
    }
  };

  if (normType === 'BOOLEAN') {
    return (
      <FormControlLabel
        className={className}
        control={
          <Switch
            checked={Boolean(value)}
            onChange={(e) => handleChange(e.target.checked)}
            disabled={disabled}
            size={size}
            color="primary"
          />
        }
        label={
          <Typography variant="body2" fontWeight={500}>
            {field.label} {field.required && '*'}
          </Typography>
        }
      />
    );
  }

  if (normType === 'SELECT') {
    const options = getOptions();
    return (
      <TextField
        select
        label={field.label}
        value={value ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled}
        required={field.required}
        error={Boolean(error)}
        helperText={error}
        className={className}
      >
        <MenuItem value="">
          <em>Не выбрано</em>
        </MenuItem>
        {options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (normType === 'DATE') {
    return (
      <TextField
        type="date"
        label={field.label}
        value={value ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled}
        required={field.required}
        error={Boolean(error)}
        helperText={error}
        InputLabelProps={{ shrink: true }}
        className={className}
      />
    );
  }

  if (normType === 'NUMBER') {
    return (
      <TextField
        type="number"
        label={field.label}
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          handleChange(val === '' ? '' : Number(val));
        }}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled}
        required={field.required}
        error={Boolean(error)}
        helperText={error}
        placeholder={field.placeholder}
        InputProps={{
          endAdornment: field.unit ? (
            <InputAdornment position="end">
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {field.unit}
              </Typography>
            </InputAdornment>
          ) : undefined,
        }}
        className={className}
      />
    );
  }

  if (normType === 'TEXTAREA') {
    return (
      <TextField
        multiline
        rows={3}
        label={field.label}
        value={value ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled}
        required={field.required}
        error={Boolean(error)}
        helperText={error}
        placeholder={field.placeholder}
        className={className}
      />
    );
  }

  // Default TEXT
  return (
    <TextField
      label={field.label}
      value={value ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      required={field.required}
      error={Boolean(error)}
      helperText={error}
      placeholder={field.placeholder}
      InputProps={{
        endAdornment: field.unit ? (
          <InputAdornment position="end">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {field.unit}
            </Typography>
          </InputAdornment>
        ) : undefined,
      }}
      className={className}
    />
  );
}
