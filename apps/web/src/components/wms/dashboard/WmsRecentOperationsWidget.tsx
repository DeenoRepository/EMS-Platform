'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
  Stack,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { StatusBadge, EmptyState, DataTableWrapper } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import { OperationType } from '@/components/wms';
import { RecentStockOperation } from './types';

const FONT_SEMI_BOLD = 600;
const FONT_BOLD = 700;
const SKELETON_ROWS = 5;

function OperationRow({ op }: { op: RecentStockOperation }) {
  const firstItem = op.items[0];
  const otherCount = op.items.length - 1;

  return (
    <TableRow
      hover
      sx={{
        '&:hover': { bgcolor: 'action.hover' },
        '& td': { py: 1.25, borderColor: 'divider' },
      }}
    >
      <TableCell>
        <StatusBadge status={op.type} />
      </TableCell>
      <TableCell>
        <Typography variant="caption" color="text.secondary" sx={{ fontFeatureSettings: '"tnum"' }}>
          {formatDateTime(op.date)}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={op.warehouse.code}
          size="small"
          variant="outlined"
          sx={{ height: 20, fontSize: '0.6875rem', fontWeight: FONT_SEMI_BOLD, borderRadius: '4px' }}
        />
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500, fontSize: '0.8125rem', color: 'text.primary', maxWidth: 200 }}>
            {firstItem?.nomenclature.name || '—'}
          </Typography>
          {otherCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
              и ещё {otherCount} поз.
            </Typography>
          )}
          {firstItem?.equipment && (
            <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontSize: '0.6875rem', fontWeight: 500 }}>
              → {firstItem.equipment.name}
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" sx={{ fontWeight: FONT_BOLD, fontSize: '0.8125rem', fontFeatureSettings: '"tnum"', color: 'text.primary' }}>
          {firstItem ? `${firstItem.quantity} ${firstItem.nomenclature.unit}` : '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="caption" noWrap color="text.secondary" sx={{ maxWidth: 120, display: 'block' }}>
          {op.createdBy.displayName}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

interface WmsRecentOperationsWidgetProps {
  operations: RecentStockOperation[];
  loading: boolean;
  onNavigate: (path: string) => void;
  onOpenWizard: (type: OperationType) => void;
}

export function WmsRecentOperationsWidget({
  operations,
  loading,
  onNavigate,
  onOpenWizard,
}: WmsRecentOperationsWidgetProps) {
  return (
    <Card sx={{ height: '100%', borderRadius: '12px', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={FONT_BOLD} color="text.primary">
              Оперативное движение ТМЦ
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Последние проводки и материальные потоки
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => onNavigate('/wms/operations')}
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            sx={{ fontWeight: FONT_SEMI_BOLD, fontSize: '0.75rem', textTransform: 'none' }}
          >
            Журнал операций
          </Button>
        </Box>

        <Box sx={{ flex: 1 }}>
          {loading ? (
            <Stack spacing={1}>
              {[...Array(SKELETON_ROWS)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={44} sx={{ borderRadius: '8px' }} />
              ))}
            </Stack>
          ) : operations.length > 0 ? (
            <DataTableWrapper total={operations.length}>
              <Table size="small" aria-label="Таблица последних складских операций">
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: FONT_BOLD, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>Тип</TableCell>
                    <TableCell sx={{ fontWeight: FONT_BOLD, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>Дата</TableCell>
                    <TableCell sx={{ fontWeight: FONT_BOLD, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>Склад</TableCell>
                    <TableCell sx={{ fontWeight: FONT_BOLD, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>Номенклатура</TableCell>
                    <TableCell align="right" sx={{ fontWeight: FONT_BOLD, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>Кол-во</TableCell>
                    <TableCell sx={{ fontWeight: FONT_BOLD, fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>Исполнитель</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {operations.map((op) => (
                    <OperationRow key={op.id} op={op} />
                  ))}
                </TableBody>
              </Table>
            </DataTableWrapper>
          ) : (
            <EmptyState
              icon={<SwapHorizIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
              title="Операции не проводились"
              description="В системе пока нет записей о движении ТМЦ"
              actionText="Оформить операцию"
              actionIcon={<AutoAwesomeIcon />}
              onAction={() => onOpenWizard('RECEIPT')}
              minHeight={260}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
