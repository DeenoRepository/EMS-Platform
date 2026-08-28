'use client';

import React from 'react';
import { Card, CardContent, Box, Typography, Skeleton, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  accentColor?: string;
  active?: boolean;
  loading?: boolean;
  onClick?: () => void;
  trend?: {
    value: number | string;
    label?: string;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'transparent',
  iconColor = 'primary.main',
  accentColor,
  active = false,
  loading = false,
  onClick,
  trend,
  className,
}: StatCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <Card
      className={className}
      onClick={onClick}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: active
          ? (accentColor || 'primary.main')
          : (accentColor ? accentColor : 'divider'),
        borderRadius: '12px',
        backgroundColor: 'background.paper',
        boxShadow: active
          ? `0 4px 12px 0 rgba(2, 132, 199, 0.12)`
          : '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: isClickable ? 'pointer' : 'default',
        ...(isClickable && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: (theme) => `0 6px 16px -2px rgba(15, 23, 42, 0.08)`,
            borderColor: accentColor || 'primary.main',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        }),
      }}
    >
      <CardContent sx={{ p: '18px !important' }}>
        {/* Header: Title Left, Icon Right */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.8125rem',
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor || iconColor,
              flexShrink: 0,
              fontSize: 20,
              '& svg': {
                fontSize: 20,
              },
            }}
          >
            {icon}
          </Box>
        </Box>

        {/* Value & Trend */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 0.5 }}>
          {loading ? (
            <Skeleton variant="text" width={60} height={44} />
          ) : (
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                fontSize: '1.875rem', // 30px
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: 'text.primary',
                fontFeatureSettings: '"tnum"',
              }}
            >
              {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
            </Typography>
          )}

          {trend && !loading && (
            <Chip
              size="small"
              icon={
                trend.direction === 'up' ? (
                  <TrendingUpIcon sx={{ fontSize: '12px !important' }} />
                ) : trend.direction === 'down' ? (
                  <TrendingDownIcon sx={{ fontSize: '12px !important' }} />
                ) : (
                  <TrendingFlatIcon sx={{ fontSize: '12px !important' }} />
                )
              }
              label={`${trend.value}${trend.label ? ` ${trend.label}` : ''}`}
              sx={{
                height: 18,
                fontSize: '0.6875rem',
                fontWeight: 700,
                backgroundColor:
                  trend.direction === 'up'
                    ? 'success.light'
                    : trend.direction === 'down'
                    ? 'error.light'
                    : 'grey.50',
                color:
                  trend.direction === 'up'
                    ? 'success.main'
                    : trend.direction === 'down'
                    ? 'error.main'
                    : 'text.secondary',
                border: '1px solid',
                borderColor:
                  trend.direction === 'up'
                    ? 'success.light'
                    : trend.direction === 'down'
                    ? 'error.light'
                    : 'divider',
                '& .MuiChip-icon': {
                  color: 'inherit',
                  ml: 0.5,
                  mr: -0.25,
                },
              }}
            />
          )}
        </Box>

        {/* Subtitle bottom */}
        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.5,
              color: 'text.disabled',
              fontSize: '0.75rem',
              fontWeight: 400,
              lineHeight: 1.3,
            }}
          >
            {loading ? <Skeleton variant="text" width="50%" /> : subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
