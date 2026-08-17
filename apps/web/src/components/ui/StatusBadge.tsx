'use client';

import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

export type StatusVariant = 'subtle' | 'dot' | 'outlined' | 'solid';

export interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: StatusVariant;
  size?: 'small' | 'medium';
  showIcon?: boolean;
  tooltip?: string;
  className?: string;
}

interface StatusTheme {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

const STATUS_CONFIG_MAP: Record<string, StatusTheme> = {
  // EPS Equipment Statuses
  ACTIVE: {
    label: 'В работе',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  UNDER_REPAIR: {
    label: 'В ремонте',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: <BuildCircleIcon sx={{ fontSize: 13 }} />,
  },
  IN_STORAGE: {
    label: 'На складе',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    icon: <InventoryIcon sx={{ fontSize: 13 }} />,
  },
  DECOMMISSIONED: {
    label: 'Списано',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },

  // Approvals Statuses
  PENDING: {
    label: 'На согласовании',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  APPROVED: {
    label: 'Одобрено',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  REJECTED: {
    label: 'Отклонено',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },
  CANCELLED: {
    label: 'Отозвано',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: <CancelIcon sx={{ fontSize: 13 }} />,
  },

  // WMS Inventory & Stock Statuses
  IN_PROGRESS: {
    label: 'В процессе',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  COMPLETED: {
    label: 'Завершено',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
  DRAFT: {
    label: 'Черновик',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
  },
  LOW_STOCK: {
    label: 'Дефицит ТМЦ',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: <WarningAmberIcon sx={{ fontSize: 13 }} />,
  },
  NORMAL_STOCK: {
    label: 'В наличии',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: <CheckCircleIcon sx={{ fontSize: 13 }} />,
  },
};

export function StatusBadge({
  status,
  label,
  variant = 'subtle',
  size = 'small',
  showIcon = true,
  tooltip,
  className,
}: StatusBadgeProps) {
  const normKey = (status || '').toUpperCase().trim();
  const config = STATUS_CONFIG_MAP[normKey] || {
    label: label || status || '—',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  };

  const displayText = label || config.label;

  const content = (
    <Box
      component="span"
      className={className}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.65,
        px: size === 'small' ? 1 : 1.25,
        py: size === 'small' ? 0.25 : 0.45,
        borderRadius: '6px',
        fontSize: size === 'small' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        fontFeatureSettings: '"tnum"',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        ...(variant === 'subtle' && {
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
        }),
        ...(variant === 'dot' && {
          backgroundColor: '#ffffff',
          color: '#334155',
          border: '1px solid #e2e8f0',
        }),
        ...(variant === 'outlined' && {
          backgroundColor: 'transparent',
          color: config.color,
          border: `1px solid ${config.color}`,
        }),
        ...(variant === 'solid' && {
          backgroundColor: config.color,
          color: '#ffffff',
          border: 'none',
        }),
      }}
    >
      {variant === 'dot' ? (
        <Box
          component="span"
          sx={{
            width: size === 'small' ? 6 : 8,
            height: size === 'small' ? 6 : 8,
            borderRadius: '50%',
            backgroundColor: config.color,
            flexShrink: 0,
            boxShadow: `0 0 0 2px ${config.bg}`,
          }}
        />
      ) : showIcon ? (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', color: variant === 'solid' ? '#ffffff' : config.color, flexShrink: 0 }}>
          {config.icon}
        </Box>
      ) : null}

      <Typography
        component="span"
        sx={{
          fontSize: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
        }}
      >
        {displayText}
      </Typography>
    </Box>
  );

  if (tooltip) {
    return <Tooltip title={tooltip} arrow>{content}</Tooltip>;
  }

  return content;
}
