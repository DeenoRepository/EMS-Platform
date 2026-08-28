'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import { AuditLogItem, RenderChangesDiff } from './AuditDiffModal';

interface AuditLogTableViewProps {
  items: AuditLogItem[];
  visibleColumns: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onRequestSort: (field: string) => void;
  onOpenDiff: (log: AuditLogItem) => void;
}

export function AuditLogTableView({
  items,
  visibleColumns,
  sortField,
  sortDirection,
  onRequestSort,
  onOpenDiff,
}: AuditLogTableViewProps) {
  const router = useRouter();

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ backgroundColor: 'background.paper' }}>
          {visibleColumns.includes('createdAt') && (
            <TableCell sx={{ minWidth: 160 }}>
              <TableSortLabel
                active={sortField === 'createdAt'}
                direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('createdAt')}
              >
                Дата и время
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('user') && (
            <TableCell sx={{ minWidth: 160 }}>
              <TableSortLabel
                active={sortField === 'user'}
                direction={sortField === 'user' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('user')}
              >
                Пользователь
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('action') && (
            <TableCell sx={{ minWidth: 130 }}>
              <TableSortLabel
                active={sortField === 'action'}
                direction={sortField === 'action' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('action')}
              >
                Действие
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('entityType') && (
            <TableCell sx={{ minWidth: 150 }}>
              <TableSortLabel
                active={sortField === 'entityType'}
                direction={sortField === 'entityType' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('entityType')}
              >
                Сущность
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('equipment') && (
            <TableCell sx={{ minWidth: 180 }}>
              <TableSortLabel
                active={sortField === 'equipment'}
                direction={sortField === 'equipment' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('equipment')}
              >
                Оборудование
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('changes') && (
            <TableCell sx={{ minWidth: 200 }}>
              Детализация изменений
            </TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((log) => {
          const eq = log.equipment;
          const hasDiff = log.changes && Object.keys(log.changes).length > 0;

          return (
            <TableRow key={log.id} hover>
              {visibleColumns.includes('createdAt') && (
                <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', whiteSpace: 'nowrap', color: 'text.disabled' }}>
                  {formatDateTime(log.createdAt)}
                </TableCell>
              )}

              {visibleColumns.includes('user') && (
                <TableCell>
                  {log.user ? (
                    <Box>
                      <Typography variant="body2" fontWeight={600} fontSize="0.8125rem" sx={{ color: 'text.primary' }}>
                        {log.user.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {log.user.ldapLogin}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Система
                    </Typography>
                  )}
                </TableCell>
              )}

              {visibleColumns.includes('action') && (
                <TableCell>
                  <StatusBadge status={log.action} />
                </TableCell>
              )}

              {visibleColumns.includes('entityType') && (
                <TableCell>
                  <StatusBadge status={log.entityType} size="small" variant="outlined" />
                </TableCell>
              )}

              {visibleColumns.includes('equipment') && (
                <TableCell>
                  {eq ? (
                    <Box
                      onClick={() => eq.id && router.push(`/eps/${eq.id}`)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover .eq-link': { color: 'primary.main', textDecoration: 'underline' },
                      }}
                    >
                      <Typography className="eq-link" variant="body2" fontWeight={600} fontSize="0.8125rem" sx={{ color: 'text.primary' }}>
                        {eq.name}
                      </Typography>
                      {eq.inventoryNumber && (
                        <Typography variant="caption" color="text.secondary">
                          Инв. № {eq.inventoryNumber}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              )}

              {visibleColumns.includes('changes') && (
                <TableCell>
                  {hasDiff ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <RenderChangesDiff changes={log.changes} />
                      </Box>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => onOpenDiff(log)}
                        sx={{ fontSize: '0.75rem', textTransform: 'none', flexShrink: 0 }}
                      >
                        Подробнее
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default AuditLogTableView;
