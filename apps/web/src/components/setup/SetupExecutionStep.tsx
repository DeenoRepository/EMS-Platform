'use client';

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Paper,
  Avatar,
  LinearProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

export interface SetupExecutionStepProps {
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  adminLogin: string;
  adminDisplayName: string;
  authMode: 'local' | 'ldap';
  ldapEnabled: boolean;
  ldapUrl: string;
  storageDir: string;
  isExecuting: boolean;
  execError: string | null;
  execSuccess: boolean;
}

export function SetupExecutionStep({
  dbHost,
  dbPort,
  dbName,
  dbUser,
  adminLogin,
  adminDisplayName,
  authMode,
  ldapEnabled,
  ldapUrl,
  storageDir,
  isExecuting,
  execError,
  execSuccess,
}: SetupExecutionStepProps) {
  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'rgba(2, 132, 199, 0.1)', color: 'primary.main', width: 44, height: 44 }}>
          <RocketLaunchIcon sx={{ fontSize: 24 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color="text.primary">
            Шаг 5: Проверка параметров и инициализация
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Финальное подтверждение параметров перед созданием базы данных и запуском платформы
          </Typography>
        </Box>
      </Box>

      <Paper
        variant="outlined"
        sx={{ p: 3, borderRadius: 3, bgcolor: 'background.default', border: '1px solid divider' }}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
              База данных PostgreSQL
            </Typography>
            <Typography variant="body2" fontWeight={800} sx={{ mt: 0.25 }}>
              {dbHost}:{dbPort}/{dbName} (пользователь: {dbUser})
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
              Главный Администратор
            </Typography>
            <Typography variant="body2" fontWeight={800} sx={{ mt: 0.25 }}>
              {adminLogin} ({adminDisplayName})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {authMode === 'ldap' ? 'Доменная учетная запись LDAP Binding' : 'Локальная учетная запись'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
              Служба каталогов LDAP
            </Typography>
            <Typography variant="body2" fontWeight={800} sx={{ mt: 0.25 }}>
              {authMode === 'ldap' || ldapEnabled ? `Включена (${ldapUrl})` : 'Отключена (локальная БД)'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
              Хранилище файлов
            </Typography>
            <Typography variant="body2" fontWeight={800} sx={{ mt: 0.25 }}>
              {storageDir}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {isExecuting && (
        <Box
          sx={{
            width: '100%',
            p: 2,
            bgcolor: 'rgba(2, 132, 199, 0.04)',
            borderRadius: 3,
            border: '1px solid rgba(2, 132, 199, 0.2)',
          }}
        >
          <Typography variant="body2" color="primary.main" fontWeight={700} sx={{ mb: 1 }}>
            Применение схемы данных, создание таблиц и учетной записи администратора...
          </Typography>
          <LinearProgress sx={{ borderRadius: 1.5, height: 8 }} />
        </Box>
      )}

      {execError && (
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          <AlertTitle sx={{ fontWeight: 800 }}>Ошибка при установке</AlertTitle>
          {execError}
        </Alert>
      )}

      {execSuccess && (
        <Alert severity="success" sx={{ borderRadius: 3 }}>
          <AlertTitle sx={{ fontWeight: 800 }}>Установка успешно завершена!</AlertTitle>
          Конфигурация сохранена. Перенаправление на страницу авторизации...
        </Alert>
      )}
    </Stack>
  );
}
