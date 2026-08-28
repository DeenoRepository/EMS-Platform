'use client';

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { StatusBadge, FormDialog } from '@/components/ui';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';

export type ApprovalReviewDecision = 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalItemForReview {
  id: string;
  equipmentId: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  proposedData: Record<string, unknown> | null;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    status?: string;
  } | null;
  requester: {
    id: string;
    displayName: string;
  };
}

interface ApprovalReviewDialogProps {
  open: boolean;
  approval: ApprovalItemForReview | null;
  resolutionComment: string;
  submitting: boolean;
  onClose: () => void;
  onCommentChange: (comment: string) => void;
  onProcessReview: (decision: ApprovalReviewDecision) => void;
}

export function ApprovalReviewDialog({
  open,
  approval,
  resolutionComment,
  submitting,
  onClose,
  onCommentChange,
  onProcessReview,
}: ApprovalReviewDialogProps) {
  if (!approval) return null;

  return (
    <FormDialog
      open={open}
      onClose={() => !submitting && onClose()}
      title="Рассмотрение заявки на согласование"
      icon={<CheckCircleOutlineIcon color="primary" />}
      maxWidth="sm"
      hideActions
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Оборудование:
          </Typography>
          <Typography variant="subtitle2" fontWeight={700}>
            {approval.equipment
              ? `${approval.equipment.name} (Инв. №: ${approval.equipment.inventoryNumber || 'Б/Н'})`
              : 'Оборудование удалено / не привязано'}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="caption" color="text.secondary" display="block">
            Тип согласования:
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <StatusBadge status={approval.type} />
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
            Тема заявки:
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {approval.title}
          </Typography>

          {approval.description && (
            <>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Обоснование инициатора ({approval.requester?.displayName || 'Инициатор'}):
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                «{approval.description}»
              </Typography>
            </>
          )}

          {approval.proposedData && typeof approval.proposedData === 'object' && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.75 }}>
                Предлагаемые параметры:
              </Typography>
              {Object.entries(approval.proposedData).map(([key, val]) => {
                const statusMeta = key === 'targetStatus' ? EQUIPMENT_STATUS_MAP[val as string] : undefined;
                const displayVal = statusMeta ? (typeof statusMeta === 'string' ? statusMeta : statusMeta.label) : (typeof val === 'object' ? JSON.stringify(val) : String(val));
                return (
                  <Typography key={key} variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    <b>{key}</b>: {displayVal}
                  </Typography>
                );
              })}
            </Box>
          )}
        </Paper>

        <TextField
          fullWidth
          multiline
          minRows={3}
          size="small"
          label="Комментарий / Резолюция согласующего"
          placeholder="Обязательно укажите причину в случае отклонения..."
          value={resolutionComment}
          onChange={(e) => onCommentChange(e.target.value)}
          disabled={submitting}
        />

        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', mt: 1 }}>
          <Button onClick={onClose} disabled={submitting} sx={{ textTransform: 'none' }}>
            Отмена
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelOutlinedIcon />}
            onClick={() => onProcessReview('REJECTED')}
            disabled={submitting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {submitting ? <CircularProgress size={18} /> : 'Отклонить'}
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={() => onProcessReview('APPROVED')}
            disabled={submitting}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {submitting ? <CircularProgress size={18} color="inherit" /> : 'Утвердить'}
          </Button>
        </Box>
      </Box>
    </FormDialog>
  );
}

export default ApprovalReviewDialog;
