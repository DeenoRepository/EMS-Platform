'use client';

import React from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Stack,
  Box,
  Button,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import SendIcon from '@mui/icons-material/Send';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@ems/shared';
import { TransferRecord } from './types';

const FONT_SEMI_BOLD = 600;

interface TransfersTableProps {
  transfers: TransferRecord[];
  loading: boolean;
  transferTab: string;
  currentUserId?: string;
  isAdmin: boolean;
  onReceive: (transfer: TransferRecord) => void;
  onReject: (transfer: TransferRecord) => void;
  onDispatch: (transfer: TransferRecord) => void;
  onOpenTransferRequest: () => void;
}

export function TransfersTable({
  transfers,
  loading,
  transferTab,
  currentUserId,
  isAdmin,
  onReceive,
  onReject,
  onDispatch,
  onOpenTransferRequest,
}: TransfersTableProps) {
  if (transfers.length === 0 && !loading) {
    return (
      <EmptyState
        title="Перемещений не найдено"
        description={
          transferTab === 'inbound'
            ? 'На ваш склад сейчас нет входящих перемещений, ожидающих приемки.'
            : transferTab === 'requests'
            ? 'Нет активных запросов на перевод ТМЦ с вашего склада.'
            : 'В выбранной категории перемещений записей нет.'
        }
        actionText="Запрос перемещения"
        onAction={onOpenTransferRequest}
      />
    );
  }

  return (
    <Table size="small" aria-label="Журнал перемещений ТМЦ">
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
        {transfers.map((t) => {
          const isTargetStorekeeper = t.targetWarehouse.responsibleUserId === currentUserId;
          const isSourceStorekeeper = t.sourceWarehouse.responsibleUserId === currentUserId;
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
                    <Typography variant="body2" sx={{ fontWeight: FONT_SEMI_BOLD, color: 'text.primary' }}>
                      {t.sourceWarehouse.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {t.sourceWarehouse.code}
                    </Typography>
                  </Box>
                  <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: FONT_SEMI_BOLD, color: 'primary.main' }}>
                      {t.targetWarehouse.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {t.targetWarehouse.code}
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
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            px: 0.75,
                            py: 0.1,
                            borderRadius: '4px',
                            bgcolor: 'action.hover',
                            color: 'text.secondary',
                            border: '1px solid',
                            borderColor: 'divider',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            ml: 0.75,
                          }}
                        >
                          Ячейка: {it.targetCell.code}
                        </Box>
                      )}
                    </Typography>
                  ))}
                </Stack>
              </TableCell>

              <TableCell sx={{ py: 1.25 }}>
                {t.rejectionReason ? (
                  <Box sx={{ p: 0.75, bgcolor: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', border: '1px solid', borderColor: 'error.main' }}>
                    <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, display: 'block' }}>
                      Отказ:
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'error.main' }}>
                      {t.rejectionReason}
                    </Typography>
                  </Box>
                ) : t.comment ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t.comment}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">—</Typography>
                )}
              </TableCell>

              <TableCell sx={{ py: 1.25, fontSize: '0.75rem', color: 'text.secondary' }}>
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
                        startIcon={<CheckIcon />}
                        onClick={() => onReceive(t)}
                        sx={{ fontSize: '0.75rem', py: 0.4, fontWeight: FONT_SEMI_BOLD, borderRadius: '6px', textTransform: 'none' }}
                      >
                        Принять
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<BlockIcon />}
                        onClick={() => onReject(t)}
                        sx={{ fontSize: '0.75rem', py: 0.4, fontWeight: FONT_SEMI_BOLD, borderRadius: '6px', textTransform: 'none' }}
                      >
                        Отклонить
                      </Button>
                    </>
                  )}

                  {canDispatch && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<SendIcon />}
                        onClick={() => onDispatch(t)}
                        sx={{ fontSize: '0.75rem', py: 0.4, fontWeight: FONT_SEMI_BOLD, borderRadius: '6px', textTransform: 'none' }}
                      >
                        Отправить
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<BlockIcon />}
                        onClick={() => onReject(t)}
                        sx={{ fontSize: '0.75rem', py: 0.4, fontWeight: FONT_SEMI_BOLD, borderRadius: '6px', textTransform: 'none' }}
                      >
                        Отклонить
                      </Button>
                    </>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
