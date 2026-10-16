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
  Button,
  Stack,
  Box,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import { ApprovalItem } from './types';

const FONT_SEMI_BOLD = 600;

interface ApprovalRegistryTableProps {
  items: ApprovalItem[];
  visibleColumns: string[];
  canApprove: boolean;
  loading: boolean;
  currentUserId?: string;
  onOpenReview: (item: ApprovalItem, action: 'APPROVED' | 'REJECTED') => void;
  onViewDetails: (item: ApprovalItem) => void;
  onNavigateToEquipment: (id: string) => void;
  onResetFilters: () => void;
  hasFilters: boolean;
  onOpenCreateWizard: () => void;
}

export function ApprovalRegistryTable({
  items,
  visibleColumns,
  canApprove,
  loading,
  currentUserId,
  onOpenReview,
  onViewDetails,
  onNavigateToEquipment,
  onResetFilters,
  hasFilters,
  onOpenCreateWizard,
}: ApprovalRegistryTableProps) {
  if (items.length === 0 && !loading) {
    return (
      <EmptyState
        title="Заявки не найдены"
        description={
          hasFilters
            ? 'По заданным критериям фильтрации заявки отсутствуют.'
            : 'В очереди согласований сейчас нет активных заявок.'
        }
        actionText={hasFilters ? 'Сбросить фильтры' : 'Создать заявку'}
        onAction={hasFilters ? onResetFilters : onOpenCreateWizard}
      />
    );
  }

  return (
    <Table size="small" aria-label="Очередь согласований оборудования">
      <TableHead sx={{ bgcolor: 'background.default' }}>
        <TableRow>
          {visibleColumns.includes('title') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 240 }}>Тема заявки</TableCell>
          )}
          {visibleColumns.includes('type') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Тип операции</TableCell>
          )}
          {visibleColumns.includes('status') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Статус</TableCell>
          )}
          {visibleColumns.includes('equipment') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Оборудование</TableCell>
          )}
          {visibleColumns.includes('requester') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Инициатор</TableCell>
          )}
          {visibleColumns.includes('reviewer') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Рецензент</TableCell>
          )}
          {visibleColumns.includes('createdAt') && (
            <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Дата подачи</TableCell>
          )}
          {visibleColumns.includes('actions') && (
            <TableCell align="right" sx={{ fontWeight: 700, minWidth: 160 }}>Действия</TableCell>
          )}
        </TableRow>
      </TableHead>

      <TableBody>
        {items.map((app) => {
          const isPending = app.status === 'PENDING';
          const isOwnRequest = app.requesterId === currentUserId;
          const showApproveButtons = canApprove && isPending && !isOwnRequest;

          return (
            <TableRow key={app.id} hover>
              {visibleColumns.includes('title') && (
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: FONT_SEMI_BOLD,
                      color: 'primary.main',
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={() => onViewDetails(app)}
                  >
                    {app.title}
                  </Typography>
                  {app.description && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }} noWrap>
                      {app.description}
                    </Typography>
                  )}
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

              {visibleColumns.includes('equipment') && (
                <TableCell>
                  {app.equipment ? (
                    <Chip
                      icon={<PrecisionManufacturingIcon sx={{ fontSize: '13px !important' }} />}
                      label={app.equipment.name}
                      size="small"
                      clickable
                      onClick={() => onNavigateToEquipment(app.equipment!.id)}
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

              {visibleColumns.includes('requester') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  {app.requester?.displayName || '—'}
                </TableCell>
              )}

              {visibleColumns.includes('reviewer') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  {app.reviewer?.displayName || '—'}
                </TableCell>
              )}

              {visibleColumns.includes('createdAt') && (
                <TableCell sx={{ fontSize: '0.8125rem', fontFeatureSettings: '"tnum"', color: 'text.secondary' }}>
                  {formatDateTime(app.createdAt)}
                </TableCell>
              )}

              {visibleColumns.includes('actions') && (
                <TableCell align="right">
                  <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                    {showApproveButtons ? (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                          onClick={() => onOpenReview(app, 'APPROVED')}
                          sx={{ fontSize: '0.75rem', py: 0.3, fontWeight: FONT_SEMI_BOLD, borderRadius: '6px', textTransform: 'none' }}
                        >
                          Одобрить
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                          onClick={() => onOpenReview(app, 'REJECTED')}
                          sx={{ fontSize: '0.75rem', py: 0.3, fontWeight: FONT_SEMI_BOLD, borderRadius: '6px', textTransform: 'none' }}
                        >
                          Отклонить
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                        onClick={() => onViewDetails(app)}
                        sx={{ fontSize: '0.75rem', py: 0.3, fontWeight: FONT_SEMI_BOLD, borderRadius: '6px', textTransform: 'none' }}
                      >
                        Детали
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
