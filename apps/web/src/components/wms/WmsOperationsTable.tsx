'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import WmsOperationRecipientBadge, { StockOperationSummary } from './WmsOperationRecipientBadge';

export interface StockOperationRecord extends StockOperationSummary {
  id: string;
  date: string;
  document?: string | null;
  warehouse: { id: string; name: string; code: string };
  createdBy: { displayName: string; ldapLogin: string };
}

interface WmsOperationsTableProps {
  operations: StockOperationRecord[];
  visibleColumns: string[];
  canCreateOperation: boolean;
  onOpenWizard: () => void;
}

export function WmsOperationsTable({
  operations,
  visibleColumns,
  canCreateOperation,
  onOpenWizard,
}: WmsOperationsTableProps) {
  return (
    <Table sx={{ minWidth: 800 }}>
      <TableHead sx={{ backgroundColor: 'background.paper' }}>
        <TableRow>
          {visibleColumns.includes('date') && (
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
              Дата / Время
            </TableCell>
          )}
          {visibleColumns.includes('type') && (
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
              Тип операции
            </TableCell>
          )}
          {visibleColumns.includes('warehouse') && (
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
              Склад
            </TableCell>
          )}
          {visibleColumns.includes('items') && (
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
              Позиции ТМЦ и количество
            </TableCell>
          )}
          {visibleColumns.includes('recipient') && (
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
              Назначение / Получатель / Оборудование
            </TableCell>
          )}
          {visibleColumns.includes('comment') && (
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
              Примечание
            </TableCell>
          )}
          {visibleColumns.includes('executor') && (
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
              Исполнитель
            </TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {operations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={visibleColumns.length} sx={{ py: 6 }}>
              <EmptyState
                icon={<SwapHorizIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
                title="Операций не найдено"
                description="В журнале пока нет записей о движении ТМЦ, соответствующих выбранным фильтрам."
                actionText={canCreateOperation ? 'Оформить операцию через мастер' : undefined}
                actionIcon={<AutoAwesomeIcon />}
                onAction={canCreateOperation ? onOpenWizard : undefined}
                minHeight={200}
              />
            </TableCell>
          </TableRow>
        ) : (
          operations.map((op) => (
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
                    sx={{
                      fontWeight: 600,
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      backgroundColor: 'background.paper',
                      color: 'text.secondary',
                      border: '1px solid',
                      borderColor: 'divider',
                      height: 20,
                    }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.disabled', fontSize: '0.75rem' }}>
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
                  <WmsOperationRecipientBadge op={op} />
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
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    {op.createdBy?.displayName}
                  </Typography>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export default WmsOperationsTable;
