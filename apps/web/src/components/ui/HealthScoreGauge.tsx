'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
  Stack,
  Tooltip,
  useTheme,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export interface HealthMetricBreakdown {
  label: string;
  value: string | number;
  color?: string;
  status?: 'good' | 'warning' | 'critical';
}

export interface HealthScoreGaugeProps {
  /** Score value from 0 to 100 */
  score: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Title above gauge */
  title?: string;
  /** Subtitle or description */
  subtitle?: string;
  /** Additional breakdown metrics */
  metrics?: HealthMetricBreakdown[];
  /** Loading state */
  loading?: boolean;
  /** Container styling */
  paper?: boolean;
  /** Custom onClick handler for navigation/drilldown */
  onClick?: () => void;
  className?: string;
}

export function HealthScoreGauge({
  score,
  size = 'md',
  title = 'Индекс состояния',
  subtitle,
  metrics,
  loading = false,
  paper = true,
  onClick,
  className,
}: HealthScoreGaugeProps) {
  const theme = useTheme();

  // Normalize score between 0 and 100
  const normalizedScore = Math.min(Math.max(Math.round(score || 0), 0), 100);

  // Status configuration
  let color = theme.palette.success.main;
  let statusLabel = 'Отличное';
  let StatusIcon = CheckCircleOutlineIcon;
  let statusBg = theme.palette.success.light;

  if (normalizedScore < 50) {
    color = theme.palette.error.main;
    statusLabel = 'Критическое';
    StatusIcon = ErrorOutlineIcon;
    statusBg = theme.palette.error.light;
  } else if (normalizedScore < 80) {
    color = theme.palette.warning.main;
    statusLabel = 'Требует внимания';
    StatusIcon = WarningAmberIcon;
    statusBg = theme.palette.warning.light;
  }

  // Size dimensions
  const dimensions = {
    sm: { svgSize: 90, stroke: 8, radius: 36, fontSize: '1.25rem', subSize: '0.6875rem' },
    md: { svgSize: 130, stroke: 10, radius: 52, fontSize: '1.75rem', subSize: '0.75rem' },
    lg: { svgSize: 170, stroke: 12, radius: 68, fontSize: '2.25rem', subSize: '0.8125rem' },
  }[size];

  const circumference = 2 * Math.PI * dimensions.radius;
  // Use a 270-degree arc gauge (0.75 of full circle)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * normalizedScore) / 100;
  const rotationOffset = 135; // Rotate so gap is at bottom

  const Content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: size === 'sm' ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: size === 'sm' ? 2 : 1.5,
        p: size === 'sm' ? 1.5 : 2.5,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
            }
          : undefined,
      }}
      className={className}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${normalizedScore}%, статус: ${statusLabel}`}
    >
      {/* Gauge SVG Arc */}
      <Box sx={{ position: 'relative', width: dimensions.svgSize, height: dimensions.svgSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <Skeleton variant="circular" width={dimensions.svgSize} height={dimensions.svgSize} />
        ) : (
          <>
            <svg
              width={dimensions.svgSize}
              height={dimensions.svgSize}
              viewBox={`0 0 ${dimensions.svgSize} ${dimensions.svgSize}`}
              style={{ transform: `rotate(${rotationOffset}deg)` }}
            >
              {/* Background Track Arc */}
              <circle
                cx={dimensions.svgSize / 2}
                cy={dimensions.svgSize / 2}
                r={dimensions.radius}
                fill="transparent"
                stroke={theme.palette.divider}
                strokeWidth={dimensions.stroke}
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeLinecap="round"
              />
              {/* Animated Value Arc */}
              <circle
                cx={dimensions.svgSize / 2}
                cy={dimensions.svgSize / 2}
                r={dimensions.radius}
                fill="transparent"
                stroke={color}
                strokeWidth={dimensions.stroke}
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease',
                }}
              />
            </svg>

            {/* Inner Score Value */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{
                  fontSize: dimensions.fontSize,
                  color,
                  lineHeight: 1,
                  fontFamily: 'monospace',
                  letterSpacing: '-0.02em',
                }}
              >
                {normalizedScore}
                <Typography component="span" sx={{ fontSize: '0.65em', fontWeight: 700, ml: 0.25 }}>
                  %
                </Typography>
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* Status Chip (Cleanly positioned below the gauge) */}
      {!loading && (
        <Chip
          icon={<StatusIcon sx={{ fontSize: '14px !important' }} />}
          label={statusLabel}
          size="small"
          sx={{
            height: 24,
            px: 1,
            fontSize: '0.75rem',
            fontWeight: 700,
            bgcolor: statusBg,
            color,
            borderRadius: '20px',
            border: '1px solid',
            borderColor: statusBg,
            '& .MuiChip-icon': { color: 'inherit' },
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      )}

      {/* Title, Subtitle and Breakdown Metrics */}
      <Box sx={{ textAlign: size === 'sm' ? 'left' : 'center', width: size === 'sm' ? 'auto' : '100%' }}>
        {loading ? (
          <>
            <Skeleton variant="text" width={120} height={20} />
            <Skeleton variant="text" width={80} height={14} />
          </>
        ) : (
          <>
            {title && (
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.875rem', lineHeight: 1.2, color: 'text.primary' }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, fontSize: dimensions.subSize, color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            )}
          </>
        )}

        {/* Optional Breakdown Metrics row */}
        {metrics && metrics.length > 0 && !loading && (
          <Stack
            direction="row"
            spacing={1.5}
            justifyContent="center"
            sx={{
              mt: 1.75,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              width: '100%',
            }}
          >
            {metrics.map((m, idx) => (
              <Tooltip key={idx} title={m.label} arrow placement="top">
                <Box sx={{ textAlign: 'center', px: 0.5 }}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      display: 'block',
                      color: m.color || (m.status === 'critical' ? 'error.main' : m.status === 'warning' ? 'warning.main' : 'text.primary'),
                      fontSize: '0.8125rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {m.value}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                    {m.label}
                  </Typography>
                </Box>
              </Tooltip>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );

  if (paper) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          backgroundColor: 'background.paper',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        }}
      >
        {Content}
      </Paper>
    );
  }

  return Content;
}

export default HealthScoreGauge;
