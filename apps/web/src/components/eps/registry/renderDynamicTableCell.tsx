'use client';

import React from 'react';
import { Typography, Chip } from '@mui/material';
import { StatusBadge } from '@/components/ui';
import { formatDate } from '@ems/shared';
import { isTruthyBoolean, getEquipmentFieldValue } from '@/lib/eps-helpers';
import { EquipmentItem } from './types';

export function renderDynamicTableCell(eq: EquipmentItem, colId: string): React.ReactNode {
  const val = getEquipmentFieldValue(eq, colId);

  if (colId === 'status') {
    return <StatusBadge status={eq.status} />;
  }

  if (colId === 'criticality') {
    const crit = String(val || '').trim().toUpperCase();
    if (!crit) return <Typography variant="caption" color="text.disabled">—</Typography>;
    return (
      <StatusBadge
        status={`CLASS_${crit}`}
        label={`Класс ${crit}`}
        size="small"
      />
    );
  }

  if (colId === 'actualWear' || colId === 'actual_wear_percentage') {
    if (val === undefined || val === null || val === '') {
      return <Typography variant="caption" color="text.disabled">—</Typography>;
    }
    const num = Number(val);
    const color = num >= 70 ? 'error.main' : num >= 40 ? 'warning.main' : 'success.main';
    return (
      <Typography variant="body2" sx={{ fontWeight: 700, color, fontSize: '0.8125rem' }}>
        {num}%
      </Typography>
    );
  }

  if (colId === 'is_unique' || colId === 'is_imported' || colId === 'is_critical_path') {
    const isTrue = isTruthyBoolean(val);
    return (
      <Chip
        label={isTrue ? 'Да' : 'Нет'}
        size="small"
        variant="outlined"
        color={isTrue ? 'primary' : 'default'}
        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px' }}
      />
    );
  }

  if (colId === 'commissionDate' || colId === 'commission_date') {
    return formatDate(val || eq.commissionDate);
  }

  if (colId === 'updatedAt' || colId === 'createdAt') {
    return formatDate(val);
  }

  if (colId === 'serialNumber') {
    return val ? (
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
        {String(val)}
      </Typography>
    ) : (
      '—'
    );
  }

  return val !== undefined && val !== null && val !== '' ? String(val) : '—';
}
