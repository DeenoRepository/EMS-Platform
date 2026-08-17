'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  LinearProgress,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  fullScreen?: boolean;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: (e?: React.FormEvent) => void | Promise<void>;
  submitDisabled?: boolean;
  submitColor?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  submitIcon?: React.ReactNode;
  hideActions?: boolean;
  extraActions?: React.ReactNode;
  dividers?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormDialog({
  open,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  loading = false,
  submitLabel = 'Сохранить',
  cancelLabel = 'Отмена',
  onSubmit,
  submitDisabled = false,
  submitColor = 'primary',
  submitIcon,
  hideActions = false,
  extraActions,
  dividers = false,
  children,
  className,
}: FormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isFullScreen = fullScreen || isMobile;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading && !submitDisabled && onSubmit) {
      onSubmit(e);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={isFullScreen}
      className={className}
      PaperProps={{
        component: onSubmit ? 'form' : 'div',
        onSubmit: onSubmit ? handleSubmit : undefined,
        sx: {
          borderRadius: isFullScreen ? 0 : '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: isFullScreen ? 'none' : '1px solid #e2e8f0',
          boxShadow: isFullScreen
            ? 'none'
            : '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
        },
      }}
    >
      {loading && (
        <LinearProgress
          sx={{
            height: 2,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        />
      )}

      <DialogTitle
        sx={{
          m: 0,
          px: { xs: 2, sm: 3 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          bgcolor: '#ffffff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 2, minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: 'rgba(2, 132, 199, 0.08)',
                color: '#0284c7',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            {typeof title === 'string' ? (
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  lineHeight: 1.3,
                  color: '#0f172a',
                  letterSpacing: '-0.015em',
                }}
                noWrap
              >
                {title}
              </Typography>
            ) : (
              title
            )}
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  display: 'block',
                  lineHeight: 1.25,
                  mt: 0.25,
                  fontSize: '0.75rem',
                }}
                noWrap
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton
          aria-label="Закрыть"
          onClick={handleClose}
          disabled={loading}
          size="small"
          sx={{
            color: '#64748b',
            borderRadius: '6px',
            p: 0.5,
            '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers={dividers}
        sx={{
          p: { xs: 2.5, sm: 3 },
          flex: 1,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: '#cbd5e1',
            borderRadius: 3,
          },
        }}
      >
        {children}
      </DialogContent>

      {!hideActions && (
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            borderTop: '1px solid #f1f5f9',
            bgcolor: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {extraActions}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={handleClose}
              disabled={loading}
              size="small"
              sx={{
                borderRadius: '8px',
                borderColor: '#e2e8f0',
                color: '#334155',
                fontWeight: 600,
                px: 2,
                py: 0.6,
                minHeight: 34,
                '&:hover': {
                  borderColor: '#cbd5e1',
                  backgroundColor: '#f8fafc',
                },
              }}
            >
              {cancelLabel}
            </Button>
            {onSubmit && (
              <Button
                type="submit"
                variant="contained"
                color={submitColor}
                disabled={loading || submitDisabled}
                startIcon={
                  loading ? (
                    <CircularProgress size={15} color="inherit" />
                  ) : (
                    submitIcon
                  )
                }
                size="small"
                sx={{
                  borderRadius: '8px',
                  fontWeight: 600,
                  px: 2.5,
                  py: 0.6,
                  minHeight: 34,
                  backgroundColor: submitColor === 'primary' ? '#0284c7' : undefined,
                  '&:hover': {
                    backgroundColor: submitColor === 'primary' ? '#0369a1' : undefined,
                  },
                }}
              >
                {loading ? 'Сохранение...' : submitLabel}
              </Button>
            )}
          </Box>
        </DialogActions>
      )}
    </Dialog>
  );
}
