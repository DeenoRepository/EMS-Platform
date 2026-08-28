'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Typography,
  Chip,
  Stack,
  Button,
  CircularProgress,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import SendIcon from '@mui/icons-material/Send';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@ems/shared';

export interface TransferItemRecord {
  id: string;
  nomenclatureId: string;
  quantity: string | number;
  targetCellId?: string | null;
  targetCell?: { code: string; name?: string } | null;
  nomenclature?: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
  };
}

export interface StockTransferRecord {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  status: 'REQUESTED' | 'IN_TRANSIT' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  requestReason?: string | null;
  rejectionReason?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  sourceWarehouse: {
    id: string;
    name: string;
    code: string;
    responsibleUser?: { id: string; displayName: string; ldapLogin: string } | null;
  };
  targetWarehouse: {
    id: string;
    name: string;
    code: string;
    responsibleUser?: { id: string; displayName: string; ldapLogin: string } | null;
  };
  createdBy: { displayName: string; ldapLogin: string };
  items: TransferItemRecord[];
}

interface WmsTransfersTableProps {
  transfers: StockTransferRecord[];
  isLoading: boolean;
  transferTab: string;
  currentUserId?: string;
  isAdmin: boolean;
  isDispatchingId: string | null;
  onReceive: (t: StockTransferRecord) => void;
  onReject: (t: StockTransferRecord) => void;
  onQuickDispatch: (t: StockTransferRecord) => void;
}

export function WmsTransfersTable({
  transfers,
  isLoading,
  transferTab,
  currentUserId,
  isAdmin,
  isDispatchingId,
  onReceive,
  onReject,
  onQuickDispatch,
}: WmsTransfersTableProps) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: 'background.default' }}>
          <TableCell sx={{ fontWeight: 700, width: 140 }}>Номер</TableCell>
          <TableCell sx={{ fontWeight: 700, width: 180 }}>Статус</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Маршрут (Откуда → Куда)</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Позиции ТМЦ</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Обоснование / Отказ</TableCell>
          <TableCell sx={{ fontWeight: 700, width: 130 }}>Дата</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, width: 220 }}>
            Действия
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {transfers.length === 0 && !isLoading ? (
          <TableRow>
            <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
              <EmptyState
                title="Перемещений не найдено"
                description={
                  transferTab === 'inbound'
                    ? 'На ваш склад сейчас нет входящих перемещений, ожидающих приемки.'
                    : transferTab === 'requests'
                    ? 'Нет активных запросов на перевод ТМЦ с вашего склада.'
                    : 'В выбранной категории записей нет.'
                }
              />
            </TableCell>
          </TableRow>
        ) : (
          transfers.map((t) => {
            const isTargetStorekeeper = t.targetWarehouse.responsibleUser?.id === currentUserId;
            const isSourceStorekeeper = t.sourceWarehouse.responsibleUser?.id === currentUserId;
            const canReceive = (isTargetStorekeeper || isAdmin) && t.status === 'IN_TRANSIT';
            const canDispatch = (isSourceStorekeeper || isAdmin) && t.status === 'REQUESTED';

            return (
              <TableRow key={t.id} hover>
                <TableCell sx={{ py: 1.25, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {t.transferNumber}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {t.sourceWarehouse.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                        МОЛ: {t.sourceWarehouse.responsibleUser?.displayName || 'Не назначен'}
                      </Typography>
                    </Box>
                    <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {t.targetWarehouse.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                        МОЛ: {t.targetWarehouse.responsibleUser?.displayName || 'Не назначен'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  <Stack spacing={0.5}>
                    {t.items.map((it) => (
                      <Typography key={it.id} variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        • <b>{it.nomenclature?.name}</b>: {it.quantity} {it.nomenclature?.unit || 'шт'}
                        {it.targetCell && (
                          <Chip
                            size="small"
                            label={`Ячейка: ${it.targetCell.code}`}
                            sx={{ height: 18, fontSize: '0.65rem', ml: 0.75 }}
                          />
                        )}
                      </Typography>
                    ))}
                  </Stack>
                </TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  {t.rejectionReason ? (
                    <Box sx={{ p: 0.75, bgcolor: 'error.light', borderRadius: '6px', border: '1px solid error.light' }}>
                      <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, display: 'block' }}>
                        Отказ:
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'error.dark' }}>
                        {t.rejectionReason}
                      </Typography>
                    </Box>
                  ) : t.requestReason ? (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t.requestReason}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ py: 1.25, fontSize: '0.75rem', color: 'text.disabled' }}>
                  {formatDateTime(t.createdAt)}
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25 }}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {canReceive && (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon sx={{ fontSize: 16 }} />}
                          onClick={() => onReceive(t)}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                        >
                          Принять
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<BlockIcon sx={{ fontSize: 16 }} />}
                          onClick={() => onReject(t)}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: '6px' }}
                        >
                          Отклонить
                        </Button>
                      </>
                    )}

                    {canDispatch && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={isDispatchingId === t.id ? <CircularProgress size={14} color="inherit" /> : <SendIcon sx={{ fontSize: 16 }} />}
                        disabled={Boolean(isDispatchingId)}
                        onClick={() => onQuickDispatch(t)}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        Согласовать и отгрузить
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

export default WmsTransfersTable;
