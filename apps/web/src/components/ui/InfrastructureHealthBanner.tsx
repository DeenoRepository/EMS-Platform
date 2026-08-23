'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  CircularProgress,
  Collapse,
  Tooltip,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export interface ServiceHealthInfo {
  status: 'healthy' | 'unreachable' | 'degraded' | 'disabled';
  name: string;
  host?: string;
  database?: string;
  error?: string;
  command?: string;
  instructions?: string;
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

export interface InfrastructureHealthBannerProps {
  hideWhenHealthy?: boolean;
  onHealthChange?: (isReady: boolean, report: SystemHealthReport | null) => void;
  autoRefreshIntervalMs?: number;
  className?: string;
}

export function InfrastructureHealthBanner({
  hideWhenHealthy = true,
  onHealthChange,
  autoRefreshIntervalMs = 0,
  className,
}: InfrastructureHealthBannerProps) {
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/health', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHealth(data.data);
        if (onHealthChange) {
          onHealthChange(data.data.isReady, data.data);
        }
      } else {
        const fallbackReport: SystemHealthReport = {
          isReady: false,
          timestamp: new Date().toISOString(),
          services: {
            database: {
              status: 'unreachable',
              name: 'PostgreSQL Database',
              error: data.error || 'Не удалось получить статус системы',
              command: 'docker compose up -d postgres ldap',
            },
            storage: { status: 'healthy', name: 'Файловое хранилище' },
            ldap: { status: 'disabled', name: 'LDAP' },
          },
        };
        setHealth(fallbackReport);
        if (onHealthChange) {
          onHealthChange(false, fallbackReport);
        }
      }
    } catch (err: any) {
      const offlineReport: SystemHealthReport = {
        isReady: false,
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: 'unreachable',
            name: 'PostgreSQL Database',
            error: err.message || 'Сетевой сбой при проверке инфраструктуры',
            command: 'docker compose up -d postgres ldap',
          },
          storage: { status: 'healthy', name: 'Файловое хранилище' },
          ldap: { status: 'disabled', name: 'LDAP' },
        },
      };
      setHealth(offlineReport);
      if (onHealthChange) {
        onHealthChange(false, offlineReport);
      }
    } finally {
      setLoading(false);
    }
  }, [onHealthChange]);

  useEffect(() => {
    checkHealth();

    if (autoRefreshIntervalMs > 0) {
      const interval = setInterval(checkHealth, autoRefreshIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkHealth, autoRefreshIntervalMs]);

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!health && loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1.5, gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Диагностика инфраструктуры...
        </Typography>
      </Box>
    );
  }

  if (!health) return null;

  const isHealthy = health.isReady && health.services.database.status === 'healthy';

  if (isHealthy && hideWhenHealthy) {
    return null;
  }

  const db = health.services.database;
  const isDbDown = db.status === 'unreachable';
  const defaultCommand = db.command || 'docker compose up -d postgres ldap';

  return (
    <Collapse in={!isHealthy} timeout="auto">
      <Paper
        elevation={0}
        sx={{
          p: 2.25,
          mb: 2.5,
          borderRadius: '12px',
          backgroundColor: '#fef2f2',
          border: '1.5px solid #fecaca',
          boxShadow: '0 4px 14px -2px rgba(220, 38, 38, 0.12)',
        }}
        className={className}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              mt: 0.25,
            }}
          >
            {isDbDown ? <ErrorOutlineIcon sx={{ fontSize: 22 }} /> : <WarningAmberIcon sx={{ fontSize: 22 }} />}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#991b1b', fontSize: '0.875rem' }}>
                {isDbDown
                  ? 'База данных PostgreSQL отключена'
                  : 'Компоненты инфраструктуры требуют внимания'}
              </Typography>

              <Button
                size="small"
                variant="outlined"
                onClick={checkHealth}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={12} color="inherit" /> : <RefreshIcon sx={{ fontSize: 15 }} />}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  py: 0.25,
                  px: 1.25,
                  borderRadius: '6px',
                  borderColor: '#fca5a5',
                  color: '#991b1b',
                  backgroundColor: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#fff1f2',
                    borderColor: '#f87171',
                  },
                }}
              >
                {loading ? 'Проверка...' : 'Проверить снова'}
              </Button>
            </Box>

            <Typography variant="body2" sx={{ color: '#7f1d1d', fontSize: '0.8125rem', mb: 1.5, lineHeight: 1.45 }}>
              {db.error || `Не удается установить соединение с сервером БД (${db.host || '127.0.0.1:5432'}). Авторизация и операции с данными заблокированы.`}
            </Typography>

            {/* Instruction / Run Command Card */}
            <Box
              sx={{
                p: 1.25,
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600, fontSize: '0.7rem' }}>
                  Команда для запуска в терминале:
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontSize: '0.78125rem',
                    wordBreak: 'break-all',
                    display: 'block',
                  }}
                >
                  {defaultCommand}
                </Typography>
              </Box>

              <Tooltip title={copied ? 'Скопировано!' : 'Скопировать команду'}>
                <IconButton
                  size="small"
                  onClick={() => handleCopyCommand(defaultCommand)}
                  sx={{
                    color: copied ? '#16a34a' : '#64748b',
                    backgroundColor: copied ? '#dcfce7' : '#f1f5f9',
                    p: 0.75,
                    borderRadius: '6px',
                    '&:hover': {
                      backgroundColor: copied ? '#bbf7d0' : '#e2e8f0',
                    },
                  }}
                >
                  {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Collapse>
  );
}

export default InfrastructureHealthBanner;
