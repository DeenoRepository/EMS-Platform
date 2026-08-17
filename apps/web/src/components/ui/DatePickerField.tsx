'use client';

import React from 'react';
import {
  Box,
  TextField,
  Button,
  ButtonGroup,
  Typography,
  IconButton,
  InputAdornment,
  Popover,
  Paper,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ClearIcon from '@mui/icons-material/Clear';

export interface DatePickerFieldProps {
  label: string;
  value: string | null;
  onChange: (date: string | null) => void;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePickerField({
  label,
  value,
  onChange,
  size = 'small',
  fullWidth = true,
  required = false,
  error,
  helperText,
  minDate,
  maxDate,
  disabled = false,
  className,
}: DatePickerFieldProps) {
  return (
    <TextField
      type="date"
      label={label}
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      size={size}
      fullWidth={fullWidth}
      required={required}
      error={Boolean(error)}
      helperText={error || helperText}
      disabled={disabled}
      className={className}
      InputLabelProps={{ shrink: true }}
      inputProps={{ min: minDate, max: maxDate }}
      InputProps={{
        endAdornment: value && !disabled ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={() => onChange(null)}
              edge="end"
              aria-label="Очистить дату"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
    />
  );
}

export interface DateRangeValue {
  startDate: string | null;
  endDate: string | null;
}

export interface DateRangePreset {
  label: string;
  getRange: () => DateRangeValue;
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  label?: string;
  size?: 'small' | 'medium';
  showPresets?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  label,
  size = 'small',
  showPresets = true,
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const formatDateStr = (d: Date): string => {
    return d.toISOString().split('T')[0];
  };

  const defaultPresets: DateRangePreset[] = [
    {
      label: 'Сегодня',
      getRange: () => {
        const today = formatDateStr(new Date());
        return { startDate: today, endDate: today };
      },
    },
    {
      label: '7 дней',
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return { startDate: formatDateStr(start), endDate: formatDateStr(end) };
      },
    },
    {
      label: '30 дней',
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return { startDate: formatDateStr(start), endDate: formatDateStr(end) };
      },
    },
    {
      label: 'Этот месяц',
      getRange: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { startDate: formatDateStr(start), endDate: formatDateStr(end) };
      },
    },
    {
      label: 'Квартал',
      getRange: () => {
        const now = new Date();
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), qMonth, 1);
        const end = new Date(now.getFullYear(), qMonth + 3, 0);
        return { startDate: formatDateStr(start), endDate: formatDateStr(end) };
      },
    },
  ];

  const handleApplyPreset = (preset: DateRangePreset) => {
    onChange(preset.getRange());
    setAnchorEl(null);
  };

  const handleClear = () => {
    onChange({ startDate: null, endDate: null });
  };

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {label && (
        <Typography variant="caption" fontWeight={600} color="text.secondary">
          {label}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          type="date"
          label="С даты"
          size={size}
          value={value.startDate || ''}
          onChange={(e) => onChange({ ...value, startDate: e.target.value || null })}
          InputLabelProps={{ shrink: true }}
          disabled={disabled}
          sx={{ minWidth: 140, flex: 1 }}
        />

        <Typography variant="body2" color="text.secondary">
          —
        </Typography>

        <TextField
          type="date"
          label="По дату"
          size={size}
          value={value.endDate || ''}
          onChange={(e) => onChange({ ...value, endDate: e.target.value || null })}
          InputLabelProps={{ shrink: true }}
          disabled={disabled}
          sx={{ minWidth: 140, flex: 1 }}
        />

        {showPresets && (
          <>
            <Button
              variant="outlined"
              size={size}
              startIcon={<CalendarMonthIcon sx={{ fontSize: 16, color: '#0284c7' }} />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              disabled={disabled}
              sx={{
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                borderColor: '#e2e8f0',
                color: '#334155',
                backgroundColor: '#ffffff',
                fontWeight: 600,
                px: 1.5,
                py: 0.6,
                minHeight: 36,
                '&:hover': {
                  borderColor: '#cbd5e1',
                  backgroundColor: '#f8fafc',
                },
              }}
            >
              Период
            </Button>

            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              PaperProps={{
                sx: {
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
                  mt: 0.5,
                },
              }}
            >
              <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {defaultPresets.map((p) => (
                  <Button
                    key={p.label}
                    size="small"
                    variant="text"
                    onClick={() => handleApplyPreset(p)}
                    sx={{
                      justifyContent: 'flex-start',
                      px: 1.5,
                      py: 0.6,
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: '#334155',
                      borderRadius: '6px',
                      '&:hover': {
                        backgroundColor: '#f1f5f9',
                        color: '#0f172a',
                      },
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </Paper>
            </Popover>
          </>
        )}

        {(value.startDate || value.endDate) && !disabled && (
          <IconButton size="small" onClick={handleClear} title="Сбросить период" sx={{ color: '#94a3b8', '&:hover': { color: '#dc2626' } }}>
            <ClearIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
