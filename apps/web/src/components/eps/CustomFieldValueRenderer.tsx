'use client';

import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { StatusBadge } from '@/components/ui';

export interface CustomFieldValueDefinition {
  key: string;
  name: string;
  fieldType: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  unit: string | null;
}

export interface CustomFieldValueRendererProps {
  field: CustomFieldValueDefinition;
  value: unknown;
  onCopy: (text: string, label: string) => void;
}

export function CustomFieldValueRenderer({
  field,
  value,
  onCopy,
}: CustomFieldValueRendererProps) {
  if (value === undefined || value === null || value === '') {
    return <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>;
  }

  if (field.fieldType === 'BOOLEAN' || typeof value === 'boolean') {
    const boolValue = Boolean(value);
    let label = boolValue ? 'Да' : 'Нет';
    if (field.key.includes('import')) label = boolValue ? 'Да (Импорт)' : 'Нет (Отечественное)';
    else if (field.key.includes('unique')) label = boolValue ? 'Да (Уникальное)' : 'Нет (Серийное)';
    else if (field.key.includes('critical_path')) label = boolValue ? 'Да (Критический путь)' : 'Нет';

    return (
      <StatusBadge
        status={boolValue ? (field.key.includes('critical_path') ? 'ERROR' : 'SUCCESS') : 'DEFAULT'}
        label={label}
        size="small"
      />
    );
  }

  if (field.key === 'criticality' || field.key === 'kategoriya_kritichnosti') {
    const stringValue = String(value);
    const isCritical = stringValue === 'A' || stringValue.includes('Высокая') || stringValue.includes('А');
    const isMedium = stringValue === 'B' || stringValue.includes('Средняя') || stringValue.includes('В');

    return (
      <StatusBadge
        status={isCritical ? 'ERROR' : isMedium ? 'WARNING' : 'INFO'}
        label={stringValue.startsWith('Категория') ? stringValue : `Категория ${stringValue}`}
        size="small"
      />
    );
  }

  const numericValue = Number(value);
  if (
    field.key === 'actual_wear_percentage' ||
    field.key === 'fakticheskiy_protsent_iznosa' ||
    (field.unit === '%' && !Number.isNaN(numericValue))
  ) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, maxWidth: 260 }}>
        <Typography variant="body2" fontWeight={700} sx={{ minWidth: 38 }}>
          {numericValue}%
        </Typography>
        <Box sx={{ flexGrow: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, numericValue))}
            color={numericValue > 70 ? 'error' : numericValue > 30 ? 'warning' : 'success'}
            sx={{ height: 7, borderRadius: 4 }}
          />
        </Box>
      </Box>
    );
  }

  if (
    field.key.includes('code') ||
    field.key.includes('number') ||
    field.key.includes('kod') ||
    field.key.includes('nomer')
  ) {
    const stringValue = String(value);

    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <Paper
          variant="outlined"
          sx={{
            px: 1,
            py: 0.2,
            fontFamily: 'monospace',
            fontWeight: 700,
            bgcolor: 'background.default',
            fontSize: '0.8125rem',
            borderRadius: '5px',
            color: 'text.primary',
            borderColor: 'grey.400',
            lineHeight: 1.4,
          }}
        >
          {stringValue}
        </Paper>
        <Tooltip title={`Скопировать ${field.name}`}>
          <IconButton
            size="small"
            sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
            onClick={() => onCopy(stringValue, field.name)}
          >
            <ContentCopyIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <Typography variant="body2" fontWeight={600}>
        {String(value)}
      </Typography>
      {field.unit && (
        <Chip
          label={field.unit}
          size="small"
          variant="outlined"
          sx={{ height: 19, fontSize: '0.65rem', fontWeight: 700 }}
        />
      )}
    </Box>
  );
}
