'use client';

import React from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDate } from '@ems/shared';
import { ReportColumn } from './types';

const FONT_SEMI_BOLD = 600;
const FONT_BOLD = 700;

interface ReportPreviewTableProps {
  columns: ReportColumn[];
  rows: Record<string, any>[];
  sortField: string;
  sortOrder: 'asc' | 'desc';
  loading: boolean;
  onRequestSort: (field: string) => void;
  onResetFilters: () => void;
  hasFilters: boolean;
}

export function ReportPreviewTable({
  columns,
  rows,
  sortField,
  sortOrder,
  loading,
  onRequestSort,
  onResetFilters,
  hasFilters,
}: ReportPreviewTableProps) {
  if (rows.length === 0 && !loading) {
    return (
      <EmptyState
        title="Нет данных для отчета"
        description={
          hasFilters
            ? 'По заданным критериям фильтрации оборудование не найдено.'
            : 'В реестре пока нет записей оборудования для формирования ведомости.'
        }
        actionText={hasFilters ? 'Сбросить фильтры' : undefined}
        onAction={hasFilters ? onResetFilters : undefined}
        minHeight={200}
      />
    );
  }

  return (
    <Table size="small" aria-label="Таблица отчета оборудования">
      <TableHead sx={{ bgcolor: 'background.default' }}>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, width: 60, textAlign: 'center' }}>№</TableCell>
          {columns.map((col) => (
            <TableCell key={col.key} sx={{ fontWeight: 700, minWidth: 150 }}>
              <TableSortLabel
                active={sortField === col.key}
                direction={sortField === col.key ? sortOrder : 'asc'}
                onClick={() => onRequestSort(col.key)}
              >
                {col.name}
              </TableSortLabel>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={row.id || idx} hover>
            <TableCell sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.75rem', fontFeatureSettings: '"tnum"' }}>
              {idx + 1}
            </TableCell>
            {columns.map((col) => {
              const val = row[col.key];

              if (col.key === 'status') {
                return (
                  <TableCell key={col.key}>
                    <StatusBadge status={String(val || 'ACTIVE')} />
                  </TableCell>
                );
              }

              if (col.key === 'commissionDate') {
                return (
                  <TableCell key={col.key} sx={{ fontSize: '0.8125rem', fontFeatureSettings: '"tnum"' }}>
                    {val && val !== '—' ? (typeof val === 'string' && val.includes('.') ? val : formatDate(val)) : '—'}
                  </TableCell>
                );
              }

              if (col.key === 'actual_wear_percentage' && val !== null && val !== undefined) {
                const num = Number(val);
                const color = num > 70 ? 'error.main' : num > 30 ? 'warning.main' : 'success.main';
                return (
                  <TableCell key={col.key}>
                    <Typography variant="body2" sx={{ fontWeight: FONT_BOLD, color, fontFeatureSettings: '"tnum"' }}>
                      {num}%
                    </Typography>
                  </TableCell>
                );
              }

              if (typeof val === 'boolean') {
                return (
                  <TableCell key={col.key}>
                    <Typography variant="body2" fontWeight={FONT_SEMI_BOLD} color={val ? 'primary.main' : 'text.disabled'}>
                      {val ? 'Да' : 'Нет'}
                    </Typography>
                  </TableCell>
                );
              }

              return (
                <TableCell key={col.key} sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
                  {val !== null && val !== undefined && val !== '' ? String(val) : '—'}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
