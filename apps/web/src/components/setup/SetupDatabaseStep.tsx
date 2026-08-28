'use client';

import React from 'react';
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StorageIcon from '@mui/icons-material/Storage';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export interface DatabaseTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export interface SetupDatabaseStepProps {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  testResult: DatabaseTestResult | null;
  isTesting: boolean;
  showPassword: boolean;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onDatabaseChange: (value: string) => void;
  onUserChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onShowPasswordChange: (show: boolean) => void;
  onTest: () => void;
}

export function SetupDatabaseStep({
  host,
  port,
  database,
  user,
  password,
  testResult,
  isTesting,
  showPassword,
  onHostChange,
  onPortChange,
  onDatabaseChange,
  onUserChange,
  onPasswordChange,
  onShowPasswordChange,
  onTest,
}: SetupDatabaseStepProps) {
  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'rgba(2, 132, 199, 0.1)', color: 'primary.main', width: 44, height: 44 }}>
          <StorageIcon sx={{ fontSize: 24 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color="text.primary">
            Шаг 2: Параметры подключения к PostgreSQL
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Укажите реквизиты доступа к промышленной СУБД PostgreSQL
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            required
            label="Хост сервера PostgreSQL"
            value={host}
            onChange={(event) => onHostChange(event.target.value)}
            placeholder="postgres или 127.0.0.1"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <StorageIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth required label="Порт" value={port} onChange={(event) => onPortChange(event.target.value)} placeholder="5432" />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Имя рабочей базы данных"
            value={database}
            onChange={(event) => onDatabaseChange(event.target.value)}
            placeholder="ems_db"
            helperText="Если база данных отсутствует, установщик автоматически создаст её"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth required label="Пользователь БД" value={user} onChange={(event) => onUserChange(event.target.value)} placeholder="postgres" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            type={showPassword ? 'text' : 'password'}
            label="Пароль пользователя БД"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="••••••••"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => onShowPasswordChange(!showPassword)} edge="end" size="small">
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>

      {testResult && (
        <Alert severity={testResult.success ? 'success' : 'error'} icon={testResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />} sx={{ borderRadius: 3 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>
            {testResult.success ? 'Связь с базой данных установлена' : 'Ошибка соединения с БД'}
          </AlertTitle>
          {testResult.message}
          {testResult.latencyMs && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              Время отклика сокета: {testResult.latencyMs} мс
            </Typography>
          )}
        </Alert>
      )}

      <Box>
        <Button
          variant="outlined"
          size="medium"
          startIcon={isTesting ? <CircularProgress size={18} /> : <PlayArrowIcon />}
          onClick={onTest}
          disabled={isTesting || !host.trim() || !user.trim() || !database.trim()}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 3, py: 1.1 }}
        >
          {isTesting ? 'Проверка соединения...' : 'Проверить подключение к PostgreSQL'}
        </Button>
      </Box>
    </Stack>
  );
}
