'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  TextField,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'primary' | 'info' | 'success';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  /** Требовать точный ввод ключевого слова (например, код сущности или 'УДАЛИТЬ') */
  confirmWord?: string;
  /** Подсказка для поля ввода проверочного слова */
  confirmWordPlaceholder?: string;
  /** Таймер задержки активации кнопки подтверждения в секундах (защита от случайных кликов) */
  countdownSeconds?: number;
  onConfirm: () => void;
  onClose: () => void;
  className?: string;
}

export function ConfirmDialog({
  open,
  title,
  subtitle,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'primary',
  loading = false,
  confirmWord,
  confirmWordPlaceholder,
  countdownSeconds = 0,
  onConfirm,
  onClose,
  className,
}: ConfirmDialogProps) {
  const [typedWord, setTypedWord] = useState('');
  const [remainingTime, setRemainingTime] = useState(countdownSeconds);

  // Сброс состояния при открытии
  useEffect(() => {
    if (open) {
      setTypedWord('');
      setRemainingTime(countdownSeconds);
    }
  }, [open, countdownSeconds]);

  // Обратный отсчет таймера безопасности
  useEffect(() => {
    if (!open || remainingTime <= 0) return;
    const timer = setInterval(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [open, remainingTime]);

  const isWordValid = !confirmWord || typedWord.trim().toLowerCase() === confirmWord.trim().toLowerCase();
  const isCountdownFinished = remainingTime === 0;
  const isConfirmDisabled = loading || !isWordValid || !isCountdownFinished;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isConfirmDisabled) {
        e.preventDefault();
        onConfirm();
      }
    },
    [isConfirmDisabled, onConfirm]
  );

  const getIconConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 24 }} />,
          bg: 'error.light',
          color: 'error.main',
          border: 'error.light',
        };
      case 'warning':
        return {
          icon: <WarningAmberRoundedIcon sx={{ fontSize: 24 }} />,
          bg: 'warning.light',
          color: 'warning.main',
          border: 'warning.light',
        };
      case 'success':
        return {
          icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 24 }} />,
          bg: 'success.light',
          color: 'success.main',
          border: 'success.light',
        };
      case 'info':
        return {
          icon: <InfoOutlinedIcon sx={{ fontSize: 24 }} />,
          bg: 'info.light',
          color: 'info.main',
          border: 'info.light',
        };
      default:
        return {
          icon: <HelpOutlineRoundedIcon sx={{ fontSize: 24 }} />,
          bg: 'primary.light',
          color: 'primary.main',
          border: 'primary.light',
        };
    }
  };

  const iconConfig = getIconConfig();

  const getConfirmButtonColor = () => {
    if (variant === 'danger') return 'error';
    if (variant === 'warning') return 'warning';
    if (variant === 'success') return 'success';
    return 'primary';
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="sm"
      fullWidth
      onKeyDown={handleKeyDown}
      className={className}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '14px',
          p: 0.5,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.15), 0 10px 15px -3px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: iconConfig.bg,
              color: iconConfig.color,
              border: '1px solid',
              borderColor: iconConfig.border,
              flexShrink: 0,
            }}
          >
            {iconConfig.icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: '1.0625rem',
                lineHeight: 1.3,
                color: 'text.primary',
                letterSpacing: '-0.015em',
                display: 'block',
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  mt: 0.25,
                  display: 'block',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1.5 }}>
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.5, pl: { xs: 0, sm: 7.25 } }}>
          {typeof message === 'string' ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.6 }}>
              {message}
            </Typography>
          ) : (
            message
          )}

          {/* Explicit Word Confirmation Input */}
          {confirmWord && (
            <Box sx={{ mt: 2.5, p: 1.75, backgroundColor: 'background.default', borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ display: 'block', mb: 1 }}>
                Для подтверждения введите{' '}
                <Box component="span" sx={{ px: 0.75, py: 0.2, bgcolor: 'divider', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700 }}>
                  {confirmWord}
                </Box>
                :
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={typedWord}
                onChange={(e) => setTypedWord(e.target.value)}
                placeholder={confirmWordPlaceholder || `Введите "${confirmWord}"`}
                autoFocus
                sx={{
                  backgroundColor: 'background.paper',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1.5, gap: 1, justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          size="medium"
          sx={{
            borderRadius: '8px',
            borderColor: 'divider',
            color: 'text.secondary',
            fontWeight: 600,
            px: 2,
            py: 0.7,
            fontSize: '0.8125rem',
            '&:hover': {
              borderColor: 'text.disabled',
              backgroundColor: 'action.hover',
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isConfirmDisabled}
          variant="contained"
          color={getConfirmButtonColor()}
          size="medium"
          sx={{
            borderRadius: '8px',
            fontWeight: 600,
            px: 2.5,
            py: 0.7,
            fontSize: '0.8125rem',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px -2px rgba(0,0,0,0.12)',
            },
          }}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading
            ? 'Обработка...'
            : remainingTime > 0
            ? `${confirmText} (${remainingTime}s)`
            : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
