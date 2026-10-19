'use client';

import React from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  IconButton,
  Stack,
} from '@mui/material';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { StatusBadge } from '@/components/ui';
import { WarehouseItem } from './types';

const FONT_SEMI_BOLD = 600;
const FONT_BOLD = 700;

interface WarehouseTableProps {
  warehouses: WarehouseItem[];
  canManage: boolean;
  onEdit: (w: WarehouseItem) => void;
  onOpenTopology: (w: WarehouseItem) => void;
}

export function WarehouseTable({
  warehouses,
  canManage,
  onEdit,
  onOpenTopology,
}: WarehouseTableProps) {
  return (
    <Table size="small" aria-label="Таблица складов">
      <TableHead sx={{ bgcolor: 'background.default' }}>
        <TableRow>
          <TableCell sx={{ minWidth: 160, fontWeight: 700 }}>Наименование</TableCell>
          <TableCell sx={{ minWidth: 100, fontWeight: 700 }}>Код</TableCell>
          <TableCell sx={{ minWidth: 120, fontWeight: 700 }}>Статус</TableCell>
          <TableCell sx={{ minWidth: 160, fontWeight: 700 }}>Ответственный</TableCell>
          <TableCell align="right" sx={{ minWidth: 120, fontWeight: 700 }}>Позиций ТМЦ</TableCell>
          <TableCell align="right" sx={{ minWidth: 100, fontWeight: 700 }}>Операций</TableCell>
          <TableCell align="center" sx={{ minWidth: 100, fontWeight: 700 }}>Действия</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {warehouses.map((w) => (
          <TableRow key={w.id} hover>
            <TableCell sx={{ fontWeight: FONT_SEMI_BOLD, fontSize: '0.8125rem' }}>{w.name}</TableCell>
            <TableCell>
              <Chip label={w.code} size="small" variant="outlined" sx={{ borderRadius: '4px', fontWeight: FONT_SEMI_BOLD }} />
            </TableCell>
            <TableCell>
              <StatusBadge status={w.isActive ? 'ACTIVE' : 'DRAFT'} />
            </TableCell>
            <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {w.responsibleUser?.displayName || '—'}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: FONT_BOLD, fontFeatureSettings: '"tnum"' }}>
              {w._count.stockItems}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: FONT_BOLD, fontFeatureSettings: '"tnum"' }}>
              {w._count.operations}
            </TableCell>
            <TableCell align="center">
              <Stack direction="row" spacing={1} justifyContent="center">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MeetingRoomOutlinedIcon />}
                  onClick={() => onOpenTopology(w)}
                  sx={{ borderRadius: '6px', fontSize: '0.6875rem', textTransform: 'none' }}
                >
                  Топология
                </Button>
                {canManage && (
                  <IconButton size="small" onClick={() => onEdit(w)} aria-label="Редактировать склад">
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
