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
  { bg: string; border: string; color: string; icon: React.ComponentType<any>; label: string }
> = {
  CRITICAL: {
    bg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)',
    border: 'rgba(220, 38, 38, 0.3)',
    color: '#dc2626',
    icon: ErrorOutlineIcon,
    label: 'Критично',
  },
  WARNING: {
    bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(217, 119, 6, 0.02) 100%)',
    border: 'rgba(217, 119, 6, 0.3)',
    color: '#d97706',
    icon: WarningAmberIcon,
    label: 'Внимание',
  },
  INFO: {
    bg: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(2, 132, 199, 0.02) 100%)',
    border: 'rgba(2, 132, 199, 0.3)',
    color: '#0284c7',
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
    <Stack spacing={1.5} sx={{ mb: 3 }} className={className}>
      {visibleAlerts.map((alert) => {
        const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
        const IconComp = cfg.icon;

        return (
          <Paper
            key={alert.id}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1 }}>
              <Box
                sx={{
                  p: 0.75,
                  borderRadius: 1.5,
                  bgcolor: `${cfg.color}15`,
                  color: cfg.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mt: 0.25,
                }}
              >
                <IconComp sx={{ fontSize: 20 }} />
              </Box>

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: cfg.color, fontSize: '0.875rem' }}>
                    {alert.title}
                  </Typography>

                  {alert.count !== undefined && (
                    <Chip
                      label={`${alert.count} поз.`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        bgcolor: cfg.color,
                        color: '#ffffff',
                        borderRadius: '4px',
                      }}
                    />
                  )}

                  {alert.badgeLabel && (
                    <Chip
                      label={alert.badgeLabel}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 18,
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        borderColor: cfg.color,
                        color: cfg.color,
                        borderRadius: '4px',
                      }}
                    />
                  )}
                </Box>

                {alert.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                    {alert.description}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: { xs: 5, sm: 0 } }}>
              {alert.actionLabel && (
                alert.actionHref ? (
                  <Button
                    component={Link}
                    href={alert.actionHref}
                    size="small"
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      bgcolor: cfg.color,
                      color: '#ffffff',
                      '&:hover': { bgcolor: cfg.color, opacity: 0.9 },
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: 1.5,
                      textTransform: 'none',
                    }}
                  >
                    {alert.actionLabel}
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={alert.onAction}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      bgcolor: cfg.color,
                      color: '#ffffff',
                      '&:hover': { bgcolor: cfg.color, opacity: 0.9 },
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: 1.5,
                      textTransform: 'none',
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
                  sx={{ color: 'text.secondary', opacity: 0.7, '&:hover': { opacity: 1 } }}
                  aria-label="Скрыть предупреждение"
                >
                  <CloseIcon fontSize="small" />
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
