'use client';

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Stack,
  Button,
} from '@mui/material';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import {
  EQUIPMENT_STATUS_MAP,
  DOCUMENT_TYPE_MAP,
  APPROVAL_TYPE_MAP,
  APPROVAL_STATUS_MAP,
  formatDateTime,
} from '@ems/shared';

const FONT_SEMI_BOLD = 600;

export function formatAuditValue(key: string, val: unknown): React.ReactNode {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Да' : 'Нет';

  if (key === 'status') {
    const s = String(val);
    const info = EQUIPMENT_STATUS_MAP[s] || APPROVAL_STATUS_MAP[s];
    return info ? info.label : s;
  }
  if (key === 'docType') {
    return DOCUMENT_TYPE_MAP[String(val)] || String(val);
  }
  if (key === 'type') {
    return APPROVAL_TYPE_MAP[String(val)] || String(val);
  }
  if (key === 'commissionDate' || key === 'createdAt' || key === 'updatedAt') {
    return formatDateTime(String(val));
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

interface AuditDiffViewerProps {
  changes: Record<string, unknown> | null;
  onOpenDetailsModal: () => void;
}

export function AuditDiffViewer({ changes, onOpenDetailsModal }: AuditDiffViewerProps) {
  if (!changes || typeof changes !== 'object') {
    return <Typography variant="caption" color="text.disabled">—</Typography>;
  }

  const keys = Object.keys(changes);
  if (keys.length === 0) {
    return <Typography variant="caption" color="text.disabled">—</Typography>;
  }

  const previewKeys = keys.slice(0, 3);
  const remainingCount = keys.length - 3;

  return (
    <Box>
      <Stack spacing={0.75}>
        {previewKeys.map((k) => {
          const val = changes[k] as any;
          const isDiffObj = val && typeof val === 'object' && ('old' in val || 'new' in val);

          if (isDiffObj) {
            return (
              <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem', flexWrap: 'wrap' }}>
                <Typography variant="caption" fontWeight={FONT_SEMI_BOLD} color="text.secondary">
                  {k}:
                </Typography>
                <Paper variant="outlined" sx={{ px: 0.75, py: 0.1, bgcolor: 'action.hover', color: 'error.main', fontSize: '0.75rem' }}>
                  {formatAuditValue(k, val.old)}
                </Paper>
                <ArrowRightAltIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Paper variant="outlined" sx={{ px: 0.75, py: 0.1, bgcolor: 'action.hover', color: 'success.main', fontSize: '0.75rem', fontWeight: 600 }}>
                  {formatAuditValue(k, val.new)}
                </Paper>
              </Box>
            );
          }

          return (
            <Box key={k} sx={{ fontSize: '0.75rem' }}>
              <Typography variant="caption" fontWeight={FONT_SEMI_BOLD} color="text.secondary">
                {k}:
              </Typography>{' '}
              <Typography variant="caption" color="text.primary">
                {formatAuditValue(k, val)}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      {remainingCount > 0 && (
        <Button
          size="small"
          variant="text"
          onClick={onOpenDetailsModal}
          sx={{ mt: 0.5, p: 0, fontSize: '0.6875rem', textTransform: 'none', fontWeight: FONT_SEMI_BOLD }}
        >
          ещё {remainingCount} изменений...
        </Button>
      )}
    </Box>
  );
}
