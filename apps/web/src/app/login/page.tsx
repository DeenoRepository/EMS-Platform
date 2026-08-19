'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Chip,
  Paper,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SecurityIcon from '@mui/icons-material/Security';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '@/lib/auth-client';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (user: string, pass: string) => {
    if (!user.trim()) {
      setError('Пожалуйста, введите ваш корпоративный логин (LDAP)');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await login(user.trim(), pass);
    if (!res.success) {
      setError(res.error || 'Ошибка входа');
      setLoading(false);
      setActiveDemo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(username, password);
  };

  const handleDemoLogin = async (user: string, pass: string, demoKey: string) => {
    setUsername(user);
    setPassword(pass);
    setActiveDemo(demoKey);
    await performLogin(user, pass);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a', // Slate-900 industrial dark background
        backgroundImage: 'radial-gradient(at 50% 0%, rgba(2, 132, 199, 0.18) 0px, transparent 60%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Header Banner */}
        <Box
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            p: 3.5,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="EMS Logo"
            sx={{
              width: 56,
              height: 56,
              objectFit: 'contain',
              mb: 1.5,
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25))',
            }}
          />
          <Typography variant="h5" fontWeight={900} letterSpacing={0.5}>
            EMS
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5, fontSize: '0.8125rem' }}>
            Equipment Management System
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom textAlign="center">
            Вход в систему
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
            Используйте корпоративную учетную запись LDAP / Active Directory
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Корпоративный логин (LDAP / sAMAccountName)"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              size="medium"
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              size="medium"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.25,
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              {loading && !activeDemo ? <CircularProgress size={24} color="inherit" /> : 'Войти'}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5 }}>
            <Typography variant="caption" color="text.secondary">
              Быстрый вход для тестирования
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              type="button"
              variant="outlined"
              size="small"
              fullWidth
              disabled={loading}
              onClick={() => handleDemoLogin('admin', 'admin123', 'admin')}
              sx={{ justifyContent: 'space-between', px: 2, py: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SecurityIcon fontSize="small" sx={{ mr: 1.5, color: 'primary.main' }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                    Администратор
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    admin / admin123 (Полные права)
                  </Typography>
                </Box>
              </Box>
              {loading && activeDemo === 'admin' ? (
                <CircularProgress size={18} color="primary" />
              ) : (
                <ArrowForwardIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.6 }} />
              )}
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="small"
              fullWidth
              disabled={loading}
              onClick={() => handleDemoLogin('engineer', 'engineer123', 'engineer')}
              sx={{ justifyContent: 'space-between', px: 2, py: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PrecisionManufacturingIcon fontSize="small" sx={{ mr: 1.5, color: 'info.main' }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                    Инженер
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    engineer / engineer123 (Паспорта + ТО)
                  </Typography>
                </Box>
              </Box>
              {loading && activeDemo === 'engineer' ? (
                <CircularProgress size={18} color="primary" />
              ) : (
                <ArrowForwardIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.6 }} />
              )}
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="small"
              fullWidth
              disabled={loading}
              onClick={() => handleDemoLogin('keeper', 'keeper123', 'keeper')}
              sx={{ justifyContent: 'space-between', px: 2, py: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Inventory2Icon fontSize="small" sx={{ mr: 1.5, color: 'success.main' }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                    Кладовщик
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    keeper / keeper123 (Склад WMS)
                  </Typography>
                </Box>
              </Box>
              {loading && activeDemo === 'keeper' ? (
                <CircularProgress size={18} color="primary" />
              ) : (
                <ArrowForwardIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.6 }} />
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
