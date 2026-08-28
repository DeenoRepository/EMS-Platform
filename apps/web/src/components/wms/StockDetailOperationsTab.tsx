'use client';

import React from 'react';
import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { formatDateTime } from '@ems/shared';
import { EmptyState, StatusBadge } from '@/components/ui';

interface StockOperationHistoryRecord {
  id: string;
  type: string;
  date?: string;
  createdAt?: string;
  items?: Array<{ quantity?: number | string }>;
}

interface StockDetailOperationsTabProps {
  activeTab: number;
  operations: StockOperationHistoryRecord[];
  loading: boolean;
  unit: string;
}

export function StockDetailOperationsTab({
  activeTab,
  operations,
  loading,
  unit,
}: StockDetailOperationsTabProps) {
  if (activeTab !== 2) return null;

  if (loading) {
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
        {operations.map((operation) => (
          <TableRow key={operation.id} hover>
            <TableCell sx={{ py: 1 }}>
              <StatusBadge status={operation.type} />
            </TableCell>
            <TableCell sx={{ py: 1, fontSize: '0.75rem', color: 'text.disabled' }}>
              {formatDateTime(operation.date || operation.createdAt)}
            </TableCell>
            <TableCell align="right" sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>
              {operation.items?.[0]?.quantity || '—'} {unit}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
