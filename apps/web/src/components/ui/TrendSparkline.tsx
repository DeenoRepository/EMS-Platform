'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
  Stack,
  useTheme,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

export interface TrendDataPoint {
  value: number;
  label?: string;
  date?: string;
}

export interface TrendSparklineProps {
  /** Array of values or data points */
  data: Array<number | TrendDataPoint>;
  /** Optional title */
  title?: string;
  /** Current / primary headline value to display */
  currentValue?: string | number;
  /** Unit of measurement (e.g. 'ч', 'дн', 'шт', 'тыс. ₽') */
  unit?: string;
  /** Percentage change compared to previous period */
  changePercent?: number;
  /** Period label (e.g. 'за 30 дней', 'к пред. месяцу') */
  periodLabel?: string;
  /** Height of SVG graph (default: 54px) */
  height?: number;
  /** Stroke and fill accent color */
  color?: string;
  /** Show interactive hover tooltip */
  interactive?: boolean;
  /** Wrap in paper card */
  paper?: boolean;
  /** Loading state */
  loading?: boolean;
  className?: string;
}

export function TrendSparkline({
  data,
  title,
  currentValue,
  unit,
  changePercent,
  periodLabel = 'vs пред. период',
  height = 54,
  color = '#0284c7',
  interactive = true,
  paper = true,
  loading = false,
  className,
}: TrendSparklineProps) {
  const theme = useTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize points
  const points: TrendDataPoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, i) => {
      if (typeof d === 'number') {
        return { value: d, label: `Точка ${i + 1}` };
      }
      return d;
    });
  }, [data]);

  // Compute scale and SVG path
  const { pathD, areaD, minVal, maxVal, coordinates } = useMemo(() => {
    if (points.length < 2) {
      return { pathD: '', areaD: '', minVal: 0, maxVal: 0, coordinates: [] };
    }

    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 300; // Normalized virtual SVG coordinate width
    const padY = 6;
    const availH = height - padY * 2;

    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - padY - ((p.value - min) / range) * availH;
      return { x, y, ...p };
    });

    // Build smooth cubic bezier curve
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    const area = `${d} L ${width} ${height} L 0 ${height} Z`;

    return { pathD: d, areaD: area, minVal: min, maxVal: max, coordinates: coords };
  }, [points, height]);

  // Gradient ID unique per render
  const gradientId = useMemo(() => `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`, []);

  // Determine trend direction
  const isPositive = changePercent !== undefined ? changePercent > 0 : false;
  const isNegative = changePercent !== undefined ? changePercent < 0 : false;
  const isFlat = changePercent !== undefined ? changePercent === 0 : true;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current || coordinates.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const targetIdx = Math.round(relX * (coordinates.length - 1));
    const clamped = Math.max(0, Math.min(targetIdx, coordinates.length - 1));
    setHoverIndex(clamped);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null && coordinates[hoverIndex] ? coordinates[hoverIndex] : null;

  const Content = (
    <Box
      sx={{
        p: paper ? 2 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      className={className}
    >
      {/* Header Info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          {title && (
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.25 }}>
              {title}
            </Typography>
          )}
          {loading ? (
            <Skeleton variant="text" width={100} height={32} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{
                  fontFamily: 'monospace',
                  letterSpacing: '-0.02em',
                  color: 'text.primary',
                  lineHeight: 1.1,
                }}
              >
                {activePoint ? activePoint.value : currentValue !== undefined ? currentValue : points[points.length - 1]?.value ?? '—'}
              </Typography>
              {unit && (
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {unit}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {/* Trend delta badge */}
        {changePercent !== undefined && !loading && (
          <Box sx={{ textAlign: 'right' }}>
            <Chip
              icon={
                isPositive ? (
                  <TrendingUpIcon sx={{ fontSize: '13px !important' }} />
                ) : isNegative ? (
                  <TrendingDownIcon sx={{ fontSize: '13px !important' }} />
                ) : (
                  <TrendingFlatIcon sx={{ fontSize: '13px !important' }} />
                )
              }
              label={`${isPositive ? '+' : ''}${changePercent}%`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.6875rem',
                fontWeight: 700,
                borderRadius: '20px',
                bgcolor: isPositive
                  ? '#ecfdf5'
                  : isNegative
                  ? '#fef2f2'
                  : '#f1f5f9',
                color: isPositive ? '#15803d' : isNegative ? '#b91c1c' : '#475569',
                border: '1px solid',
                borderColor: isPositive ? '#a7f3d0' : isNegative ? '#fecaca' : '#e2e8f0',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
            {periodLabel && (
              <Typography variant="caption" sx={{ display: 'block', fontSize: '0.625rem', mt: 0.25, color: '#64748b' }}>
                {periodLabel}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* SVG Sparkline Container */}
      <Box
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: 'relative',
          width: '100%',
          height,
          cursor: interactive ? 'crosshair' : 'default',
        }}
      >
        {loading ? (
          <Skeleton variant="rounded" width="100%" height={height} sx={{ borderRadius: '8px' }} />
        ) : points.length >= 2 ? (
          <>
            <svg
              width="100%"
              height={height}
              viewBox={`0 0 300 ${height}`}
              preserveAspectRatio="none"
              style={{ overflow: 'visible', display: 'block' }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Area Under Curve */}
              <path d={areaD} fill={`url(#${gradientId})`} />

              {/* Sparkline Curve */}
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* End / Current dot marker */}
              {coordinates.length > 0 && (
                <circle
                  cx={coordinates[coordinates.length - 1].x}
                  cy={coordinates[coordinates.length - 1].y}
                  r={3.5}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              )}

              {/* Active hover vertical line & dot */}
              {activePoint && (
                <>
                  <line
                    x1={activePoint.x}
                    y1={0}
                    x2={activePoint.x}
                    y2={height}
                    stroke={color}
                    strokeWidth={1.2}
                    strokeDasharray="2 2"
                    opacity={0.7}
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={4.5}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </>
              )}
            </svg>

            {/* Hover Tooltip Overlay */}
            {activePoint && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -24,
                  left: `${(activePoint.x / 300) * 100}%`,
                  transform: 'translateX(-50%)',
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  px: 1,
                  py: 0.25,
                  borderRadius: '6px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                  zIndex: 2,
                }}
              >
                {activePoint.label || activePoint.date || `${activePoint.value} ${unit || ''}`}
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
            <Typography variant="caption">Недостаточно данных для тренда</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  if (paper) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          bgcolor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: `${color}80`,
          },
        }}
      >
        {Content}
      </Paper>
    );
  }

  return Content;
}

export default TrendSparkline;
