'use client';

import React from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  TextField,
} from '@mui/material';
import { StatusBadge, EmptyState } from '@/components/ui';
import { InventoryDetailItem, InventoryItemState } from './detail-types';

const FONT_SEMI_BOLD = 600;
const FONT_BOLD = 700;

interface InventoryComparisonTableProps {
  items: InventoryDetailItem[];
  itemsState: InventoryItemState[];
  isCompleted: boolean;
  diffOnly: boolean;
  onActualQtyChange: (itemId: string, val: string) => void;
  onCommentChange: (itemId: string, val: string) => void;
}

export function InventoryComparisonTable({
  items,
  itemsState,
  isCompleted,
  diffOnly,
  onActualQtyChange,
  onCommentChange,
}: InventoryComparisonTableProps) {
  const displayedItems = diffOnly
    ? items.filter((item) => {
        const state = itemsState.find((s) => s.id === item.id);
        const actual = state ? state.actualQty : Number(item.expectedQty);
        return actual !== Number(item.expectedQty);
      })
    : items;

  if (displayedItems.length === 0) {
    return (
      <EmptyState
        title="Расхождения не обнаружены"
        description="Фактические остатки по всем позициям полностью соответствуют учетным данным."
        minHeight={160}
      />
    );
  }

  return (
    <Table size="small" aria-label="Ведомость инвентаризации остатков">
      <TableHead sx={{ bgcolor: 'background.default' }}>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, width: 140 }}>Артикул</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Наименование номенклатуры</TableCell>
          <TableCell sx={{ fontWeight: 700, width: 160 }}>Категория</TableCell>
          <TableCell align="center" sx={{ fontWeight: 700, width: 140 }}>
            Учетный остаток
          </TableCell>
          <TableCell align="center" sx={{ fontWeight: 700, width: 180 }}>
            Фактический остаток
          </TableCell>
          <TableCell align="center" sx={{ fontWeight: 700, width: 160 }}>
            Расхождение (Дифф)
          </TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Примечание / Причина</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {displayedItems.map((item) => {
          const state = itemsState.find((s) => s.id === item.id) || {
            actualQty: Number(item.expectedQty),
            expectedQty: Number(item.expectedQty),
            comment: '',
          };

          const diff = state.actualQty - state.expectedQty;

          return (
            <TableRow
              key={item.id}
              hover
              sx={{
                bgcolor:
                  diff > 0
                    ? 'success.light'
                    : diff < 0
                    ? 'error.light'
                    : undefined,
              }}
            >
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: FONT_SEMI_BOLD }}>
                {item.nomenclature.article || '—'}
              </TableCell>
              <TableCell sx={{ fontWeight: FONT_SEMI_BOLD, color: 'text.primary' }}>
                {item.nomenclature.name}
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                {item.nomenclature.category?.name || '—'}
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight={FONT_BOLD}>
                  {item.expectedQty} {item.nomenclature.unit}
                </Typography>
              </TableCell>
              <TableCell align="center">
                {isCompleted ? (
                  <Typography variant="body2" fontWeight={FONT_BOLD}>
                    {item.actualQty} {item.nomenclature.unit}
                  </Typography>
                ) : (
                  <TextField
                    type="number"
                    size="small"
                    value={state.actualQty}
                    onChange={(e) => onActualQtyChange(item.id, e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <Typography variant="caption" color="text.secondary">
                          {item.nomenclature.unit}
                        </Typography>
                      ),
                    }}
                    sx={{ width: 130, bgcolor: 'background.paper', borderRadius: '6px' }}
                  />
                )}
              </TableCell>
              <TableCell align="center">
                {diff === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    0
                  </Typography>
                ) : diff > 0 ? (
                  <StatusBadge
                    status="SURPLUS"
                    label={`+${diff} ${item.nomenclature.unit}`}
                    size="small"
                  />
                ) : (
                  <StatusBadge
                    status="DEFICIT"
                    label={`${diff} ${item.nomenclature.unit}`}
                    size="small"
                  />
                )}
              </TableCell>
              <TableCell>
                {isCompleted ? (
                  <Typography variant="body2" color="text.secondary">
                    {item.comment || '—'}
                  </Typography>
                ) : (
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Причина расхождения..."
                    value={state.comment}
                    onChange={(e) => onCommentChange(item.id, e.target.value)}
                    sx={{ bgcolor: 'background.paper', borderRadius: '6px' }}
                  />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
