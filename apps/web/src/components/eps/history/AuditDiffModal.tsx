'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
} from '@mui/material';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { StatusBadge, FormDialog } from '@/components/ui';
import {
  DOCUMENT_TYPE_MAP,
  APPROVAL_TYPE_MAP,
  formatDateTime,
} from '@ems/shared';

export interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
  } | null;
}

export function formatAuditValue(key: string, val: unknown): React.ReactNode {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Да' : 'Нет';

  if (key === 'status') {
    return <StatusBadge status={String(val)} size="small" />;
  }

  if (key === 'docType') {
    return DOCUMENT_TYPE_MAP[String(val)] || String(val);
  }

  if (key === 'type') {
    return APPROVAL_TYPE_MAP[String(val)] || String(val);
  }

  if (key === 'approvalStatus') {
    return <StatusBadge status={String(val)} size="small" />;
  }

  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  return String(val);
}

export function RenderChangesDiff({ changes }: { changes: Record<string, unknown> | null | undefined }) {
  if (!changes || typeof changes !== 'object') {
    return <Typography variant="caption" color="text.secondary">—</Typography>;
  }

  const entries = Object.entries(changes);

  if (entries.length === 0) {
    return <Typography variant="caption" color="text.secondary">—</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {entries.map(([key, val]) => {
        if (val && typeof val === 'object' && 'old' in val && 'new' in val) {
          const changeObj = val as { old: unknown; new: unknown };
          return (
            <Box key={key} sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                {key}:
              </Typography>
              <Box component="span" sx={{ textDecoration: 'line-through', color: 'error.main', opacity: 0.8 }}>
                {formatAuditValue(key, changeObj.old)}
              </Box>
              <ArrowRightAltIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>
                {formatAuditValue(key, changeObj.new)}
              </Box>
            </Box>
          );
        }

        return (
          <Box key={key} sx={{ fontSize: '0.75rem' }}>
            <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
              {key}:
            </Typography>{' '}
            <Typography component="span" sx={{ fontSize: '0.75rem' }}>
              {formatAuditValue(key, val)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

interface AuditDiffModalProps {
  open: boolean;
  selectedLog: AuditLogItem | null;
  onClose: () => void;
}

export function AuditDiffModal({ open, selectedLog, onClose }: AuditDiffModalProps) {
  if (!selectedLog) return null;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Детализация события аудита"
      maxWidth="md"
      hideActions
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Дата и время:
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                {formatDateTime(selectedLog.createdAt)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Пользователь / Автор:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {selectedLog.user?.displayName || 'Система'} ({selectedLog.user?.ldapLogin || 'SYSTEM'})
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Действие:
              </Typography>
              <Box sx={{ mt: 0.25 }}>
                <StatusBadge status={selectedLog.action} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Тип объекта:
              </Typography>
              <Box sx={{ mt: 0.25 }}>
                <StatusBadge status={selectedLog.entityType} size="small" variant="outlined" />
              </Box>
            </Grid>
            {selectedLog.equipment && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Связанное оборудование:
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {selectedLog.equipment.name} {selectedLog.equipment.inventoryNumber ? `(Инв. № ${selectedLog.equipment.inventoryNumber})` : ''}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>

        <Typography variant="subtitle2" fontWeight={700}>
          Измененные реквизиты:
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.paper' }}>
          <RenderChangesDiff changes={selectedLog.changes} />
        </Paper>
      </Box>
    </FormDialog>
  );
}

export default AuditDiffModal;
