'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';

export interface ServiceHealthInfo {
  status: 'healthy' | 'unreachable' | 'degraded' | 'disabled';
  name: string;
  host?: string;
  database?: string;
  error?: string;
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

export const initialOfflineReport: SystemHealthReport = {
  isReady: false,
  timestamp: new Date().toISOString(),
  services: {
    database: {
      status: 'unreachable',
      name: 'Database Service',
    },
    storage: { status: 'healthy', name: 'Storage' },
    ldap: { status: 'disabled', name: 'LDAP' },
  },
};

export function useSystemHealth(autoRefreshIntervalMs = 5000) {
  const [health, setHealth] = useState<SystemHealthReport>(initialOfflineReport);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState<boolean>(false);

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
        setHealth(initialOfflineReport);
        setIsReady(false);
      }
    } catch {
      setHealth(initialOfflineReport);
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
    <Box sx={{ textAlign: 'center', py: 1.5, px: 0.5 }} className={className}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          boxShadow: '0 4px 14px rgba(220, 38, 38, 0.18)',
        }}
      >
        <CloudOffOutlinedIcon sx={{ fontSize: 34 }} />
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: '#475569',
          fontSize: '0.875rem',
          mb: 3,
          lineHeight: 1.55,
          maxWidth: 320,
          mx: 'auto',
        }}
      >
        В данный момент сервис временно недоступен. Пожалуйста, повторите попытку через некоторое время или обратитесь к системному администратору.
      </Typography>

      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={onRefresh}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon sx={{ fontSize: 18 }} />}
        sx={{
          py: 1.35,
          fontWeight: 700,
          fontSize: '0.875rem',
          borderRadius: 2,
          textTransform: 'none',
          backgroundColor: '#0284c7',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
          '&:hover': {
            backgroundColor: '#0369a1',
            boxShadow: '0 6px 18px rgba(2, 132, 199, 0.45)',
          },
        }}
      >
        {loading ? 'Проверка подключения...' : 'Проверить доступность сервиса'}
      </Button>
    </Box>
  );
}

export default ServiceUnavailableCard;
