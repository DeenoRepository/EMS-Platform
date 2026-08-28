'use client';

import React from 'react';
import { Stack, Typography } from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PersonIcon from '@mui/icons-material/Person';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

export interface StockOperationItem {
  id: string;
  quantity: number;
  nomenclature: { id: string; name: string; article?: string | null; unit: string };
  equipment?: { id: string; name: string; inventoryNumber: string } | null;
}

export interface StockOperationSummary {
  type: string;
  counterparty?: string | null;
  comment?: string | null;
  items: StockOperationItem[];
}

export function WmsOperationRecipientBadge({ op }: { op: StockOperationSummary }) {
  if (op.type === 'RECEIPT') {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <MoveToInboxIcon sx={{ fontSize: 16, color: 'success.main' }} />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'success.dark', fontWeight: 600 }}>
          {op.counterparty ? `Поставщик: ${op.counterparty}` : 'Приход ТМЦ на склад'}
        </Typography>
      </Stack>
    );
  }

  if (op.type === 'ISSUE_EMPLOYEE') {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <PersonIcon sx={{ fontSize: 16, color: 'info.dark' }} />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'info.dark', fontWeight: 600 }}>
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
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'warning.dark', fontWeight: 600 }}>
            Оборудование: {firstItemWithEq.equipment.name} ({firstItemWithEq.equipment.inventoryNumber})
          </Typography>
        </Stack>
      );
    }
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <DeleteSweepIcon sx={{ fontSize: 16, color: 'warning.dark' }} />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'warning.dark', fontWeight: 600 }}>
          {op.comment || 'Списание ТМЦ / Монтаж ТОиР'}
        </Typography>
      </Stack>
    );
  }

  if (op.type === 'TRANSFER') {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <SwapHorizIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'secondary.dark', fontWeight: 600 }}>
          {op.counterparty ? `Склад-получатель: ${op.counterparty}` : 'Межскладской трансфер'}
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

export default WmsOperationRecipientBadge;
