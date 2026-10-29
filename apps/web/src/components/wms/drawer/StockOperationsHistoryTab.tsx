'use client';

import React from 'react';
import {
  Box,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { EmptyState, StatusBadge } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import { StockDetailData } from '../StockDetailDrawer';

interface StockOperationsHistoryTabProps {
  operations: any[];
  isLoading: boolean;
  stockItem: StockDetailData;
}

export function StockOperationsHistoryTab({
  operations,
  isLoading,
  stockItem,
}: StockOperationsHistoryTabProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (operations.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
        title="История операций пуста"
        description="По данной позиции пока нет записей о движении на этом складе"
        minHeight={160}
      />
    );
  }

  return (
    <Table size="small">
      <TableHead sx={{ bgcolor: 'background.default' }}>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Тип</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Дата</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
            Кол-во
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {operations.map((op) => (
          <TableRow key={op.id} hover>
            <TableCell sx={{ py: 1 }}>
              <StatusBadge status={op.type} />
            </TableCell>
            <TableCell sx={{ py: 1, fontSize: '0.75rem', color: 'text.disabled' }}>
              {formatDateTime(op.date || op.createdAt)}
            </TableCell>
            <TableCell align="right" sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>
              {op.items?.find((i: any) => i.nomenclatureId === stockItem.nomenclatureId)?.quantity ??
                op.items?.[0]?.quantity ??
                '—'}{' '}
              {stockItem.unit}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
