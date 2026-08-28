'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Stack,
  Collapse,
  useTheme,
} from '@mui/material';
import Link from 'next/link';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface CriticalAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
  count?: number;
  badgeLabel?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  dismissible?: boolean;
}

export interface CriticalAlertBannerProps {
  alerts: CriticalAlert[];
  onDismiss?: (id: string) => void;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { bg: string; border: string; color: string; textColor: string; btnBg: string; icon: React.ComponentType<any>; label: string }
> = {
  CRITICAL: {
    bg: 'error.light',
    border: 'error.light',
    color: 'error.main',
    textColor: 'error.dark',
    btnBg: 'error.main',
    icon: ErrorOutlineIcon,
    label: 'Критично',
  },
  WARNING: {
    bg: 'warning.light',
    border: 'warning.light',
    color: 'warning.main',
    textColor: 'warning.dark',
    btnBg: 'warning.main',
    icon: WarningAmberIcon,
    label: 'Внимание',
  },
  INFO: {
    bg: 'info.light',
    border: 'primary.light',
    color: 'primary.main',
    textColor: 'primary.dark',
    btnBg: 'primary.main',
    icon: InfoOutlinedIcon,
    label: 'Инфо',
  },
};

export function CriticalAlertBanner({
  alerts,
  onDismiss,
  className,
}: CriticalAlertBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.includes(a.id));

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
    if (onDismiss) {
      onDismiss(id);
    }
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <Stack spacing={1.5} sx={{ mb: 2.5 }} className={className}>
      {visibleAlerts.map((alert) => {
        const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.WARNING;
        const IconComp = cfg.icon;

        return (
          <Paper
            key={alert.id}
            elevation={0}
            sx={{
              px: 2,
              py: 1.25,
              borderRadius: '10px',
              backgroundColor: cfg.bg,
              border: `1px solid ${cfg.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
              <Box
                sx={{
                  color: cfg.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconComp sx={{ fontSize: 20 }} />
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: cfg.textColor,
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  <Box component="span" sx={{ fontWeight: 700, mr: 0.5 }}>
                    {alert.title}
                  </Box>
                  {alert.description && (
                    <Box component="span">
                      {alert.description}
                    </Box>
                  )}
                </Typography>
              </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: { xs: 4, sm: 0 }, flexShrink: 0 }}>
              {alert.actionLabel && (
                alert.actionHref ? (
                  <Button
                    component={Link}
                    href={alert.actionHref}
                    size="small"
                    variant="contained"
                    sx={{
                      backgroundColor: cfg.btnBg,
                      color: 'background.paper',
                      '&:hover': { backgroundColor: cfg.btnBg, opacity: 0.9 },
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      textTransform: 'none',
                      px: 1.75,
                      py: 0.4,
                      minHeight: 28,
                    }}
                  >
                    {alert.actionLabel}
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={alert.onAction}
                    sx={{
                      backgroundColor: cfg.btnBg,
                      color: 'background.paper',
                      '&:hover': { backgroundColor: cfg.btnBg, opacity: 0.9 },
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      textTransform: 'none',
                      px: 1.75,
                      py: 0.4,
                      minHeight: 28,
                    }}
                  >
                    {alert.actionLabel}
                  </Button>
                )
              )}

              {alert.dismissible !== false && (
                <IconButton
                  size="small"
                  onClick={() => handleDismiss(alert.id)}
                  sx={{ color: cfg.textColor, opacity: 0.6, p: 0.25, '&:hover': { opacity: 1 } }}
                  aria-label="Скрыть предупреждение"
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
}

export default CriticalAlertBanner;
