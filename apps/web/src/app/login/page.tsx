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
  FormControlLabel,
  Checkbox,
  Tooltip,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import ClearIcon from '@mui/icons-material/Clear';
import ContactSupportOutlinedIcon from '@mui/icons-material/ContactSupportOutlined';
import DomainIcon from '@mui/icons-material/Domain';
import { useAuth } from '@/lib/auth-client';
import { StatusBadge } from '@/components/ui';

interface DemoAccount {
  key: string;
  user: string;
  pass: string;
  title: string;
  subtitle: string;
  roleBadge: string;
  color: string;
  icon: React.ElementType;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: 'admin',
    user: 'admin',
    pass: 'admin123',
    title: 'Главный Администратор',
    subtitle: 'admin / admin123',
    roleBadge: 'Полный доступ (Admin)',
    color: '#0284c7',
    icon: SecurityIcon,
  },
  {
    key: 'engineer',
    user: 'engineer',
    pass: 'engineer123',
    title: 'Инженер-механик / энергетик',
    subtitle: 'engineer / engineer123',
    roleBadge: 'EPS + MRO (ТО)',
    color: '#0f766e',
    icon: PrecisionManufacturingIcon,
  },
  {
    key: 'keeper',
    user: 'keeper',
    pass: 'keeper123',
    title: 'Заведующий складом',
    subtitle: 'keeper / keeper123',
    roleBadge: 'WMS (Склад и ТМЦ)',
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
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  // Восстановление сохраненного логина при первой загрузке
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('ems_saved_username');
      if (savedUser) {
        setUsername(savedUser);
      }
    } catch {
      // Игнорируем ошибки доступа к localStorage в приватном режиме
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

  const handleClearUsername = () => {
    setUsername('');
    try {
      localStorage.removeItem('ems_saved_username');
    } catch {
      // ignore
    }
  };

  return (
    <Box
      component="main"
      role="main"
      aria-label="Страница авторизации EMS Platform"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b1120',
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(2, 132, 199, 0.25), transparent),
          radial-gradient(ellipse 60% 40% at 100% 100%, rgba(15, 118, 110, 0.18), transparent),
          linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 36px 36px, 36px 36px',
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Main Authentication Card */}
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Brand Banner */}
        <Box
          component="header"
          sx={{
            color: 'white',
            px: 3.5,
            pt: 3.5,
            pb: 3,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            position: 'relative',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="Логотип системы EMS Platform"
            width={56}
            height={56}
            sx={{
              objectFit: 'contain',
              mb: 1.5,
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35))',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
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
              lineHeight: 1.2,
            }}
          >
            EMS PLATFORM
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.92)',
              mt: 0.5,
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}
          >
            Система управления оборудованием
          </Typography>

          <Box
            sx={{
              mt: 1.75,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              backgroundColor: 'rgba(0, 0, 0, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              px: 1.5,
              py: 0.4,
              borderRadius: '16px',
            }}
          >
            <LanOutlinedIcon sx={{ fontSize: 14, color: '#bae6fd' }} aria-hidden="true" />
            <Typography variant="caption" sx={{ color: '#f0f9ff', fontSize: '0.7rem', fontWeight: 600 }}>
              Active Directory / LDAP
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ mb: 2.5, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a' }}>
              Вход в учетную запись
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', mt: 0.25 }}>
              Введите корпоративные учетные данные
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
                  alignItems: 'center',
                  '& .MuiAlert-message': {
                    width: '100%',
                  },
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Форма входа в учетную запись EMS"
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Корпоративный логин (LDAP)"
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
                endAdornment: username && !loading ? (
                  <InputAdornment position="end">
                    <Tooltip title="Очистить логин">
                      <IconButton
                        aria-label="Очистить поле логина"
                        onClick={handleClearUsername}
                        edge="end"
                        size="small"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
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
                  backgroundColor: '#ffffff',
                },
              }}
            />

            {capsLockActive && (
              <Fade in={capsLockActive}>
                <Box
                  role="status"
                  aria-live="polite"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    mt: 1,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1.5,
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <WarningAmberIcon sx={{ fontSize: 16 }} aria-hidden="true" />
                  <span>Внимание: включена клавиша Caps Lock</span>
                </Box>
              </Fade>
            )}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 1.25,
                mb: 1.75,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    size="small"
                    color="primary"
                    inputProps={{ 'aria-label': 'Запомнить логин на этом компьютере' }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Запомнить логин
                  </Typography>
                }
              />
              <Button
                variant="text"
                size="small"
                onClick={() => setHelpDialogOpen(true)}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'primary.main',
                  textTransform: 'none',
                  p: 0.5,
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline',
                  },
                }}
              >
                Забыли пароль?
              </Button>
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
                fontSize: '0.875rem',
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                '&:hover': {
                  boxShadow: '0 6px 18px rgba(2, 132, 199, 0.45)',
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

          {/* Demo Accounts List (Only in development or explicit demo flag) */}
          {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true') && (
            <>
              <Divider sx={{ my: 2.75 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontWeight: 600,
                    px: 1,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    fontSize: '0.6875rem',
                  }}
                >
                  Быстрый вход для тестирования
                </Typography>
              </Divider>

              <Box
                component="section"
                aria-label="Тестовые учетные записи"
                sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}
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
                        py: 1.1,
                        borderRadius: 2,
                        borderColor: '#e2e8f0',
                        backgroundColor: '#ffffff',
                        transition: 'all 0.18s ease-in-out',
                        '&:hover': {
                          borderColor: demo.color,
                          backgroundColor: `${demo.color}08`,
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 12px ${demo.color}18`,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 1.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: `${demo.color}15`,
                            color: demo.color,
                            mr: 1.5,
                            flexShrink: 0,
                          }}
                        >
                          <IconComp sx={{ fontSize: 19 }} />
                        </Box>
                        <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ color: '#0f172a', lineHeight: 1.25 }}
                            >
                              {demo.title}
                            </Typography>
                            <StatusBadge
                              status={demo.roleBadge}
                              size="small"
                              customColor={demo.color}
                              customBg={`${demo.color}12`}
                              customBorder={`${demo.color}35`}
                              showIcon={false}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: '0.725rem', fontFamily: 'monospace' }}
                          >
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
                            sx={{
                              color: '#94a3b8',
                              fontSize: 16,
                              transition: 'transform 0.18s ease',
                              '&:hover': { transform: 'translateX(3px)' },
                            }}
                          />
                        )}
                      </Box>
                    </Button>
                  );
                })}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Domain Password Recovery Help Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="recovery-dialog-title"
      >
        <DialogTitle
          id="recovery-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            fontWeight: 700,
            fontSize: '1.05rem',
            color: '#0f172a',
            pb: 1,
          }}
        >
          <ContactSupportOutlinedIcon sx={{ color: 'primary.main' }} />
          Восстановление доступа
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#334155', mb: 2, lineHeight: 1.55 }}>
            Для восстановления доступа, сброса пароля или разблокировки учетной записи необходимо обратиться к <b>системному администратору</b> вашего предприятия или в службу технической поддержки (ИТ-отдел).
          </Typography>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            }}
          >
            <DomainIcon sx={{ fontSize: 22, color: 'primary.main', mt: 0.2, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                Корпоративный домен Active Directory
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', lineHeight: 1.45 }}>
                Учетные записи пользователей управляются централизованно. Смена пароля осуществляется через доменную рабочую станцию (Ctrl+Alt+Del) либо администратором сети.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => setHelpDialogOpen(false)}
            sx={{ fontWeight: 600, px: 2.5 }}
          >
            Понятно
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
