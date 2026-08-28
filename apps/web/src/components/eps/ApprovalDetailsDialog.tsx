'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import { StatusBadge, FormDialog } from '@/components/ui';
import { formatDateTime } from '@ems/shared';

export interface ApprovalDetailsItem {
  id: string;
  equipmentId: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  proposedData: Record<string, unknown> | null;
  reviewedAt: string | null;
  resolutionComment: string | null;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    status?: string;
  } | null;
  requester: {
    displayName: string;
  };
  reviewer: {
    displayName: string;
  } | null;
}

interface ApprovalDetailsDialogProps {
  open: boolean;
  approval: ApprovalDetailsItem | null;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Наименование',
  inventoryNumber: 'Инвентарный №',
  serialNumber: 'Заводской №',
  manufacturer: 'Производитель',
  model: 'Модель',
  location: 'Локация',
  status: 'Целевой статус',
  targetStatus: 'Целевой статус',
};

export function ApprovalDetailsDialog({
  open,
  approval,
  onClose,
}: ApprovalDetailsDialogProps) {
  if (!approval) return null;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Сведения о заявке на согласование"
      maxWidth="sm"
      hideActions
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatusBadge status={approval.type} />
          <StatusBadge status={approval.status} />
        </Box>

        <Typography variant="h6" fontWeight={700}>
          {approval.title}
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Оборудование:
          </Typography>
          <Typography variant="subtitle2" fontWeight={700}>
            {approval.equipment
              ? `${approval.equipment.name} • Инв. №: ${approval.equipment.inventoryNumber || 'Б/Н'}`
              : 'Оборудование удалено / не привязано'}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="caption" color="text.secondary" display="block">
            Инициатор заявки:
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {approval.requester?.displayName || 'Инициатор'} ({formatDateTime(approval.createdAt)})
          </Typography>

          {approval.description && (
            <>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                Обоснование:
              </Typography>
              <Typography variant="body2">{approval.description}</Typography>
            </>
          )}

          {approval.proposedData && typeof approval.proposedData === 'object' && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.75 }}>
                Предложенные данные / характеристики:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {Object.entries(approval.proposedData).map(([key, val]) => {
                  if (val === null || val === undefined || val === '') return null;
                  if (key === 'customFields' && typeof val === 'object') {
                    return Object.entries(val as Record<string, unknown>).map(([cfKey, cfVal]) => (
                      <Box key={cfKey} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', py: 0.25, borderBottom: '1px dashed', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">{cfKey}:</Typography>
                        <Typography variant="caption" fontWeight={600}>{String(cfVal)}</Typography>
                      </Box>
                    ));
                  }
                  return (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', py: 0.25, borderBottom: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">{FIELD_LABELS[key] || key}:</Typography>
                      <Typography variant="caption" fontWeight={600}>{String(val)}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {approval.reviewer && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                Решение принял:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {approval.reviewer.displayName} ({formatDateTime(approval.reviewedAt)})
              </Typography>

              {approval.resolutionComment && (
                <>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Резолюция:
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    «{approval.resolutionComment}»
                  </Typography>
                </>
              )}
            </>
          )}
        </Paper>
      </Box>
    </FormDialog>
  );
}

export default ApprovalDetailsDialog;
