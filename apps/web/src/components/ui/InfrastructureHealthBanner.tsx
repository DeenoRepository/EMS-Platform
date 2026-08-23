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
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined';

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

export const initialOfflineReport: SystemHealthReport = {
  isReady: false,
  timestamp: new Date().toISOString(),
  services: {
    database: {
      status: 'unreachable',
      name: 'PostgreSQL Database',
      host: '127.0.0.1:5432',
      database: 'ems_db',
      error: 'Сервер PostgreSQL на 127.0.0.1:5432 недоступен (порт закрыт или контейнер ems_postgres отключен).',
      command: 'docker compose up -d postgres ldap',
      instructions: 'Запустите Docker Desktop и выполните: docker compose up -d postgres ldap',
    },
    storage: { status: 'healthy', name: 'Файловое хранилище' },
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
        const fallbackReport: SystemHealthReport = {
          isReady: false,
          timestamp: new Date().toISOString(),
          services: {
            database: {
              status: 'unreachable',
              name: 'PostgreSQL Database',
              host: '127.0.0.1:5432',
              database: 'ems_db',
              error: data.error || 'Не удалось получить статус системы',
              command: 'docker compose up -d postgres ldap',
            },
            storage: { status: 'healthy', name: 'Файловое хранилище' },
            ldap: { status: 'disabled', name: 'LDAP' },
          },
        };
        setHealth(fallbackReport);
        setIsReady(false);
      }
    } catch (err: any) {
      const offlineReport: SystemHealthReport = {
        isReady: false,
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: 'unreachable',
            name: 'PostgreSQL Database',
            host: '127.0.0.1:5432',
            database: 'ems_db',
            error: err?.name === 'AbortError'
              ? 'Превышено время ожидания ответа от сервера базы данных'
              : (err.message || 'Сетевой сбой при проверке инфраструктуры'),
            command: 'docker compose up -d postgres ldap',
          },
          storage: { status: 'healthy', name: 'Файловое хранилище' },
          ldap: { status: 'disabled', name: 'LDAP' },
        },
      };
      setHealth(offlineReport);
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
  health: SystemHealthReport | null;
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ServiceUnavailableCard({
  health,
  loading = false,
  onRefresh,
  className,
}: ServiceUnavailableCardProps) {
  const [copied, setCopied] = useState(false);

  const db = health?.services?.database || initialOfflineReport.services.database;
  const defaultCommand = db.command || 'docker compose up -d postgres ldap';

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ textAlign: 'center', py: 0.5 }} className={className}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.75,
          boxShadow: '0 4px 14px rgba(220, 38, 38, 0.18)',
        }}
      >
        <DnsOutlinedIcon sx={{ fontSize: 30 }} />
      </Box>

      <Typography variant="h6" fontWeight={700} sx={{ color: '#991b1b', fontSize: '1.05rem', mb: 0.75 }}>
        Сервис в данный момент недоступен
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', mb: 2.25, lineHeight: 1.5 }}>
        {db.error || `Один из обязательных узлов инфраструктуры (База данных PostgreSQL на ${db.host || '127.0.0.1:5432'}) отключен. Ввод учетных данных заблокирован до восстановления связи.`}
      </Typography>

      {/* Command Box */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 2.5,
          borderRadius: '10px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          textAlign: 'left',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.72rem' }}>
            Команда для запуска базы данных:
          </Typography>
          <Tooltip title={copied ? 'Скопировано!' : 'Скопировать'}>
            <IconButton
              size="small"
              onClick={() => handleCopyCommand(defaultCommand)}
              sx={{
                color: copied ? '#16a34a' : '#64748b',
                backgroundColor: copied ? '#dcfce7' : '#e2e8f0',
                p: 0.5,
                borderRadius: '5px',
                '&:hover': { backgroundColor: copied ? '#bbf7d0' : '#cbd5e1' },
              }}
            >
              {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
            </IconButton>
          </Tooltip>
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#0f172a',
            fontSize: '0.8rem',
            wordBreak: 'break-all',
            display: 'block',
            backgroundColor: '#ffffff',
            p: 1,
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
          }}
        >
          {defaultCommand}
        </Typography>
      </Paper>

      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={onRefresh}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon sx={{ fontSize: 18 }} />}
        sx={{
          py: 1.25,
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

export interface InfrastructureHealthBannerProps {
  hideWhenHealthy?: boolean;
  autoRefreshIntervalMs?: number;
  className?: string;
}

export function InfrastructureHealthBanner({
  hideWhenHealthy = true,
  autoRefreshIntervalMs = 5000,
  className,
}: InfrastructureHealthBannerProps) {
  const { health, loading, isReady, checkHealth } = useSystemHealth(autoRefreshIntervalMs);
  const [copied, setCopied] = useState(false);

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHealthy = isReady === true;

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
          p: 2,
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
              width: 36,
              height: 36,
              borderRadius: '9px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              mt: 0.2,
            }}
          >
            {isDbDown ? <ErrorOutlineIcon sx={{ fontSize: 20 }} /> : <WarningAmberIcon sx={{ fontSize: 20 }} />}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#991b1b', fontSize: '0.85rem' }}>
                {isDbDown
                  ? 'База данных PostgreSQL отключена'
                  : 'Компоненты инфраструктуры требуют внимания'}
              </Typography>

              <Button
                size="small"
                variant="outlined"
                onClick={checkHealth}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={12} color="inherit" /> : <RefreshIcon sx={{ fontSize: 14 }} />}
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  py: 0.2,
                  px: 1,
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

            <Typography variant="body2" sx={{ color: '#7f1d1d', fontSize: '0.8rem', mb: 1.25, lineHeight: 1.4 }}>
              {db.error || `Не удается установить соединение с сервером БД (${db.host || '127.0.0.1:5432'}). Авторизация и операции с данными заблокированы.`}
            </Typography>

            <Box
              sx={{
                p: 1.2,
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
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600, fontSize: '0.68rem' }}>
                  Команда для запуска в терминале:
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontSize: '0.75rem',
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
                    p: 0.6,
                    borderRadius: '6px',
                    '&:hover': {
                      backgroundColor: copied ? '#bbf7d0' : '#e2e8f0',
                    },
                  }}
                >
                  {copied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
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
