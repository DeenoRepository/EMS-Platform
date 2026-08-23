'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  Alert,
  AlertTitle,
  CircularProgress,
  Stack,
  Divider,
  Paper,
  Switch,
  FormControlLabel,
  Chip,
  InputAdornment,
  IconButton,
  LinearProgress,
  Radio,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import StorageIcon from '@mui/icons-material/Storage';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LanIcon from '@mui/icons-material/Lan';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import KeyIcon from '@mui/icons-material/Key';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { PageLoading } from '@/components/ui';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const STEPS = [
  'Системные зависимости',
  'База данных PostgreSQL',
  'Супер-Администратор & LDAP',
  'Хранилище и интеграции',
  'Инициализация системы',
];

export interface DependencyCheckItem {
  id: string;
  name: string;
  category: 'runtime' | 'database' | 'storage' | 'security' | 'system';
  isCritical: boolean;
  status: 'PASS' | 'WARN' | 'FAIL';
  currentValue: string;
  requiredValue: string;
  message?: string;
  troubleshooting?: string;
}

export default function SetupWizardPage() {
  const router = useRouter();

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isRefreshingDeps, setIsRefreshingDeps] = useState(false);
  const [dependencies, setDependencies] = useState<{
    allCriticalPassed: boolean;
    failedCount: number;
    checks: DependencyCheckItem[];
  } | null>(null);

  // Step 2: Database Config
  const [dbHost, setDbHost] = useState(process.env.NEXT_PUBLIC_DB_HOST || '127.0.0.1');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('ems_db');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPassword, setDbPassword] = useState('postgrespassword');
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);

  // Step 3: Admin & LDAP Config
  const [authMode, setAuthMode] = useState<'local' | 'ldap'>('local');
  const [adminLogin, setAdminLogin] = useState('admin');
  const [adminDisplayName, setAdminDisplayName] = useState('Главный Администратор');
  const [adminEmail, setAdminEmail] = useState('admin@company.local');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('admin123');
  const [showAdminPass, setShowAdminPass] = useState(false);

  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [ldapUrl, setLdapUrl] = useState('ldap://127.0.0.1:389');
  const [ldapBindDn, setLdapBindDn] = useState('cn=admin,dc=company,dc=local');
  const [ldapBindPassword, setLdapBindPassword] = useState('adminpassword');
  const [ldapSearchBase, setLdapSearchBase] = useState('dc=company,dc=local');
  const [ldapSearchFilter, setLdapSearchFilter] = useState('(|(sAMAccountName={{username}})(uid={{username}})(userPrincipalName={{username}}))');
  const [ldapTestResult, setLdapTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ldapAuthVerified, setLdapAuthVerified] = useState(false);
  const [isTestingLdap, setIsTestingLdap] = useState(false);

  // Step 4: Storage & Jira Config
  const [storageDir, setStorageDir] = useState('./uploads');
  const [jiraHost, setJiraHost] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('EMS');

  // Step 5: Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);
  const [execSuccess, setExecSuccess] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/setup/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setIsInstalled(json.data.isInstalled);
          setSystemInfo(json.data.systemInfo);
          setDependencies(json.data.dependencies);
          if (json.data.systemInfo?.dbHost) {
            setDbHost(json.data.systemInfo.dbHost);
          }
          if (json.data.systemInfo?.dbPort) {
            setDbPort(String(json.data.systemInfo.dbPort));
          }
        }
      }
    } catch (err) {
      console.error('Error checking setup status:', err);
    } finally {
      setIsCheckingStatus(false);
      setIsRefreshingDeps(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefreshDependencies = async () => {
    setIsRefreshingDeps(true);
    await fetchStatus();
  };

  // Test DB connection
  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await fetch('/api/setup/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: dbHost,
          port: dbPort,
          database: dbName,
          user: dbUser,
          password: dbPassword,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDbTestResult({ success: true, message: json.message });
      } else {
        setDbTestResult({ success: false, message: json.error || 'Ошибка подключения к БД' });
      }
    } catch (err) {
      setDbTestResult({ success: false, message: 'Ошибка сети при проверке подключения' });
    } finally {
      setIsTestingDb(false);
    }
  };

  // Test LDAP Connection & Direct User Bind Authentication
  const handleTestLdapAuth = async () => {
    setIsTestingLdap(true);
    setLdapTestResult(null);
    try {
      const res = await fetch('/api/setup/test-ldap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: ldapUrl,
          bindDn: ldapBindDn || undefined,
          bindPassword: ldapBindPassword || undefined,
          searchBase: ldapSearchBase,
          searchFilter: ldapSearchFilter,
          testLogin: adminLogin,
          testPassword: adminPassword,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setLdapTestResult({ success: true, message: json.message });
        setLdapAuthVerified(true);
        if (json.user) {
          if (json.user.displayName && (!adminDisplayName || adminDisplayName === 'Главный Администратор')) {
            setAdminDisplayName(json.user.displayName);
          }
          if (json.user.email && (!adminEmail || adminEmail === 'admin@company.local')) {
            setAdminEmail(json.user.email);
          }
        }
      } else {
        setLdapTestResult({ success: false, message: json.error || 'Ошибка аутентификации в LDAP' });
        setLdapAuthVerified(false);
      }
    } catch (err) {
      setLdapTestResult({ success: false, message: 'Ошибка сети при проверке LDAP' });
      setLdapAuthVerified(false);
    } finally {
      setIsTestingLdap(false);
    }
  };

  // Basic LDAP connection ping
  const handleTestLdap = async () => {
    setIsTestingLdap(true);
    setLdapTestResult(null);
    try {
      const res = await fetch('/api/setup/test-ldap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: ldapUrl,
          bindDn: ldapBindDn,
          bindPassword: ldapBindPassword,
          searchBase: ldapSearchBase,
          searchFilter: ldapSearchFilter,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setLdapTestResult({ success: true, message: json.message });
      } else {
        setLdapTestResult({ success: false, message: json.error || 'Ошибка подключения к LDAP' });
      }
    } catch (err) {
      setLdapTestResult({ success: false, message: 'Ошибка сети при проверке LDAP' });
    } finally {
      setIsTestingLdap(false);
    }
  };

  // Execute installation
  const handleExecuteSetup = async () => {
    setIsExecuting(true);
    setExecError(null);
    try {
      const payload = {
        dbConfig: {
          host: dbHost,
          port: dbPort,
          database: dbName,
          user: dbUser,
          password: dbPassword,
        },
        adminConfig: {
          login: adminLogin,
          displayName: adminDisplayName,
          email: adminEmail,
          password: authMode === 'ldap' ? '' : adminPassword,
          authType: authMode,
        },
        ldapConfig: {
          enabled: authMode === 'ldap' || ldapEnabled,
          authType: authMode,
          useForAdmin: authMode === 'ldap',
          url: ldapUrl,
          bindDn: ldapBindDn,
          bindPassword: ldapBindPassword,
          searchBase: ldapSearchBase,
          searchFilter: ldapSearchFilter,
        },
        storageConfig: {
          dir: storageDir,
        },
        jiraConfig: {
          host: jiraHost,
          email: jiraEmail,
          apiToken: jiraToken,
          projectKey: jiraProjectKey,
        },
      };

      const res = await fetch('/api/setup/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setExecSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setExecError(json.error || 'Ошибка установки');
      }
    } catch (err: any) {
      setExecError(err.message || 'Ошибка сети при установке');
    } finally {
      setIsExecuting(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a' }}>
        <PageLoading text="Проверка статуса инициализации системы..." />
      </Box>
    );
  }

  // If already installed and locked
  if (isInstalled && !execSuccess) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#0f172a',
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 540, width: '100%', borderRadius: 3, p: 2, textAlign: 'center' }}>
          <CardContent>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Система EMS уже настроена
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Первоначальная конфигурация успешно выполнена и мастер установки заблокирован в целях безопасности.
              Для изменения параметров используйте раздел «Администрирование ➔ Настройки».
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/login')}
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 4, py: 1.2, fontWeight: 700 }}
            >
              Перейти к авторизации
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0f172a',
        backgroundImage: 'radial-gradient(at 50% 0%, rgba(2, 132, 199, 0.2) 0px, transparent 60%)',
        py: 6,
        px: { xs: 2, md: 4 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Brand Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          component="img"
          src="/logo.png"
          alt="EMS Logo"
          sx={{ width: 64, height: 64, objectFit: 'contain', mb: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
        />
        <Typography variant="h4" fontWeight={900} color="white" letterSpacing={-0.5}>
          EMS Platform — Мастер настройки
        </Typography>
        <Typography variant="body2" sx={{ color: 'slate.400', mt: 0.5 }}>
          Пошаговая конфигурация базы данных, безопасности и интеграций производственной платформы
        </Typography>
      </Box>

      {/* Main Wizard Card */}
      <Card sx={{ maxWidth: 840, width: '100%', borderRadius: 3, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        {/* Stepper Header */}
        <Box sx={{ bgcolor: 'grey.50', p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {/* STEP 1: System Checks & Dependencies */}
          {activeStep === 0 && (
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <RocketLaunchIcon color="primary" sx={{ fontSize: 28 }} />
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Шаг 1: Проверка системных зависимостей и требований
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Автоматическая проверка готовности окружения перед установкой платформы
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={isRefreshingDeps ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                  disabled={isRefreshingDeps || isCheckingStatus}
                  onClick={handleRefreshDependencies}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                >
                  {isRefreshingDeps ? 'Проверка...' : 'Повторить проверку'}
                </Button>
              </Box>

              {/* Blocking vs Ready Banner */}
              {dependencies && !dependencies.allCriticalPassed && (
                <Alert
                  severity="error"
                  icon={<ErrorOutlineIcon fontSize="inherit" />}
                  sx={{ borderRadius: 2 }}
                >
                  <AlertTitle sx={{ fontWeight: 700 }}>
                    Установка заблокирована: обнаружены неисправные или отсутствующие зависимости ({dependencies.failedCount})
                  </AlertTitle>
                  Дальнейшая установка остановлена. Исправьте выявленные первопричины (отмечены красным) и нажмите кнопку <b>«Повторить проверку»</b> для разблокировки мастера.
                </Alert>
              )}

              {dependencies && dependencies.allCriticalPassed && (
                <Alert
                  severity="success"
                  icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                  sx={{ borderRadius: 2 }}
                >
                  <AlertTitle sx={{ fontWeight: 700 }}>Все системные зависимости успешно проверены</AlertTitle>
                  Среда Node.js, служба PostgreSQL, файловое хранилище и модуль криптографии исправны и готовы к работе. Нажмите <b>«Далее»</b> для настройки БД.
                </Alert>
              )}

              {/* Dependency Checks Grid */}
              <Grid container spacing={2}>
                {dependencies?.checks.map((check) => {
                  const isPass = check.status === 'PASS';
                  const isWarn = check.status === 'WARN';
                  const isFail = check.status === 'FAIL';

                  const borderColor = isFail ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981';
                  const bgColor = isFail ? 'rgba(239, 68, 68, 0.04)' : isWarn ? 'rgba(245, 158, 11, 0.04)' : 'rgba(16, 185, 129, 0.03)';

                  return (
                    <Grid item xs={12} key={check.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2.5,
                          borderRadius: 2,
                          borderLeft: `4px solid ${borderColor}`,
                          backgroundColor: bgColor,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isPass && <CheckCircleIcon color="success" fontSize="small" />}
                            {isWarn && <WarningAmberIcon color="warning" fontSize="small" />}
                            {isFail && <ErrorOutlineIcon color="error" fontSize="small" />}
                            <Typography variant="subtitle1" fontWeight={700}>
                              {check.name}
                            </Typography>
                            {check.isCritical && (
                              <Chip label="Критическая зависимость" size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                          <Chip
                            label={isPass ? 'ИСПРАВНО' : isWarn ? 'ПРЕДУПРЕЖДЕНИЕ' : 'ОШИБКА / НЕДОСТУПНО'}
                            size="small"
                            color={isPass ? 'success' : isWarn ? 'warning' : 'error'}
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </Box>

                        <Grid container spacing={1} sx={{ mt: 0.5 }}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Текущее состояние:
                            </Typography>
                            <Typography variant="body2" fontWeight={600} fontFamily={check.id === 'node_runtime' ? 'monospace' : 'inherit'}>
                              {check.currentValue}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Требование платформы:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {check.requiredValue}
                            </Typography>
                          </Grid>
                        </Grid>

                        {check.message && (
                          <Typography variant="caption" color={isFail ? 'error.main' : 'text.secondary'} sx={{ display: 'block', mt: 1 }}>
                            {check.message}
                          </Typography>
                        )}

                        {isFail && check.troubleshooting && (
                          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1.5 }}>
                            <Typography variant="caption" fontWeight={700} color="error.dark" display="block">
                              Решение и устранение первопричины:
                            </Typography>
                            <Typography variant="caption" color="error.dark">
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
          )}

          {/* STEP 2: Database Config */}
          {activeStep === 1 && (
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StorageIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Шаг 2: Параметры базы данных PostgreSQL
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Укажите реквизиты доступа к СУБД PostgreSQL
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    required
                    label="Хост сервера PostgreSQL"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    placeholder="127.0.0.1 или db.company.local"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Порт"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    placeholder="5432"
                  />
                </Grid>
                <Grid item xs={12} sm={12}>
                  <TextField
                    fullWidth
                    required
                    label="Имя базы данных"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    placeholder="ems_db"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Пользователь БД"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    placeholder="postgres"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Пароль пользователя БД"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </Grid>
              </Grid>

              {dbTestResult && (
                <Alert
                  severity={dbTestResult.success ? 'success' : 'error'}
                  icon={dbTestResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  {dbTestResult.message}
                </Alert>
              )}

              <Box>
                <Button
                  variant="outlined"
                  startIcon={isTestingDb ? <CircularProgress size={18} /> : <PlayArrowIcon />}
                  onClick={handleTestDatabase}
                  disabled={isTestingDb}
                >
                  {isTestingDb ? 'Проверка соединения...' : 'Проверить подключение к PostgreSQL'}
                </Button>
              </Box>
            </Stack>
          )}

          {/* STEP 3: Admin & LDAP Config */}
          {activeStep === 2 && (
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Шаг 3: Авторизация и учетная запись Супер-Администратора
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Выберите режим аутентификации в системе и настройте главного администратора
                  </Typography>
                </Box>
              </Box>

              {/* Mode Selection */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Режим аутентификации:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      onClick={() => {
                        setAuthMode('local');
                        setLdapAuthVerified(false);
                      }}
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: authMode === 'local' ? 'primary.main' : 'divider',
                        bgcolor: authMode === 'local' ? 'rgba(2, 132, 199, 0.04)' : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.light' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Radio checked={authMode === 'local'} size="small" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          Локальная база данных
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 3.5, display: 'block' }}>
                        Создание локального администратора с хранением хеша пароля в PostgreSQL
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Paper
                      onClick={() => setAuthMode('ldap')}
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: authMode === 'ldap' ? 'primary.main' : 'divider',
                        bgcolor: authMode === 'ldap' ? 'rgba(2, 132, 199, 0.04)' : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.light' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Radio checked={authMode === 'ldap'} size="small" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          LDAP / Active Directory (User Binding)
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 3.5, display: 'block' }}>
                        Аутентификация через привязку к каталогу. Пароль НЕ сохраняется в базе данных
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              {/* Mode 1: Local DB */}
              {authMode === 'local' && (
                <Stack spacing={2.5}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Логин администратора"
                        value={adminLogin}
                        onChange={(e) => setAdminLogin(e.target.value)}
                        placeholder="admin"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="ФИО / Отображаемое имя"
                        value={adminDisplayName}
                        onChange={(e) => setAdminDisplayName(e.target.value)}
                        placeholder="Главный Администратор"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email администратора"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@company.local"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        type={showAdminPass ? 'text' : 'password'}
                        label="Пароль администратора"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowAdminPass(!showAdminPass)} edge="end">
                                {showAdminPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        type={showAdminPass ? 'text' : 'password'}
                        label="Подтверждение пароля"
                        value={adminPasswordConfirm}
                        onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                        error={Boolean(adminPasswordConfirm && adminPassword !== adminPasswordConfirm)}
                        helperText={
                          adminPasswordConfirm && adminPassword !== adminPasswordConfirm
                            ? 'Пароли не совпадают'
                            : undefined
                        }
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1 }} />

                  {/* Optional secondary LDAP toggle for regular users */}
                  <Box>
                    <FormControlLabel
                      control={<Switch checked={ldapEnabled} onChange={(e) => setLdapEnabled(e.target.checked)} color="primary" />}
                      label={
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            Включить дополнительную интеграцию с Active Directory / LDAP
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Для авторизации остальных сотрудников предприятия через корпоративный домен
                          </Typography>
                        </Box>
                      }
                    />

                    {ldapEnabled && (
                      <Stack spacing={2} sx={{ mt: 2, p: 2.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <TextField
                          fullWidth
                          label="LDAP URL"
                          placeholder="ldap://ad.company.local:389"
                          value={ldapUrl}
                          onChange={(e) => setLdapUrl(e.target.value)}
                        />
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Bind DN (Служебный аккаунт)"
                              placeholder="CN=EMS_Service,OU=Services,DC=company,DC=local"
                              value={ldapBindDn}
                              onChange={(e) => setLdapBindDn(e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              type="password"
                              label="Bind Password"
                              value={ldapBindPassword}
                              onChange={(e) => setLdapBindPassword(e.target.value)}
                            />
                          </Grid>
                        </Grid>
                        <TextField
                          fullWidth
                          label="Search Base (Корень поиска)"
                          placeholder="OU=Users,DC=company,DC=local"
                          value={ldapSearchBase}
                          onChange={(e) => setLdapSearchBase(e.target.value)}
                        />

                        {ldapTestResult && (
                          <Alert
                            severity={ldapTestResult.success ? 'success' : 'error'}
                            icon={ldapTestResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                            sx={{ borderRadius: 2 }}
                          >
                            {ldapTestResult.message}
                          </Alert>
                        )}

                        <Box>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={isTestingLdap ? <CircularProgress size={16} /> : <LanIcon />}
                            onClick={handleTestLdap}
                            disabled={isTestingLdap}
                          >
                            {isTestingLdap ? 'Проверка связи...' : 'Проверить связь с LDAP/AD'}
                          </Button>
                        </Box>
                      </Stack>
                    )}
                  </Box>
                </Stack>
              )}

              {/* Mode 2: LDAP User Binding */}
              {authMode === 'ldap' && (
                <Stack spacing={2.5}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Режим сквозной авторизации LDAP Binding</AlertTitle>
                    В этом режиме пароль администратора <strong>НЕ сохраняется в базе данных</strong> платформы. Аутентификация производится напрямую через запрос привязки (User Bind) к каталогу Active Directory / LDAP. Для продолжения установки необходимо подтвердить учетные данные.
                  </Alert>

                  <Typography variant="subtitle2" fontWeight={700}>
                    1. Параметры подключения к серверу каталога LDAP:
                  </Typography>

                  <TextField
                    fullWidth
                    required
                    label="LDAP URL"
                    placeholder="ldap://ad.company.local:389"
                    value={ldapUrl}
                    onChange={(e) => {
                      setLdapUrl(e.target.value);
                      setLdapAuthVerified(false);
                    }}
                    helperText="Адрес службы каталога (порт 389 для LDAP, 636 для LDAPS)"
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Search Base (Корень поиска)"
                        placeholder="DC=company,DC=local"
                        value={ldapSearchBase}
                        onChange={(e) => {
                          setLdapSearchBase(e.target.value);
                          setLdapAuthVerified(false);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Фильтр поиска пользователей"
                        placeholder="(|(sAMAccountName={{username}})(uid={{username}}))"
                        value={ldapSearchFilter}
                        onChange={(e) => {
                          setLdapSearchFilter(e.target.value);
                          setLdapAuthVerified(false);
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Bind DN (Служебный аккаунт, опционально)"
                        placeholder="CN=EMS_Service,OU=Services,DC=company,DC=local"
                        value={ldapBindDn}
                        onChange={(e) => {
                          setLdapBindDn(e.target.value);
                          setLdapAuthVerified(false);
                        }}
                        helperText="Оставьте пустым для прямого User Binding"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Bind Password (пароль служебного аккаунта)"
                        value={ldapBindPassword}
                        onChange={(e) => {
                          setLdapBindPassword(e.target.value);
                          setLdapAuthVerified(false);
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="subtitle2" fontWeight={700}>
                    2. Учетные данные супер-администратора в домене / каталоге:
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Логин администратора в LDAP"
                        value={adminLogin}
                        onChange={(e) => {
                          setAdminLogin(e.target.value);
                          setLdapAuthVerified(false);
                        }}
                        placeholder="admin"
                        helperText="Имя пользователя (sAMAccountName / uid)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        type={showAdminPass ? 'text' : 'password'}
                        label="Пароль администратора в LDAP"
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          setLdapAuthVerified(false);
                        }}
                        helperText="Для тестовой проверки связывания (НЕ сохранится в БД)"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowAdminPass(!showAdminPass)} edge="end">
                                {showAdminPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="ФИО / Отображаемое имя"
                        value={adminDisplayName}
                        onChange={(e) => setAdminDisplayName(e.target.value)}
                        placeholder="Главный Администратор"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email администратора"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@company.local"
                      />
                    </Grid>
                  </Grid>

                  {ldapTestResult && (
                    <Alert
                      severity={ldapTestResult.success ? 'success' : 'error'}
                      icon={ldapTestResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      <AlertTitle sx={{ fontWeight: 700 }}>
                        {ldapTestResult.success ? 'Аутентификация LDAP подтверждена' : 'Ошибка аутентификации в LDAP'}
                      </AlertTitle>
                      {ldapTestResult.message}
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      variant="contained"
                      color={ldapAuthVerified ? 'success' : 'primary'}
                      startIcon={isTestingLdap ? <CircularProgress size={18} color="inherit" /> : (ldapAuthVerified ? <CheckCircleIcon /> : <LanIcon />)}
                      onClick={handleTestLdapAuth}
                      disabled={isTestingLdap || !adminLogin.trim() || !adminPassword || !ldapUrl.trim()}
                      sx={{ py: 1.2, px: 3, fontWeight: 700 }}
                    >
                      {isTestingLdap ? 'Проверка соединения и bind...' : (ldapAuthVerified ? 'Учетные данные в LDAP подтверждены' : 'Проверить соединение и пароль в LDAP')}
                    </Button>
                  </Box>
                </Stack>
              )}
            </Stack>
          )}

          {/* STEP 4: Storage & Jira Config */}
          {activeStep === 3 && (
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <FolderOpenIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Шаг 4: Хранилище файлов и интеграция с Jira (SRM)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Настройка директории для паспортов, чертежей и связи с заявками Jira
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Директория хранения файлов и документов"
                value={storageDir}
                onChange={(e) => setStorageDir(e.target.value)}
                helperText="Локальный путь для сохранения сканов, PDF и фото оборудования"
              />

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Интеграция с Atlassian Jira (Модуль SRM) — опционально
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Jira Host URL"
                      placeholder="https://company.atlassian.net"
                      value={jiraHost}
                      onChange={(e) => setJiraHost(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Jira Project Key"
                      placeholder="EMS"
                      value={jiraProjectKey}
                      onChange={(e) => setJiraProjectKey(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email учетной записи Jira"
                      placeholder="service@company.com"
                      value={jiraEmail}
                      onChange={(e) => setJiraEmail(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Jira API Token"
                      placeholder="••••••••••••"
                      value={jiraToken}
                      onChange={(e) => setJiraToken(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          )}

          {/* STEP 5: Execution */}
          {activeStep === 4 && (
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <RocketLaunchIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Шаг 5: Проверка параметров и запуск
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Финальное подтверждение конфигурации перед инициализацией
                  </Typography>
                </Box>
              </Box>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      База данных PostgreSQL
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {dbHost}:{dbPort}/{dbName} ({dbUser})
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Режим авторизации & Администратор
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {authMode === 'ldap' ? 'LDAP User Binding (без пароля в БД)' : 'Локальная база данных'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Логин: {adminLogin} ({adminDisplayName})
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Служба каталогов LDAP
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {authMode === 'ldap' || ldapEnabled ? `Включен (${ldapUrl})` : 'Выключен (локальные пароли)'}
                    </Typography>
                    {authMode === 'ldap' && (
                      <Chip
                        size="small"
                        color="success"
                        icon={<CheckCircleIcon />}
                        label="Пароль в LDAP проверен"
                        sx={{ mt: 0.5, fontWeight: 600, height: 24 }}
                      />
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Хранилище файлов
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {storageDir}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {isExecuting && (
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                    Применение конфигурации, создание таблиц и супер-администратора...
                  </Typography>
                  <LinearProgress sx={{ borderRadius: 1, height: 8 }} />
                </Box>
              )}

              {execError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  <AlertTitle sx={{ fontWeight: 700 }}>Ошибка установки</AlertTitle>
                  {execError}
                </Alert>
              )}

              {execSuccess && (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  <AlertTitle sx={{ fontWeight: 700 }}>Установка успешно завершена!</AlertTitle>
                  Конфигурация сохранена. Перенаправление на страницу входа...
                </Alert>
              )}
            </Stack>
          )}

          {/* Navigation Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              disabled={activeStep === 0 || isExecuting || execSuccess}
              onClick={() => setActiveStep((prev) => prev - 1)}
              startIcon={<ArrowBackIcon />}
            >
              Назад
            </Button>

            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => setActiveStep((prev) => prev + 1)}
                endIcon={<ArrowForwardIcon />}
                disabled={
                  (activeStep === 0 && (!dependencies?.allCriticalPassed || isCheckingStatus || isRefreshingDeps)) ||
                  (activeStep === 1 && (!dbTestResult?.success || isTestingDb)) ||
                  (activeStep === 2 && (
                    authMode === 'local'
                      ? (!adminLogin.trim() || !adminPassword || adminPassword !== adminPasswordConfirm)
                      : (!adminLogin.trim() || !adminPassword || !ldapAuthVerified)
                  ))
                }
              >
                Далее
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<RocketLaunchIcon />}
                onClick={handleExecuteSetup}
                disabled={isExecuting || execSuccess}
                sx={{ px: 3, fontWeight: 700 }}
              >
                {isExecuting ? 'Установка...' : 'Завершить установку и запустить'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
