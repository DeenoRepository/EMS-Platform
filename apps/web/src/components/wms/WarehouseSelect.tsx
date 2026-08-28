'use client';

import React from 'react';
import {
  TextField,
  MenuItem,
  Box,
  Typography,
  Chip,
  type TextFieldProps,
} from '@mui/material';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import type { WarehouseOption } from '@/hooks/useWarehouseAccess';

export interface WarehouseSelectProps extends Omit<TextFieldProps, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  warehouses: WarehouseOption[];
  isAdmin?: boolean;
  currentUserId?: string;
  allLabel?: string;
  showAllOption?: boolean;
  size?: 'small' | 'medium';
}

export function WarehouseSelect({
  value,
  onChange,
  warehouses,
  isAdmin = false,
  currentUserId,
  allLabel = 'Все склады предприятия',
  showAllOption = true,
  size = 'small',
  disabled,
  sx,
  ...rest
}: WarehouseSelectProps) {
  return (
    <TextField
      select
      size={size}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      SelectProps={{
        displayEmpty: true,
      }}
      sx={{
        minWidth: 200,
        backgroundColor: 'background.paper',
        '& .MuiOutlinedInput-root': {
          borderRadius: '8px',
          fontSize: '0.8125rem',
          height: size === 'small' ? 36 : 40,
          '& fieldset': { borderColor: 'divider' },
          '&:hover fieldset': { borderColor: 'divider' },
        },
        ...sx,
      }}
      {...rest}
    >
      {showAllOption && (
        <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>
          <em>{allLabel}</em>
        </MenuItem>
      )}
      {warehouses.map((w) => {
        const isMine = Boolean(currentUserId && w.responsibleUserId === currentUserId);
        return (
          <MenuItem key={w.id} value={w.id} sx={{ fontSize: '0.8125rem' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: isMine ? 600 : 400 }}>
                {w.name} ({w.code})
              </Typography>
              {isMine && (
                <Chip
                  label="Мой склад"
                  size="small"
                  color="primary"
                  sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700 }}
                />
              )}
            </Box>
          </MenuItem>
        );
      })}
    </TextField>
  );
}

export default WarehouseSelect;
