'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'primary';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'primary',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            <ErrorOutlineRoundedIcon sx={{ fontSize: 24 }} />
          </Box>
        );
      case 'warning':
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              flexShrink: 0,
            }}
          >
            <WarningAmberRoundedIcon sx={{ fontSize: 24 }} />
          </Box>
        );
      default:
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              color: '#0284c7',
              flexShrink: 0,
            }}
          >
            <HelpOutlineRoundedIcon sx={{ fontSize: 24 }} />
          </Box>
        );
    }
  };

  const getConfirmButtonColor = () => {
    if (variant === 'danger') return 'error';
    if (variant === 'warning') return 'warning';
    return 'primary';
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          p: 0.5,
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {getIcon()}
          <Typography
            variant="h6"
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              lineHeight: 1.3,
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1 }}>
        <Box sx={{ color: '#475569', fontSize: '0.8125rem', lineHeight: 1.5, pl: 6.5 }}>
          {typeof message === 'string' ? <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8125rem' }}>{message}</Typography> : message}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1.5, gap: 1, justifyContent: 'flex-end' }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          size="small"
          sx={{
            borderRadius: '8px',
            borderColor: '#e2e8f0',
            color: '#334155',
            fontWeight: 600,
            px: 2,
            py: 0.6,
            '&:hover': {
              borderColor: '#cbd5e1',
              backgroundColor: '#f8fafc',
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={getConfirmButtonColor()}
          size="small"
          sx={{
            borderRadius: '8px',
            fontWeight: 600,
            px: 2,
            py: 0.6,
          }}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {loading ? 'Обработка...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
