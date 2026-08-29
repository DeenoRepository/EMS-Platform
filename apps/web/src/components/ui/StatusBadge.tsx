'use client';

import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { StatusTheme, getStatusTheme } from './statusBadgeConfig';

export type StatusVariant = 'subtle' | 'dot' | 'outlined' | 'solid';
export type { StatusTheme };

export interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: StatusVariant;
  size?: 'small' | 'medium';
  showIcon?: boolean;
  tooltip?: string;
  className?: string;
  customColor?: string;
  customBg?: string;
  customBorder?: string;
  customIcon?: React.ReactNode;
  customConfig?: Partial<StatusTheme>;
}

export function StatusBadge({
  status,
  label,
  variant = 'subtle',
  size = 'small',
  showIcon = true,
  tooltip,
  className,
  customColor,
  customBg,
  customBorder,
  customIcon,
  customConfig,
}: StatusBadgeProps) {
  const baseConfig = getStatusTheme(status, label);

  const config: StatusTheme = {
    label: customConfig?.label || label || baseConfig.label,
    color: customColor || customConfig?.color || baseConfig.color,
    bg: customBg || customConfig?.bg || (customColor ? `${customColor}14` : baseConfig.bg),
    border: customBorder || customConfig?.border || (customColor ? `${customColor}40` : baseConfig.border),
    icon: customIcon || customConfig?.icon || baseConfig.icon,
  };

  const displayText = config.label;

  const content = (
    <Box
      component="span"
      className={className}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.8,
        px: size === 'small' ? 1.25 : 1.5,
        py: size === 'small' ? 0.35 : 0.5,
        borderRadius: '20px',
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        fontFeatureSettings: '"tnum"',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        backgroundColor: config.bg,
        color: config.color,
        ...(variant === 'subtle' && {
          border: `1px solid ${config.border}`,
        }),
        ...(variant === 'dot' && {
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
        }),
        ...(variant === 'outlined' && {
          backgroundColor: 'transparent',
          color: config.color,
          border: `1px solid ${config.color}`,
        }),
        ...(variant === 'solid' && {
          backgroundColor: config.color,
          color: 'background.paper',
          border: 'none',
        }),
      }}
    >
      {/* Status Icon or Dot Indicator */}
      {showIcon && config.icon ? (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'small' ? '0.8125rem' : '0.9375rem',
            color: 'inherit',
            flexShrink: 0,
            '& svg': {
              fontSize: size === 'small' ? '0.8125rem' : '0.9375rem',
            },
          }}
        >
          {config.icon}
        </Box>
      ) : (
        <Box
          component="span"
          sx={{
            width: size === 'small' ? 6 : 7,
            height: size === 'small' ? 6 : 7,
            borderRadius: '50%',
            backgroundColor: variant === 'solid' ? 'background.paper' : config.color,
            flexShrink: 0,
          }}
        />
      )}

      <Typography
        component="span"
        sx={{
          fontSize: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          lineHeight: 'inherit',
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
