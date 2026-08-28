'use client';

import React from 'react';
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MemoryIcon from '@mui/icons-material/Memory';
import RefreshIcon from '@mui/icons-material/Refresh';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import TerminalIcon from '@mui/icons-material/Terminal';
import { StatusBadge } from '@/components/ui';
import type { DependencyCheckItem } from '@/app/setup/page';

export interface SetupDependencyStepProps {
  dependencies: {
    allCriticalPassed: boolean;
    failedCount: number;
    checks: DependencyCheckItem[];
  } | null;
  isRefreshingDeps: boolean;
  isCheckingStatus: boolean;
  onRefreshDependencies: () => void;
}

function getDependencyCategoryIcon(category: string) {
  switch (category) {
    case 'runtime':
      return <TerminalIcon sx={{ fontSize: 20, color: 'primary.main' }} />;
    case 'database':
      return <StorageIcon sx={{ fontSize: 20, color: 'primary.main' }} />;
    case 'storage':
      return <FolderOpenIcon sx={{ fontSize: 20, color: 'primary.main' }} />;
    case 'security':
      return <SecurityIcon sx={{ fontSize: 20, color: 'primary.main' }} />;
    case 'system':
      return <MemoryIcon sx={{ fontSize: 20, color: 'primary.main' }} />;
    default:
      return <CheckCircleOutlineIcon sx={{ fontSize: 20, color: 'primary.main' }} />;
  }
}

export function SetupDependencyStep({
  dependencies,
  isRefreshingDeps,
  isCheckingStatus,
  onRefreshDependencies,
}: SetupDependencyStepProps) {
  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(2, 132, 199, 0.1)', color: 'primary.main', width: 44, height: 44 }}>
            <RocketLaunchIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800} color="text.primary">
              Шаг 1: Диагностика системных зависимостей
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Автоматическая проверка готовности программного окружения перед запуском
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={isRefreshingDeps ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon sx={{ fontSize: 18 }} />}
          disabled={isRefreshingDeps || isCheckingStatus}
          onClick={onRefreshDependencies}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '8px',
            px: 2,
            py: 0.8,
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(2, 132, 199, 0.04)' },
          }}
        >
          {isRefreshingDeps ? 'Диагностика...' : 'Повторить проверку'}
        </Button>
      </Box>

      {dependencies && !dependencies.allCriticalPassed && (
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon sx={{ fontSize: 24 }} />}
          sx={{
            borderRadius: 3,
            border: '1px solid error.light',
            bgcolor: 'error.light',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 0.5 }}>
            Установка заблокирована: обнаружены неисправные зависимости ({dependencies.failedCount})
          </AlertTitle>
          <Typography variant="body2" sx={{ color: 'error.dark', lineHeight: 1.5 }}>
            Дальнейшая установка остановлена для предотвращения сбоев в работе БД и хранилища. Устраните выявленные причины (отмечены красным) и нажмите кнопку <b>«Повторить проверку»</b>.
          </Typography>
        </Alert>
      )}

      {dependencies && dependencies.allCriticalPassed && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 24 }} />}
          sx={{
            borderRadius: 3,
            border: '1px solid success.light',
            bgcolor: 'success.light',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 0.5 }}>
            Все системные зависимости успешно проверены
          </AlertTitle>
          <Typography variant="body2" sx={{ color: 'success.dark', lineHeight: 1.5 }}>
            Среда Node.js, сокет PostgreSQL, каталог файлов и криптографическая подсистема исправны. Нажмите <b>«Далее»</b> для перехода к настройке базы данных.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={2}>
        {dependencies?.checks.map((check) => {
          const isPass = check.status === 'PASS';
          const isWarn = check.status === 'WARN';
          const isFail = check.status === 'FAIL';
          const badgeStatus = isPass ? 'APPROVED' : isWarn ? 'PENDING' : 'REJECTED';
          const badgeLabel = isPass ? 'Готов к работе' : isWarn ? 'Предупреждение' : 'Требует исправления';

          return (
            <Grid item xs={12} key={check.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  borderColor: isFail ? 'error.light' : isWarn ? 'warning.light' : 'divider',
                  backgroundColor: isFail ? 'error.light' : isWarn ? 'warning.light' : 'background.paper',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.06)',
                    borderColor: isFail ? 'error.main' : isWarn ? 'warning.main' : 'divider',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: isFail ? 'rgba(239, 68, 68, 0.1)' : isWarn ? 'rgba(245, 158, 11, 0.1)' : 'rgba(2, 132, 199, 0.08)',
                        borderRadius: '10px',
                      }}
                    >
                      {getDependencyCategoryIcon(check.category)}
                    </Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                          {check.name}
                        </Typography>
                        {check.isCritical && (
                          <Chip
                            label="Обязательно"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              bgcolor: 'rgba(2, 132, 199, 0.08)',
                              color: 'primary.main',
                              borderRadius: '6px',
                            }}
                          />
                        )}
                      </Box>
                      {check.message && (
                        <Typography variant="caption" color={isFail ? 'error.main' : 'text.secondary'}>
                          {check.message}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <StatusBadge status={badgeStatus} label={badgeLabel} variant="subtle" size="medium" />
                </Box>

                <Grid container spacing={1.5} sx={{ mt: 0.5, bgcolor: 'background.default', p: 1.5, borderRadius: 2, border: '1px solid action.hover' }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Текущее значение в системе:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{
                        color: isFail ? 'error.dark' : 'text.primary',
                        fontFamily: check.id === 'node_runtime' || check.id === 'postgres_service' ? 'monospace' : 'inherit',
                        fontSize: '0.875rem',
                      }}
                    >
                      {check.currentValue}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Требование платформы:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      {check.requiredValue}
                    </Typography>
                  </Grid>
                </Grid>

                {isFail && check.troubleshooting && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'error.light', border: '1px solid error.light', borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={800} color="error.dark" display="block" sx={{ mb: 0.25 }}>
                      Инструкция по устранению первопричины:
                    </Typography>
                    <Typography variant="caption" color="error.dark" sx={{ lineHeight: 1.4 }}>
                      {check.troubleshooting}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
