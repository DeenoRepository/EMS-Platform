'use client';

import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Skeleton,
  Chip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { EmptyState } from './EmptyState';
import BarChartIcon from '@mui/icons-material/BarChart';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  actions?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  minHeight?: number | string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  value,
  trend,
  actions,
  loading = false,
  empty = false,
  emptyMessage = 'Нет данных для отображения графика за выбранный период',
  minHeight = 320,
  children,
  className,
}: ChartCardProps) {
  const getTrendChip = () => {
    if (!trend) return null;
    const isUp = trend.direction === 'up';
    const isDown = trend.direction === 'down';

    return (
      <Chip
        icon={
          isUp ? (
            <TrendingUpIcon sx={{ fontSize: '13px !important' }} />
          ) : isDown ? (
            <TrendingDownIcon sx={{ fontSize: '13px !important' }} />
          ) : (
            <TrendingFlatIcon sx={{ fontSize: '13px !important' }} />
          )
        }
        label={`${isUp ? '+' : ''}${trend.value}${trend.label ? ` ${trend.label}` : ''}`}
        size="small"
        sx={{
          height: 22,
          fontSize: '0.6875rem',
          fontWeight: 700,
          fontFeatureSettings: '"tnum"',
          borderRadius: '20px',
          bgcolor: isUp ? 'success.light' : isDown ? 'error.light' : 'action.hover',
          color: isUp ? 'success.dark' : isDown ? 'error.dark' : 'text.secondary',
          border: '1px solid',
          borderColor: isUp ? 'success.light' : isDown ? 'error.light' : 'divider',
        }}
      />
    );
  };

  return (
    <Paper
      elevation={0}
      className={className}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight,
        bgcolor: 'background.paper',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h6"
            fontWeight={700}
            color="text.primary"
            sx={{ fontSize: { xs: '0.9375rem', sm: '1.05rem' }, lineHeight: 1.3, letterSpacing: '-0.015em' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}

          {value !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="h5" fontWeight={800} sx={{ fontFeatureSettings: '"tnum"', color: 'text.primary' }}>
                {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
              </Typography>
              {getTrendChip()}
            </Box>
          )}
        </Box>

        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 220, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Skeleton variant="rectangular" width="100%" height="80%" sx={{ borderRadius: '8px' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton variant="text" width="20%" />
              <Skeleton variant="text" width="20%" />
              <Skeleton variant="text" width="20%" />
            </Box>
          </Box>
        ) : empty ? (
          <EmptyState
            icon={<BarChartIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
            title="Данные отсутствуют"
            description={emptyMessage}
            minHeight={200}
          />
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
}
