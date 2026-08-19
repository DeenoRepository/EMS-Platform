'use client';

import React, { useState, useEffect } from 'react';
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
  FormControlLabel,
  Checkbox,
  Tooltip,
  Fade,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SecurityIcon from '@mui/icons-material/Security';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LanOutlinedIcon from '@mui/icons-material/LanOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '@/lib/auth-client';

const DEMO_ACCOUNTS = [
  {
    key: 'admin',
    user: 'admin',
    pass: 'admin123',
    title: 'Главный Администратор',
    subtitle: 'admin / admin123',
    roleTag: 'Полный доступ (Admin)',
    color: '#0284c7',
    icon: SecurityIcon,
  },
  {
    key: 'engineer',
    user: 'engineer',
    pass: 'engineer123',
    title: 'Инженер-механик / энергетик',
    subtitle: 'engineer / engineer123',
    roleTag: 'EPS + MRO (ТО)',
    color: '#0f766e',
    icon: PrecisionManufacturingIcon,
  },
  {
    key: 'keeper',
    user: 'keeper',
    pass: 'keeper123',
    title: 'Заведующий складом',
    subtitle: 'keeper / keeper123',
    roleTag: 'WMS (Склад и ТМЦ)',
    color: '#16a34a',
    icon: Inventory2Icon,
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Восстановление сохраненного логина при первой загрузке
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('ems_saved_username');
      if (savedUser) {
        setUsername(savedUser);
      }
    } catch {
      // Игнорируем ошибки доступа к localStorage
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const performLogin = async (user: string, pass: string) => {
    const trimmedUser = user.trim();
    if (!trimmedUser) {
      setError('Пожалуйста, введите ваш корпоративный логин (LDAP / sAMAccountName)');
      return;
    }

    setLoading(true);
    setError(null);

    if (rememberMe) {
      try {
        localStorage.setItem('ems_saved_username', trimmedUser);
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem('ems_saved_username');
      } catch {
        // ignore
      }
    }

    const res = await login(trimmedUser, pass);
    if (!res.success) {
      setError(res.error || 'Неверный логин или пароль');
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
      component="main"
      role="main"
      aria-label="Страница авторизации"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090d16',
        backgroundImage: `
          radial-gradient(at 50% 0%, rgba(2, 132, 199, 0.22) 0px, transparent 65%),
          radial-gradient(at 100% 100%, rgba(15, 118, 110, 0.15) 0px, transparent 55%),
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px',
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Top Status Bar */}
      <Box
        sx={{
          mb: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderRadius: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            boxShadow: '0 0 10px #22c55e',
          }}
        />
        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: '0.02em' }}>
          EMS Platform Core v1.0.0
        </Typography>
        <Typography variant="caption" sx={{ color: '#475569' }}>
          •
        </Typography>
        <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 600 }}>
          Сервер активен
        </Typography>
      </Box>

      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Header Banner */}
        <Box
          sx={{
            color: 'white',
            px: 3.5,
            pt: 3.5,
            pb: 3,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            position: 'relative',
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="Логотип системы управления оборудованием EMS"
            width={58}
            height={58}
            sx={{
              objectFit: 'contain',
              mb: 1.5,
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35))',
            }}
          />
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: 0.5,
              fontSize: '1.35rem',
              color: '#ffffff',
            }}
          >
            EMS PLATFORM
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              mt: 0.5,
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}
          >
            Equipment Management System
          </Typography>

          <Box
            sx={{
              mt: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              px: 1.25,
              py: 0.35,
              borderRadius: 10,
            }}
          >
            <LanOutlinedIcon sx={{ fontSize: 13, color: '#bae6fd' }} />
            <Typography variant="caption" sx={{ color: '#e0f2fe', fontSize: '0.6875rem', fontWeight: 600 }}>
              Корпоративный каталог Active Directory / LDAP
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ mb: 2.5, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a' }}>
              Вход в учетную запись
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', mt: 0.25 }}>
              Введите учетные данные для авторизации
            </Typography>
          </Box>

          {error && (
            <Fade in={Boolean(error)}>
              <Alert
                severity="error"
                role="alert"
                aria-live="assertive"
                onClose={() => setError(null)}
                sx={{
                  mb: 2.5,
                  borderRadius: 2,
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate aria-label="Форма входа в систему">
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
              aria-required="true"
              aria-invalid={Boolean(error)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
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
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyDown}
              disabled={loading}
              size="medium"
              aria-required="true"
              aria-invalid={Boolean(error)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
                      <IconButton
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            {capsLockActive && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.75,
                  color: '#d97706',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <WarningAmberIcon sx={{ fontSize: 16 }} />
                <span>Включен Caps Lock</span>
              </Box>
            )}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 1,
                mb: 1.5,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    size="small"
                    color="primary"
                  />
                }
                label={<Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>Запомнить логин</Typography>}
              />
              <Tooltip title="Для восстановления доступа обратитесь к администратору домена">
                <Typography
                  variant="caption"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Забыли пароль?
                </Typography>
              </Tooltip>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.25,
                fontWeight: 700,
                fontSize: '0.9rem',
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(2, 132, 199, 0.4)',
                },
              }}
            >
              {loading && !activeDemo ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'Войти в систему'
              )}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, px: 1 }}>
              Быстрый вход для тестирования
            </Typography>
          </Divider>

          <Box
            component="section"
            aria-label="Тестовые учетные записи"
            sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            {DEMO_ACCOUNTS.map((demo) => {
              const IconComp = demo.icon;
              const isSelected = activeDemo === demo.key;

              return (
                <Button
                  key={demo.key}
                  type="button"
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={loading}
                  onClick={() => handleDemoLogin(demo.user, demo.pass, demo.key)}
                  aria-label={`Войти как ${demo.title}, логин ${demo.user}`}
                  sx={{
                    justifyContent: 'space-between',
                    px: 1.75,
                    py: 1,
                    borderRadius: 2,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      borderColor: demo.color,
                      backgroundColor: 'rgba(2, 132, 199, 0.03)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${demo.color}15`,
                        color: demo.color,
                        mr: 1.5,
                        flexShrink: 0,
                      }}
                    >
                      <IconComp sx={{ fontSize: 18 }} />
                    </Box>
                    <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                          {demo.title}
                        </Typography>
                        <Chip
                          label={demo.roleTag}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            backgroundColor: `${demo.color}18`,
                            color: demo.color,
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        {demo.subtitle}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ ml: 1, flexShrink: 0 }}>
                    {loading && isSelected ? (
                      <CircularProgress size={18} sx={{ color: demo.color }} />
                    ) : (
                      <ArrowForwardIcon
                        fontSize="small"
                        sx={{ color: '#94a3b8', fontSize: 16, transition: 'transform 0.15s', '&:hover': { transform: 'translateX(2px)' } }}
                      />
                    )}
                  </Box>
                </Button>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Security Footer */}
      <Box
        sx={{
          mt: 3,
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.75rem',
          maxWidth: 420,
        }}
      >
        <Typography variant="caption" sx={{ display: 'block', color: '#64748b', lineHeight: 1.4 }}>
          EMS — Промышленная система управления оборудованием и ТМЦ.
          <br />
          Защищенный корпоративный доступ по протоколу TLS / HTTPS.
        </Typography>
      </Box>
    </Box>
  );
}
