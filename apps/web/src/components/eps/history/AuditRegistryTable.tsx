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
  Box,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import { AuditLogItem, ENTITY_TYPE_LABELS } from './types';
import { AuditDiffViewer } from './AuditDiffViewer';

const FONT_SEMI_BOLD = 600;

interface AuditRegistryTableProps {
  items: AuditLogItem[];
  visibleColumns: string[];
  loading: boolean;
  onOpenDetailsModal: (item: AuditLogItem) => void;
  onNavigateToEquipment: (id: string) => void;
  onResetFilters: () => void;
  hasFilters: boolean;
}

export function AuditRegistryTable({
  items,
  visibleColumns,
  loading,
  onOpenDetailsModal,
  onNavigateToEquipment,
  onResetFilters,
  hasFilters,
}: AuditRegistryTableProps) {
  if (items.length === 0 && !loading) {
    return (
      <EmptyState
        title="Записи аудита не найдены"
        description={
          hasFilters
            ? 'По заданным параметрам поиска событий не найдено.'
            : 'В журнале аудита пока нет зафиксированных операций.'
        }
        actionText={hasFilters ? 'Сбросить фильтры' : undefined}
        onAction={hasFilters ? onResetFilters : undefined}
      />
    );
  }

  return (
    <Table size="small" aria-label="Журнал аудита оборудования">
      <TableHead sx={{ bgcolor: 'background.default' }}>
        <TableRow>
          {visibleColumns.includes('date') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Дата / Время</TableCell>
          )}
          {visibleColumns.includes('action') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>Действие</TableCell>
          )}
          {visibleColumns.includes('entity') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Объект изменений</TableCell>
          )}
          {visibleColumns.includes('equipment') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Оборудование</TableCell>
          )}
          {visibleColumns.includes('details') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Детализация изменений</TableCell>
          )}
          {visibleColumns.includes('user') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Инициатор</TableCell>
          )}
        </TableRow>
      </TableHead>

      <TableBody>
        {items.map((log) => (
          <TableRow key={log.id} hover>
            {visibleColumns.includes('date') && (
              <TableCell sx={{ fontSize: '0.8125rem', fontFeatureSettings: '"tnum"', color: 'text.secondary' }}>
                {formatDateTime(log.createdAt)}
              </TableCell>
            )}

            {visibleColumns.includes('action') && (
              <TableCell>
                <StatusBadge status={log.action} />
              </TableCell>
            )}

            {visibleColumns.includes('entity') && (
              <TableCell>
                <Chip
                  label={ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: '4px', fontSize: '0.75rem', fontWeight: FONT_SEMI_BOLD }}
                />
              </TableCell>
            )}

            {visibleColumns.includes('equipment') && (
              <TableCell>
                {log.equipment ? (
                  <Chip
                    icon={<PrecisionManufacturingIcon sx={{ fontSize: '13px !important' }} />}
                    label={log.equipment.name}
                    size="small"
                    clickable
                    onClick={() => onNavigateToEquipment(log.equipment!.id)}
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  />
                ) : (
                  <Typography variant="caption" color="text.disabled">—</Typography>
                )}
              </TableCell>
            )}

            {visibleColumns.includes('details') && (
              <TableCell>
                <AuditDiffViewer
                  changes={log.changes}
                  onOpenDetailsModal={() => onOpenDetailsModal(log)}
                />
              </TableCell>
            )}

            {visibleColumns.includes('user') && (
              <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                <Typography variant="body2" fontWeight={500}>
                  {log.user?.displayName || 'Системный сервис'}
                </Typography>
                {log.ipAddress && (
                  <Typography variant="caption" color="text.disabled" sx={{ fontFeatureSettings: '"tnum"' }}>
                    IP: {log.ipAddress}
                  </Typography>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
