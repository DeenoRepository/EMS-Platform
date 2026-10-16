'use client';

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { StatusBadge } from '@/components/ui';
import { formatDate } from '@ems/shared';
import { isTruthyBoolean } from '@/lib/eps-helpers';
import { CustomFieldDef } from './types';

const FONT_SEMI_BOLD = 600;
const FONT_BOLD = 700;
const MAX_PERCENTAGE = 100;
const WEAR_CRITICAL = 70;
const WEAR_WARNING = 30;

interface PassportFieldRendererProps {
  field: CustomFieldDef;
  value: any;
  onCopy?: (text: string, label: string) => void;
}

export function PassportFieldRenderer({ field, value, onCopy }: PassportFieldRendererProps) {
  if (value === undefined || value === null || value === '') {
    if (field.isRequired) {
      return (
        <Chip
          size="small"
          label="Не заполнено *"
          color="warning"
          variant="outlined"
          sx={{ height: 20, fontSize: '0.6875rem', fontWeight: FONT_SEMI_BOLD }}
        />
      );
    }
    return <Typography variant="caption" color="text.disabled">—</Typography>;
  }

  if (field.fieldType === 'BOOLEAN') {
    const isTrue = isTruthyBoolean(value);
    return (
      <Chip
        size="small"
        label={isTrue ? 'Да' : 'Нет'}
        color={isTrue ? 'primary' : 'default'}
        variant={isTrue ? 'filled' : 'outlined'}
        sx={{ height: 22, fontWeight: FONT_SEMI_BOLD, fontSize: '0.75rem', borderRadius: '5px' }}
      />
    );
  }

  if (field.fieldType === 'DATE') {
    return (
      <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"', fontWeight: 500 }}>
        {formatDate(value)}
      </Typography>
    );
  }

  if (field.key === 'criticality') {
    const crit = String(value).toUpperCase();
    return (
      <StatusBadge
        status={`CLASS_${crit}`}
        label={`Класс ${value}`}
        size="small"
      />
    );
  }

  if (field.key.includes('wear') || field.key.includes('iznos')) {
    const num = Number(value);
    const color = num > WEAR_CRITICAL ? 'error.main' : num > WEAR_WARNING ? 'warning.main' : 'success.main';
    return (
      <Box sx={{ width: '100%', maxWidth: 180 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: FONT_BOLD, color, fontFeatureSettings: '"tnum"' }}>
            {num}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {num > WEAR_CRITICAL ? 'Критичный износ' : num > WEAR_WARNING ? 'Средний износ' : 'В норме'}
          </Typography>
        </Box>
        <Box sx={{ width: '100%' }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(MAX_PERCENTAGE, Math.max(0, num))}
            color={num > WEAR_CRITICAL ? 'error' : num > WEAR_WARNING ? 'warning' : 'success'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      </Box>
    );
  }

  const isCodeLike =
    field.key.includes('code') ||
    field.key.includes('number') ||
    field.key.includes('kod') ||
    field.key.includes('nomer');

  if (isCodeLike) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <Paper
          variant="outlined"
          sx={{
            px: 1,
            py: 0.2,
            fontFamily: 'monospace',
            fontWeight: FONT_BOLD,
            bgcolor: 'background.default',
            fontSize: '0.8125rem',
            borderRadius: '5px',
            color: 'text.primary',
            borderColor: 'divider',
            lineHeight: 1.4,
          }}
        >
          {String(value)}
        </Paper>
        {onCopy && (
          <Tooltip title={`Скопировать ${field.name}`}>
            <IconButton
              size="small"
              sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
              onClick={() => onCopy(String(value), field.name)}
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <Typography variant="body2" fontWeight={FONT_SEMI_BOLD}>
        {String(value)}
      </Typography>
      {field.unit && (
        <Chip
          label={field.unit}
          size="small"
          variant="outlined"
          sx={{ height: 19, fontSize: '0.65rem', fontWeight: FONT_BOLD }}
        />
      )}
    </Box>
  );
}
