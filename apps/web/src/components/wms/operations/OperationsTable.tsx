'use client';

import React from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import { StockOperation } from './types';
import { OperationRecipientBadge } from './OperationRecipientBadge';

const FONT_SEMI_BOLD = 600;

interface OperationsTableProps {
  operations: StockOperation[];
  visibleColumns: string[];
  loading: boolean;
  onOpenWizard: () => void;
}

export function OperationsTable({
  operations,
  visibleColumns,
  loading,
  onOpenWizard,
}: OperationsTableProps) {
  if (operations.length === 0 && !loading) {
    return (
      <EmptyState
        title="Складские операции не найдены"
        description="За выбранный период или по заданным фильтрам операции отсутствуют."
        actionText="Оформить операцию"
        onAction={onOpenWizard}
      />
    );
  }

  return (
    <Table size="small" aria-label="Журнал складских операций">
      <TableHead>
        <TableRow sx={{ bgcolor: 'background.default' }}>
          {visibleColumns.includes('date') && (
            <TableCell sx={{ fontWeight: 700, width: 140 }}>Дата / Время</TableCell>
          )}
          {visibleColumns.includes('type') && (
            <TableCell sx={{ fontWeight: 700, width: 150 }}>Тип операции</TableCell>
          )}
          {visibleColumns.includes('warehouse') && (
            <TableCell sx={{ fontWeight: 700, width: 180 }}>Склад</TableCell>
          )}
          {visibleColumns.includes('items') && (
            <TableCell sx={{ fontWeight: 700 }}>Позиции и количество</TableCell>
          )}
          {visibleColumns.includes('recipient') && (
            <TableCell sx={{ fontWeight: 700 }}>Получатель / Назначение</TableCell>
          )}
          {visibleColumns.includes('comment') && (
            <TableCell sx={{ fontWeight: 700 }}>Примечание</TableCell>
          )}
          {visibleColumns.includes('executor') && (
            <TableCell sx={{ fontWeight: 700, width: 140 }}>Исполнитель</TableCell>
          )}
        </TableRow>
      </TableHead>

      <TableBody>
        {operations.map((op) => (
          <TableRow key={op.id} hover>
            {visibleColumns.includes('date') && (
              <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.8125rem', color: 'text.secondary' }}>
                {formatDateTime(op.date)}
              </TableCell>
            )}

            {visibleColumns.includes('type') && (
              <TableCell>
                <StatusBadge status={op.type} />
              </TableCell>
            )}

            {visibleColumns.includes('warehouse') && (
              <TableCell>
                <Chip
                  label={op.warehouse.code}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontWeight: FONT_SEMI_BOLD,
                    borderRadius: '4px',
                    fontSize: '0.6875rem',
                    height: 20,
                  }}
                />
                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary', fontSize: '0.75rem' }}>
                  {op.warehouse.name}
                </Typography>
              </TableCell>
            )}

            {visibleColumns.includes('items') && (
              <TableCell>
                <Stack spacing={0.5}>
                  {op.items.map((it) => (
                    <Typography key={it.id} variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
                      <b>{it.nomenclature.name}</b>: {it.quantity} {it.nomenclature.unit}
                    </Typography>
                  ))}
                </Stack>
              </TableCell>
            )}

            {visibleColumns.includes('recipient') && (
              <TableCell>
                <OperationRecipientBadge op={op} />
              </TableCell>
            )}

            {visibleColumns.includes('comment') && (
              <TableCell>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  {op.comment || '—'}
                </Typography>
              </TableCell>
            )}

            {visibleColumns.includes('executor') && (
              <TableCell sx={{ fontSize: '0.8125rem' }}>
                <Typography variant="body2" fontWeight={500} color="text.secondary">
                  {op.createdBy?.displayName}
                </Typography>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
