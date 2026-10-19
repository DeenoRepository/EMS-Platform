'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { FormDialog } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import { AuditLogItem, ENTITY_TYPE_LABELS } from './types';
import { formatAuditValue } from './AuditDiffViewer';

const FONT_SEMI_BOLD = 600;

interface AuditDetailsDialogProps {
  open: boolean;
  item: AuditLogItem | null;
  onClose: () => void;
}

export function AuditDetailsDialog({ open, item, onClose }: AuditDetailsDialogProps) {
  if (!item) return null;

  const changes = item.changes || {};
  const changeKeys = Object.keys(changes);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Детализация записи аудита"
      subtitle={`${ENTITY_TYPE_LABELS[item.entityType] || item.entityType} • ${formatDateTime(item.createdAt)}`}
      maxWidth="md"
      hideActions
    >
      <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {item.equipment && (
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Связанное оборудование:
            </Typography>
            <Typography variant="subtitle2" fontWeight={700}>
              {item.equipment.name} • Инв. №: {item.equipment.inventoryNumber || 'Б/Н'}
            </Typography>
          </Paper>
        )}

        <Typography variant="subtitle2" fontWeight={700}>
          Измененные поля и значения ({changeKeys.length}):
        </Typography>

        <Table size="small">
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: '30%' }}>Параметр</TableCell>
              <TableCell sx={{ fontWeight: 700, width: '35%' }}>Исходное значение</TableCell>
              <TableCell sx={{ fontWeight: 700, width: '35%' }}>Новое значение</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {changeKeys.map((k) => {
              const val = changes[k] as any;
              const isDiffObj = val && typeof val === 'object' && ('old' in val || 'new' in val);

              return (
                <TableRow key={k} hover>
                  <TableCell sx={{ fontWeight: FONT_SEMI_BOLD, color: 'text.secondary' }}>
                    {k}
                  </TableCell>
                  <TableCell sx={{ color: isDiffObj ? 'error.main' : 'text.disabled' }}>
                    {isDiffObj ? formatAuditValue(k, val.old) : '—'}
                  </TableCell>
                  <TableCell sx={{ color: isDiffObj ? 'success.main' : 'text.primary', fontWeight: 600 }}>
                    {isDiffObj ? formatAuditValue(k, val.new) : formatAuditValue(k, val)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </FormDialog>
  );
}
