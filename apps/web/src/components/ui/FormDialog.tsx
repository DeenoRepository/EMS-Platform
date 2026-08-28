'use client';

import React, { useState, useCallback } from 'react';
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
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

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
  actions?: React.ReactNode;
  extraActions?: React.ReactNode;
  dividers?: boolean;
  /** Флаг наличия несохраненных изменений в форме */
  isDirty?: boolean;
  /** Предупреждение при попытке закрыть форму с несохраненными данными */
  dirtyConfirmMessage?: string;
  /** Поддержка многошаговой формы (Stepper) */
  steps?: string[];
  activeStep?: number;
  onStepChange?: (step: number) => void;
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
  actions,
  extraActions,
  dividers = false,
  isDirty = false,
  dirtyConfirmMessage = 'У вас есть несохраненные изменения. Вы уверены, что хотите закрыть окно без сохранения?',
  steps,
  activeStep = 0,
  onStepChange,
  children,
  className,
}: FormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isFullScreen = fullScreen || isMobile;

  const [showDirtyWarning, setShowDirtyWarning] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading && !submitDisabled && onSubmit) {
      onSubmit(e);
    }
  };

  const handleRequestClose = () => {
    if (loading) return;
    if (isDirty) {
      setShowDirtyWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowDirtyWarning(false);
    onClose();
  };

  // Горячая клавиша Ctrl+Enter / Cmd+Enter для отправки формы
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!loading && !submitDisabled && onSubmit) {
          e.preventDefault();
          onSubmit();
        }
      }
    },
    [loading, submitDisabled, onSubmit]
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={handleRequestClose}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        fullScreen={isFullScreen}
        className={className}
        onKeyDown={handleKeyDown}
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: 'blur(4px)',
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
            },
          },
        }}
        PaperProps={{
          component: onSubmit ? 'form' : 'div',
          noValidate: true,
          onSubmit: onSubmit ? handleSubmit : undefined,
          sx: {
            borderRadius: isFullScreen ? 0 : '14px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: isFullScreen ? 'none' : '1px solid',
            borderColor: 'divider',
            boxShadow: isFullScreen
              ? 'none'
              : '0 20px 30px -10px rgba(15, 23, 42, 0.15), 0 10px 15px -3px rgba(15, 23, 42, 0.08)',
          },
        }}
      >
        {loading && (
          <LinearProgress
            color="primary"
            sx={{
              height: 2.5,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
            }}
          />
        )}

        {/* Header */}
        <DialogTitle
          sx={{
            m: 0,
            px: { xs: 2, sm: 3 },
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 2, minWidth: 0 }}>
            {icon && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: 'primary.light',
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
                    fontSize: { xs: '1rem', sm: '1.0625rem' },
                    lineHeight: 1.3,
                    color: 'text.primary',
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
                    color: 'text.secondary',
                    display: 'block',
                    lineHeight: 1.35,
                    mt: 0.35,
                    fontSize: '0.75rem',
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton
            aria-label="Закрыть"
            onClick={handleRequestClose}
            disabled={loading}
            size="small"
            sx={{
              color: 'text.secondary',
              borderRadius: '8px',
              p: 0.75,
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        {/* Stepper (Optional) */}
        {steps && steps.length > 0 && (
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step
                  key={label}
                  completed={activeStep > index}
                  onClick={() => onStepChange && onStepChange(index)}
                  sx={{ cursor: onStepChange ? 'pointer' : 'default' }}
                >
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontSize: '0.75rem',
                        fontWeight: activeStep === index ? 700 : 500,
                        color: activeStep === index ? 'primary.main' : 'text.secondary',
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* Content Body */}
        <DialogContent
          dividers={dividers}
          sx={{
            p: { xs: 2.5, sm: 3 },
            pt: { xs: '20px !important', sm: '22px !important' },
            flex: 1,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'divider',
              borderRadius: 3,
            },
          }}
        >
          {children}
        </DialogContent>

        {/* Actions Footer */}
        {!hideActions && (
          <DialogActions
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1.75,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: actions ? 'flex-end' : 'space-between',
              alignItems: 'center',
            }}
          >
            {actions ? (
              actions
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{extraActions}</Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Button
                    variant="outlined"
                    onClick={handleRequestClose}
                    disabled={loading}
                    size="medium"
                    sx={{
                      borderRadius: '8px',
                      borderColor: 'divider',
                      color: 'text.secondary',
                      fontWeight: 600,
                      px: 2,
                      py: 0.7,
                      fontSize: '0.8125rem',
                      minHeight: 36,
                      '&:hover': {
                        borderColor: 'text.disabled',
                        backgroundColor: 'action.hover',
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
                      size="medium"
                      sx={{
                        borderRadius: '8px',
                        fontWeight: 600,
                        px: 2.5,
                        py: 0.7,
                        fontSize: '0.8125rem',
                        minHeight: 36,
                      }}
                    >
                      {loading ? 'Сохранение...' : submitLabel}
                    </Button>
                  )}
                </Box>
              </>
            )}
          </DialogActions>
        )}
      </Dialog>

      {/* Dirty Warning Sub-Modal */}
      <Dialog
        open={showDirtyWarning}
        onClose={() => setShowDirtyWarning(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: 'blur(2px)',
              backgroundColor: 'rgba(15, 23, 42, 0.35)',
            },
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            p: 1,
            border: '1px solid',
            borderColor: 'warning.light',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: 'warning.light',
              color: 'warning.main',
            }}
          >
            <WarningAmberRoundedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            Несохраненные изменения
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {dirtyConfirmMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pt: 1.5, pb: 1, px: 2, gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setShowDirtyWarning(false)}
            sx={{ borderRadius: '8px', color: 'text.secondary' }}
          >
            Продолжить редактирование
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={handleConfirmClose}
            sx={{ borderRadius: '8px' }}
          >
            Закрыть без сохранения
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
