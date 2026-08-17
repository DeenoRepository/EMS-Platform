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
  iconBgColor = 'rgba(2, 132, 199, 0.08)',
  iconColor = '#0284c7',
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
        borderColor: active ? (accentColor || '#0284c7') : '#e2e8f0',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        boxShadow: active
          ? `0 4px 12px 0 ${accentColor ? `${accentColor}25` : 'rgba(2, 132, 199, 0.15)'}`
          : '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: isClickable ? 'pointer' : 'default',
        ...(isClickable && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 16px -2px rgba(15, 23, 42, 0.08)',
            borderColor: accentColor || '#cbd5e1',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        }),
      }}
    >
      {/* Accent top border stripe when active or accentColor provided */}
      {accentColor && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            backgroundColor: accentColor,
          }}
        />
      )}

      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.25 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: '#64748b',
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
              width: 36,
              height: 36,
              borderRadius: '10px',
              backgroundColor: iconBgColor,
              color: iconColor,
              flexShrink: 0,
              transition: 'transform 0.15s ease',
            }}
          >
            {icon}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          {loading ? (
            <Skeleton variant="text" width={70} height={38} />
          ) : (
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontSize: '1.5rem',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#0f172a',
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
                  <TrendingUpIcon sx={{ fontSize: '13px !important' }} />
                ) : trend.direction === 'down' ? (
                  <TrendingDownIcon sx={{ fontSize: '13px !important' }} />
                ) : (
                  <TrendingFlatIcon sx={{ fontSize: '13px !important' }} />
                )
              }
              label={`${trend.value}${trend.label ? ` ${trend.label}` : ''}`}
              sx={{
                height: 20,
                fontSize: '0.6875rem',
                fontWeight: 700,
                backgroundColor:
                  trend.direction === 'up'
                    ? '#f0fdf4'
                    : trend.direction === 'down'
                    ? '#fef2f2'
                    : '#f8fafc',
                color:
                  trend.direction === 'up'
                    ? '#16a34a'
                    : trend.direction === 'down'
                    ? '#dc2626'
                    : '#64748b',
                border: '1px solid',
                borderColor:
                  trend.direction === 'up'
                    ? '#bbf7d0'
                    : trend.direction === 'down'
                    ? '#fecaca'
                    : '#e2e8f0',
                '& .MuiChip-icon': {
                  color: 'inherit',
                  ml: 0.5,
                  mr: -0.25,
                },
              }}
            />
          )}
        </Box>

        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.75,
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            {loading ? <Skeleton variant="text" width="60%" /> : subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
