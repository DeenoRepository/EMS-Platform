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
  Chip,
  Button,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import { InventoryItemSummary } from './types';

const FONT_SEMI_BOLD = 600;

interface InventoryRegistryTableProps {
  items: InventoryItemSummary[];
  visibleColumns: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  loading: boolean;
  onRequestSort: (field: string) => void;
  onOpenDetails: (id: string) => void;
  onOpenCountSheet: (inv: InventoryItemSummary) => void;
  onResetFilters: () => void;
  hasFilters: boolean;
  canManage: boolean;
  onOpenCreate: () => void;
}

export function InventoryRegistryTable({
  items,
  visibleColumns,
  sortField,
  sortDirection,
  loading,
  onRequestSort,
  onOpenDetails,
  onOpenCountSheet,
  onResetFilters,
  hasFilters,
  canManage,
  onOpenCreate,
}: InventoryRegistryTableProps) {
  if (items.length === 0 && !loading) {
    return (
      <EmptyState
        title="Акты инвентаризации не найдены"
        description={
          hasFilters
            ? 'По заданным параметрам поиска ничего не найдено.'
            : 'Инвентаризации на складах еще не проводились.'
        }
        actionText={hasFilters ? 'Сбросить фильтры' : canManage ? 'Создать акт инвентаризации' : undefined}
        onAction={hasFilters ? onResetFilters : canManage ? onOpenCreate : undefined}
      />
    );
  }

  return (
    <Table size="small" aria-label="Журнал актов инвентаризации">
      <TableHead sx={{ bgcolor: 'background.default' }}>
        <TableRow>
          {visibleColumns.includes('code') && (
            <TableCell sx={{ minWidth: 150 }}>
              <TableSortLabel
                active={sortField === 'code'}
                direction={sortField === 'code' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('code')}
              >
                Номер / Акт
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('warehouse') && (
            <TableCell sx={{ minWidth: 160 }}>
              <TableSortLabel
                active={sortField === 'warehouse'}
                direction={sortField === 'warehouse' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('warehouse')}
              >
                Склад
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('status') && (
            <TableCell sx={{ minWidth: 140 }}>
              <TableSortLabel
                active={sortField === 'status'}
                direction={sortField === 'status' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('status')}
              >
                Статус
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('count') && (
            <TableCell align="right" sx={{ minWidth: 130 }}>
              <TableSortLabel
                active={sortField === 'count'}
                direction={sortField === 'count' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('count')}
              >
                Позиций в акте
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('date') && (
            <TableCell sx={{ minWidth: 150 }}>
              <TableSortLabel
                active={sortField === 'date'}
                direction={sortField === 'date' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('date')}
              >
                Дата создания
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('author') && (
            <TableCell sx={{ minWidth: 150 }}>
              <TableSortLabel
                active={sortField === 'author'}
                direction={sortField === 'author' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('author')}
              >
                Ответственный
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('actions') && (
            <TableCell align="right" sx={{ minWidth: 150, fontWeight: 700 }}>
              Действия
            </TableCell>
          )}
        </TableRow>
      </TableHead>

      <TableBody>
        {items.map((inv) => (
          <TableRow
            key={inv.id}
            hover
            onClick={() => onOpenDetails(inv.id)}
            sx={{ cursor: 'pointer' }}
          >
            {visibleColumns.includes('code') && (
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: FONT_SEMI_BOLD, color: 'primary.main' }}>
                  {`INV-${inv.id.slice(-6).toUpperCase()}`}
                </Typography>
                {inv.comment && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }} noWrap>
                    {inv.comment}
                  </Typography>
                )}
              </TableCell>
            )}

            {visibleColumns.includes('warehouse') && (
              <TableCell>
                <Chip
                  label={inv.warehouse.code}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: '4px',
                    fontWeight: FONT_SEMI_BOLD,
                    fontSize: '0.6875rem',
                    height: 20,
                  }}
                />
                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary', fontSize: '0.75rem' }}>
                  {inv.warehouse.name}
                </Typography>
              </TableCell>
            )}

            {visibleColumns.includes('status') && (
              <TableCell>
                <StatusBadge status={inv.status} />
              </TableCell>
            )}

            {visibleColumns.includes('count') && (
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                  {inv._count.items}
                </Typography>
              </TableCell>
            )}

            {visibleColumns.includes('date') && (
              <TableCell sx={{ fontSize: '0.8125rem', fontFeatureSettings: '"tnum"', color: 'text.secondary' }}>
                {formatDateTime(inv.createdAt)}
              </TableCell>
            )}

            {visibleColumns.includes('author') && (
              <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                {inv.createdBy?.displayName || '—'}
              </TableCell>
            )}

            {visibleColumns.includes('actions') && (
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 13 }} />}
                  onClick={() => onOpenDetails(inv.id)}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: FONT_SEMI_BOLD,
                    borderRadius: '6px',
                    textTransform: 'none',
                    py: 0.3,
                  }}
                >
                  Пересчет
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
