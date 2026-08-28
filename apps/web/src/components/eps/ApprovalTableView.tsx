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
  Paper,
  Button,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui';
import { formatDateTime } from '@ems/shared';

export interface ApprovalTableItem {
  id: string;
  equipmentId: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  proposedData: Record<string, unknown> | null;
  requesterId: string;
  reviewerId: string | null;
  reviewedAt: string | null;
  resolutionComment: string | null;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    manufacturer?: string | null;
    model?: string | null;
    location?: string | null;
    status?: string;
  } | null;
  requester: {
    id: string;
    displayName: string;
    ldapLogin?: string;
  };
  reviewer: {
    id: string;
    displayName: string;
    ldapLogin?: string;
  } | null;
}

export type ApprovalSortField = 'title' | 'inventoryNumber' | 'equipment' | 'type' | 'status' | 'requester' | 'date' | 'reviewer';
export type ApprovalSortDirection = 'asc' | 'desc';

interface ApprovalTableViewProps {
  items: ApprovalTableItem[];
  visibleColumns: string[];
  sortField: ApprovalSortField;
  sortDirection: ApprovalSortDirection;
  currentUserId?: string;
  canReview: boolean;
  onRequestSort: (field: ApprovalSortField) => void;
  onSelectReview: (item: ApprovalTableItem) => void;
  onSelectDetails: (item: ApprovalTableItem) => void;
  onRevoke: (item: ApprovalTableItem) => void;
}

export function ApprovalTableView({
  items,
  visibleColumns,
  sortField,
  sortDirection,
  currentUserId,
  canReview,
  onRequestSort,
  onSelectReview,
  onSelectDetails,
  onRevoke,
}: ApprovalTableViewProps) {
  const router = useRouter();

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: 'background.default' }}>
          {visibleColumns.includes('title') && (
            <TableCell sx={{ minWidth: 210 }}>
              <TableSortLabel
                active={sortField === 'title'}
                direction={sortField === 'title' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('title')}
              >
                Тема / заявка
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('inventoryNumber') && (
            <TableCell sx={{ width: 140 }}>
              <TableSortLabel
                active={sortField === 'inventoryNumber'}
                direction={sortField === 'inventoryNumber' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('inventoryNumber')}
              >
                Инв. №
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
          {visibleColumns.includes('manufacturer') && (
            <TableCell sx={{ minWidth: 120 }}>
              Производитель
            </TableCell>
          )}
          {visibleColumns.includes('type') && (
            <TableCell sx={{ minWidth: 150 }}>
              <TableSortLabel
                active={sortField === 'type'}
                direction={sortField === 'type' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('type')}
              >
                Тип
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('status') && (
            <TableCell sx={{ minWidth: 130 }}>
              <TableSortLabel
                active={sortField === 'status'}
                direction={sortField === 'status' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('status')}
              >
                Статус
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('requester') && (
            <TableCell sx={{ minWidth: 150 }}>
              <TableSortLabel
                active={sortField === 'requester'}
                direction={sortField === 'requester' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('requester')}
              >
                Инициатор
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('date') && (
            <TableCell sx={{ minWidth: 130 }}>
              <TableSortLabel
                active={sortField === 'date'}
                direction={sortField === 'date' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('date')}
              >
                Дата подачи
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('reviewer') && (
            <TableCell sx={{ minWidth: 160 }}>
              <TableSortLabel
                active={sortField === 'reviewer'}
                direction={sortField === 'reviewer' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('reviewer')}
              >
                Решение / автор
              </TableSortLabel>
            </TableCell>
          )}
          {visibleColumns.includes('actions') && (
            <TableCell align="right" sx={{ minWidth: 110 }}>
              Действия
            </TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((app) => {
          const isPending = app.status === 'PENDING';
          const isRequester = currentUserId === app.requesterId;

          return (
            <TableRow
              key={app.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => onSelectDetails(app)}
            >
              {visibleColumns.includes('title') && (
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.8125rem' }}>
                    {app.title}
                  </Typography>
                  {app.proposedData?.targetStatus ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Целевой статус:
                      </Typography>
                      <StatusBadge status={String(app.proposedData.targetStatus)} size="small" variant="outlined" />
                    </Box>
                  ) : null}
                </TableCell>
              )}

              {visibleColumns.includes('inventoryNumber') && (
                <TableCell sx={{ width: 120 }}>
                  {app.equipment?.inventoryNumber ? (
                    <Paper
                      variant="outlined"
                      sx={{
                        display: 'inline-block',
                        px: 0.85,
                        py: 0.2,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        bgcolor: 'background.default',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        color: 'text.secondary',
                        borderColor: 'divider',
                        lineHeight: 1.3,
                      }}
                    >
                      {app.equipment.inventoryNumber}
                    </Paper>
                  ) : (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  )}
                </TableCell>
              )}

              {visibleColumns.includes('equipment') && (
                <TableCell>
                  {app.equipment ? (
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        if (app.equipment?.id) {
                          router.push(`/eps/${app.equipment.id}`);
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 0.35,
                        '&:hover .equipment-name': { color: 'primary.main', textDecoration: 'underline' },
                      }}
                    >
                      <Typography
                        className="equipment-name"
                        variant="body2"
                        fontWeight={600}
                        sx={{ fontSize: '0.8125rem', color: 'text.primary', lineHeight: 1.35 }}
                      >
                        {app.equipment.name}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              )}

              {visibleColumns.includes('manufacturer') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  {app.equipment?.manufacturer || '—'}
                </TableCell>
              )}

              {visibleColumns.includes('type') && (
                <TableCell>
                  <StatusBadge status={app.type} />
                </TableCell>
              )}

              {visibleColumns.includes('status') && (
                <TableCell>
                  <StatusBadge status={app.status} />
                </TableCell>
              )}

              {visibleColumns.includes('requester') && (
                <TableCell>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                    {app.requester.displayName}
                  </Typography>
                </TableCell>
              )}

              {visibleColumns.includes('date') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {formatDateTime(app.createdAt)}
                </TableCell>
              )}

              {visibleColumns.includes('reviewer') && (
                <TableCell>
                  {app.reviewer ? (
                    <Box>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                        {app.reviewer.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {app.reviewedAt ? formatDateTime(app.reviewedAt) : ''}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Не рассмотрено
                    </Typography>
                  )}
                </TableCell>
              )}

              {visibleColumns.includes('actions') && (
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  {isPending && canReview ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={() => onSelectReview(app)}
                      sx={{ fontSize: '0.75rem', px: 1.25, py: 0.25, borderRadius: '6px' }}
                    >
                      Решение
                    </Button>
                  ) : isPending && isRequester ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={() => onRevoke(app)}
                      sx={{ fontSize: '0.75rem', px: 1, borderRadius: '6px' }}
                    >
                      Отозвать
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => onSelectDetails(app)}
                      sx={{ fontSize: '0.75rem', borderRadius: '6px' }}
                    >
                      Детали
                    </Button>
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

export default ApprovalTableView;
