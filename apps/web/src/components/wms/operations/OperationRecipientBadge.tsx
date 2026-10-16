'use client';

import React from 'react';
import { Stack, Typography } from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PersonIcon from '@mui/icons-material/Person';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { StockOperation } from './types';

const FONT_SEMI_BOLD = 600;

export function OperationRecipientBadge({ op }: { op: StockOperation }) {
  if (op.type === 'RECEIPT') {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <MoveToInboxIcon sx={{ fontSize: 16, color: 'success.main' }} />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'success.dark', fontWeight: FONT_SEMI_BOLD }}>
          {op.counterparty ? `Поставщик: ${op.counterparty}` : 'Приход ТМЦ на склад'}
        </Typography>
      </Stack>
    );
  }

  if (op.type === 'ISSUE_EMPLOYEE') {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <PersonIcon sx={{ fontSize: 16, color: 'info.dark' }} />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'info.dark', fontWeight: FONT_SEMI_BOLD }}>
          {op.counterparty || 'Сотрудник в подотчет'}
        </Typography>
      </Stack>
    );
  }

  if (op.type === 'ISSUE_WRITE_OFF') {
    const firstItemWithEq = op.items.find((it) => it.equipment);
    if (firstItemWithEq && firstItemWithEq.equipment) {
      return (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <PrecisionManufacturingIcon sx={{ fontSize: 16, color: 'warning.dark' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'warning.dark', fontWeight: FONT_SEMI_BOLD }}>
            Оборудование: {firstItemWithEq.equipment.name} ({firstItemWithEq.equipment.inventoryNumber})
          </Typography>
        </Stack>
      );
    }
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <DeleteSweepIcon sx={{ fontSize: 16, color: 'error.main' }} />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'error.dark', fontWeight: FONT_SEMI_BOLD }}>
          {op.counterparty || 'Списание в неликвид/брак'}
        </Typography>
      </Stack>
    );
  }

  if (op.type === 'TRANSFER') {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <SwapHorizIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'secondary.main', fontWeight: FONT_SEMI_BOLD }}>
          {op.counterparty ? `Целевой склад: ${op.counterparty}` : 'Перемещение между складами'}
        </Typography>
      </Stack>
    );
  }

  return (
    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
      {op.counterparty || '—'}
    </Typography>
  );
}
