'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import ContactSupportOutlinedIcon from '@mui/icons-material/ContactSupportOutlined';

export interface ServiceHealthInfo {
  status: 'healthy' | 'unreachable' | 'degraded' | 'disabled';
  name: string;
  latencyMs?: number;
}

export interface SystemHealthReport {
  isReady: boolean;
  timestamp: string;
  services: {
    database: ServiceHealthInfo;
    storage: ServiceHealthInfo;
    ldap: ServiceHealthInfo;
  };
}

export function useSystemHealth(autoRefreshIntervalMs = 3000) {
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState<boolean>(true);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch('/api/system/health', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHealth(data.data);
        setIsReady(data.data.isReady);
      } else {
        setHealth(null);
        setIsReady(false);
      }
    } catch {
      setHealth(null);
      setIsReady(false);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();

    if (autoRefreshIntervalMs > 0) {
      const interval = setInterval(checkHealth, autoRefreshIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkHealth, autoRefreshIntervalMs]);

  return { health, loading, isReady, checkHealth };
}

export interface ServiceUnavailableCardProps {
  health?: SystemHealthReport | null;
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ServiceUnavailableCard({
  loading = false,
  onRefresh,
  className,
}: ServiceUnavailableCardProps) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        pt: 1,
        pb: 0.5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      className={className}
    >
      {/* Animated Status Icon Header */}
      <Box
        sx={{
          position: 'relative',
          mb: 2.5,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer Glow Halo */}
        <Box
          sx={{
            position: 'absolute',
            width: 76,
            height: 76,
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            animation: 'pulseGlow 3s infinite ease-in-out',
            '@keyframes pulseGlow': {
              '0%': { transform: 'scale(0.95)', opacity: 0.5 },
              '50%': { transform: 'scale(1.15)', opacity: 1 },
              '100%': { transform: 'scale(0.95)', opacity: 0.5 },
            },
          }}
        />

        {/* Central Icon Container */}
        <Box
          sx={{
            width: 58,
            height: 58,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px -4px rgba(220, 38, 38, 0.15)',
            zIndex: 1,
          }}
        >
          <EngineeringOutlinedIcon sx={{ fontSize: 32 }} />
        </Box>
      </Box>

      {/* Status Badge */}
      <Chip
        label="Технические работы"
        size="small"
        sx={{
          mb: 1.5,
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: 0.3,
          backgroundColor: '#fff1f2',
          color: '#be123c',
          border: '1px solid #fecdd3',
          height: 24,
          '& .MuiChip-label': {
            px: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 0.6,
            '&::before': {
              content: '""',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#e11d48',
              boxShadow: '0 0 0 2px rgba(225, 29, 72, 0.2)',
            },
          },
        }}
      />

      {/* Subtitle / Description */}
      <Typography
        variant="body2"
        sx={{
          color: '#475569',
          fontSize: '0.8125rem',
          lineHeight: 1.55,
          mb: 2.5,
          maxWidth: 330,
          fontWeight: 400,
        }}
      >
        Авторизация временно приостановлена в связи с проведением регламентных работ или отсутствием связи с сервером.
      </Typography>

      {/* Support Info Box */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          p: 1.5,
          mb: 2.75,
          borderRadius: 2,
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.25,
          textAlign: 'left',
        }}
      >
        <ContactSupportOutlinedIcon
          sx={{ fontSize: 18, color: '#0284c7', mt: 0.15, flexShrink: 0 }}
        />
        <Typography
          variant="caption"
          sx={{
            color: '#64748b',
            fontSize: '0.75rem',
            lineHeight: 1.45,
            fontWeight: 500,
          }}
        >
          При возникновении срочных вопросов обратитесь в службу технической поддержки (ИТ-отдел).
        </Typography>
      </Paper>

      {/* Primary Action Button */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={onRefresh}
        disabled={loading}
        startIcon={
          loading ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <RefreshIcon sx={{ fontSize: 18 }} />
          )
        }
        sx={{
          py: 1.2,
          fontWeight: 600,
          fontSize: '0.875rem',
          borderRadius: 2,
          textTransform: 'none',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: '#0369a1',
            boxShadow: '0 6px 16px rgba(2, 132, 199, 0.35)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        }}
      >
        {loading ? 'Проверка подключения...' : 'Проверить доступность сервиса'}
      </Button>
    </Box>
  );
}

export default ServiceUnavailableCard;
