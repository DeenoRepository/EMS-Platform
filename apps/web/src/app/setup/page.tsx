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
  StepConnector,
  stepConnectorClasses,
  styled,
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
  Avatar,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import StorageIcon from '@mui/icons-material/Storage';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LanIcon from '@mui/icons-material/Lan';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MemoryIcon from '@mui/icons-material/Memory';
import TerminalIcon from '@mui/icons-material/Terminal';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HubIcon from '@mui/icons-material/Hub';
import { PageLoading, StatusBadge } from '@/components/ui';

// Custom Modern Stepper Connector
const ModernConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #0284c7 0%, #38bdf8 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #10b981 0%, #34d399 100%)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: '#e2e8f0',
    borderRadius: 1,
  },
}));

// Custom Step Icon
function ModernStepIcon(props: { active?: boolean; completed?: boolean; icon: React.ReactNode }) {
  const { active, completed, icon } = props;

  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        fontWeight: 800,
        fontSize: '0.95rem',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        bgcolor: completed ? '#10b981' : active ? '#0284c7' : '#f1f5f9',
        color: completed || active ? '#ffffff' : '#64748b',
        boxShadow: active
          ? '0 0 0 4px rgba(2, 132, 199, 0.2), 0 8px 16px -4px rgba(2, 132, 199, 0.4)'
          : completed
          ? '0 4px 12px -2px rgba(16, 185, 129, 0.3)'
          : 'none',
      }}
    >
      {completed ? <CheckCircleIcon sx={{ fontSize: 22 }} /> : icon}
    </Box>
  );
}

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
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [showDbPass, setShowDbPass] = useState(false);

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

  // Step 4: Storage & SRM Integration Config
  const [storageDir, setStorageDir] = useState('./uploads');
  const [srmProvider, setSrmProvider] = useState<'DISABLED' | 'JIRA' | 'REDMINE' | 'GITLAB' | 'GENERIC_REST'>('DISABLED');
  const [srmUrl, setSrmUrl] = useState('');
  const [srmProjectKey, setSrmProjectKey] = useState('EMS');
  const [srmApiKey, setSrmApiKey] = useState('');

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
    const startTime = Date.now();
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
      const latencyMs = Date.now() - startTime;
      if (res.ok && json.success) {
        setDbTestResult({ success: true, message: json.message, latencyMs });
      } else {
        setDbTestResult({ success: false, message: json.error || 'Ошибка подключения к БД' });
      }
    } catch (err) {
      setDbTestResult({ success: false, message: 'Ошибка сети при проверке подключения к СУБД' });
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
          bindDn: undefined,
          bindPassword: undefined,
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
        setLdapTestResult({ success: false, message: json.error || 'Ошибка аутентификации в каталоге LDAP' });
        setLdapAuthVerified(false);
      }
    } catch (err) {
      setLdapTestResult({ success: false, message: 'Ошибка сети при проверке службы LDAP' });
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
          host: srmUrl,
          email: '',
          apiToken: srmApiKey,
          projectKey: srmProjectKey,
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
        }, 1500);
      } else {
        setExecError(json.error || 'Ошибка установки');
      }
    } catch (err: any) {
      setExecError(err.message || 'Ошибка сети при установке');
    } finally {
      setIsExecuting(false);
    }
  };

  const getDependencyCategoryIcon = (category: string) => {
    switch (category) {
      case 'runtime':
        return <TerminalIcon sx={{ fontSize: 20, color: '#0284c7' }} />;
      case 'database':
        return <StorageIcon sx={{ fontSize: 20, color: '#0284c7' }} />;
      case 'storage':
        return <FolderOpenIcon sx={{ fontSize: 20, color: '#0284c7' }} />;
      case 'security':
        return <SecurityIcon sx={{ fontSize: 20, color: '#0284c7' }} />;
      case 'system':
        return <MemoryIcon sx={{ fontSize: 20, color: '#0284c7' }} />;
      default:
        return <CheckCircleOutlineIcon sx={{ fontSize: 20, color: '#0284c7' }} />;
    }
  };

  if (isCheckingStatus) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0b1120' }}>
        <PageLoading text="Проверка статуса инициализации платформы..." />
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
          background: 'radial-gradient(1000px circle at 50% 10%, rgba(14, 165, 233, 0.12), transparent 40%), linear-gradient(180deg, #0b1120 0%, #0f172a 100%)',
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 520, width: '100%', borderRadius: 4, p: 2, textAlign: 'center', boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)' }}>
          <CardContent sx={{ p: 4 }}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', mx: 'auto', mb: 2.5 }}>
              <CheckCircleIcon sx={{ fontSize: 44 }} />
            </Avatar>
            <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: -0.3 }}>
              Платформа EMS уже настроена
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, lineHeight: 1.6 }}>
              Первоначальная конфигурация базы данных и администратора успешно выполнена. В целях безопасности мастер настройки заблокирован.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/login')}
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 4, py: 1.3, fontWeight: 700, borderRadius: '10px', textTransform: 'none', fontSize: '0.95rem' }}
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
        background: 'radial-gradient(1200px circle at 50% 0%, rgba(14, 165, 233, 0.15), transparent 50%), linear-gradient(180deg, #0b1120 0%, #0f172a 100%)',
        py: { xs: 4, md: 6 },
        px: { xs: 2, md: 4 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Brand Header */}
      <Box sx={{ textAlign: 'center', mb: 4, maxWidth: 640 }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="EMS Logo"
            sx={{ width: 48, height: 48, objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(14, 165, 233, 0.4))' }}
          />
          <Typography variant="h4" fontWeight={900} color="white" letterSpacing={-0.5} sx={{ display: 'inline-block' }}>
            EMS Platform
          </Typography>
        </Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'sky.300', mb: 0.5 }}>
          Мастер первоначальной настройки и развертывания
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Пошаговая конфигурация базы данных PostgreSQL, системы безопасности и производственных модулей
        </Typography>
      </Box>

      {/* Main Wizard Container */}
      <Card
        sx={{
          maxWidth: 900,
          width: '100%',
          borderRadius: 4,
          boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          bgcolor: '#ffffff',
        }}
      >
        {/* Stepper Header */}
        <Box sx={{ bgcolor: '#f8fafc', px: 4, py: 3.5, borderBottom: '1px solid #e2e8f0' }}>
          <Stepper activeStep={activeStep} alternativeLabel connector={<ModernConnector />}>
            {STEPS.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  StepIconComponent={(props) => (
                    <ModernStepIcon active={props.active} completed={props.completed} icon={index + 1} />
                  )}
                >
                  <Typography
                    variant="caption"
                    fontWeight={activeStep === index ? 800 : 600}
                    color={activeStep === index ? 'primary.main' : 'text.secondary'}
                    sx={{ fontSize: '0.8rem', mt: 0.5, display: 'block', lineHeight: 1.25 }}
                  >
                    {label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <CardContent sx={{ p: { xs: 3, md: 4.5 } }}>
          {/* =========================================================================
              STEP 1: System Checks & Dependencies
             ========================================================================= */}
          {activeStep === 0 && (
            <Stack spacing={3}>
              {/* Header Title */}
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
                  onClick={handleRefreshDependencies}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '8px',
                    px: 2,
                    py: 0.8,
                    borderColor: '#cbd5e1',
                    color: 'text.primary',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(2, 132, 199, 0.04)' },
                  }}
                >
                  {isRefreshingDeps ? 'Диагностика...' : 'Повторить проверку'}
                </Button>
              </Box>

              {/* Status Alert Banner */}
              {dependencies && !dependencies.allCriticalPassed && (
                <Alert
                  severity="error"
                  icon={<ErrorOutlineIcon sx={{ fontSize: 24 }} />}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid #fecaca',
                    bgcolor: '#fef2f2',
                    '& .MuiAlert-message': { width: '100%' },
                  }}
                >
                  <AlertTitle sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 0.5 }}>
                    Установка заблокирована: обнаружены неисправные зависимости ({dependencies.failedCount})
                  </AlertTitle>
                  <Typography variant="body2" sx={{ color: '#991b1b', lineHeight: 1.5 }}>
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
                    border: '1px solid #bbf7d0',
                    bgcolor: '#f0fdf4',
                    '& .MuiAlert-message': { width: '100%' },
                  }}
                >
                  <AlertTitle sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 0.5 }}>
                    Все системные зависимости успешно проверены
                  </AlertTitle>
                  <Typography variant="body2" sx={{ color: '#166534', lineHeight: 1.5 }}>
                    Среда Node.js, сокет PostgreSQL, каталог файлов и криптографическая подсистема исправны. Нажмите <b>«Далее»</b> для перехода к настройке базы данных.
                  </Typography>
                </Alert>
              )}

              {/* Dependencies Grid */}
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
                          borderColor: isFail ? '#fca5a5' : isWarn ? '#fde68a' : '#e2e8f0',
                          backgroundColor: isFail ? '#fff8f8' : isWarn ? '#fffdf7' : '#ffffff',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.06)',
                            borderColor: isFail ? '#f87171' : isWarn ? '#f59e0b' : '#cbd5e1',
                          },
                        }}
                      >
                        {/* Card Header */}
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

                          <StatusBadge
                            status={badgeStatus}
                            label={badgeLabel}
                            variant="subtle"
                            size="medium"
                          />
                        </Box>

                        {/* Card Values Grid */}
                        <Grid container spacing={1.5} sx={{ mt: 0.5, bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, border: '1px solid #f1f5f9' }}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.25 }}>
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
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.25 }}>
                              Требование платформы:
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.875rem' }}>
                              {check.requiredValue}
                            </Typography>
                          </Grid>
                        </Grid>

                        {/* Troubleshooting Guide */}
                        {isFail && check.troubleshooting && (
                          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
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
          )}

          {/* =========================================================================
              STEP 2: Database Configuration
             ========================================================================= */}
          {activeStep === 1 && (
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
                    value={dbHost}
                    onChange={(e) => {
                      setDbHost(e.target.value);
                      setDbTestResult(null);
                    }}
                    placeholder="postgres или 127.0.0.1"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <StorageIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Порт"
                    value={dbPort}
                    onChange={(e) => {
                      setDbPort(e.target.value);
                      setDbTestResult(null);
                    }}
                    placeholder="5432"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Имя рабочей базы данных"
                    value={dbName}
                    onChange={(e) => {
                      setDbName(e.target.value);
                      setDbTestResult(null);
                    }}
                    placeholder="ems_db"
                    helperText="Если база данных отсутствует, установщик автоматически создаст её"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Пользователь БД"
                    value={dbUser}
                    onChange={(e) => {
                      setDbUser(e.target.value);
                      setDbTestResult(null);
                    }}
                    placeholder="postgres"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type={showDbPass ? 'text' : 'password'}
                    label="Пароль пользователя БД"
                    value={dbPassword}
                    onChange={(e) => {
                      setDbPassword(e.target.value);
                      setDbTestResult(null);
                    }}
                    placeholder="••••••••"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowDbPass(!showDbPass)} edge="end" size="small">
                            {showDbPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              {dbTestResult && (
                <Alert
                  severity={dbTestResult.success ? 'success' : 'error'}
                  icon={dbTestResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                  sx={{ borderRadius: 3 }}
                >
                  <AlertTitle sx={{ fontWeight: 700 }}>
                    {dbTestResult.success ? 'Связь с базой данных установлена' : 'Ошибка соединения с БД'}
                  </AlertTitle>
                  {dbTestResult.message}
                  {dbTestResult.latencyMs && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      Время отклика сокета: {dbTestResult.latencyMs} мс
                    </Typography>
                  )}
                </Alert>
              )}

              <Box>
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={isTestingDb ? <CircularProgress size={18} /> : <PlayArrowIcon />}
                  onClick={handleTestDatabase}
                  disabled={isTestingDb || !dbHost.trim() || !dbUser.trim() || !dbName.trim()}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '8px',
                    px: 3,
                    py: 1.1,
                  }}
                >
                  {isTestingDb ? 'Проверка соединения...' : 'Проверить подключение к PostgreSQL'}
                </Button>
              </Box>
            </Stack>
          )}

          {/* =========================================================================
              STEP 3: Admin & LDAP Authentication
             ========================================================================= */}
          {activeStep === 2 && (
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(2, 132, 199, 0.1)', color: 'primary.main', width: 44, height: 44 }}>
                  <AdminPanelSettingsIcon sx={{ fontSize: 24 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={800} color="text.primary">
                    Шаг 3: Авторизация и учетная запись Главного Администратора
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Выберите режим управления пользователями и настройте супер-администратора
                  </Typography>
                </Box>
              </Box>

              {/* Mode Selection Cards */}
              <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: '#334155' }}>
                  Режим аутентификации главного администратора:
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
                        p: 2.5,
                        cursor: 'pointer',
                        borderRadius: 3,
                        border: '2px solid',
                        borderColor: authMode === 'local' ? 'primary.main' : '#e2e8f0',
                        bgcolor: authMode === 'local' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { borderColor: 'primary.light' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                        <Radio checked={authMode === 'local'} size="small" />
                        <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                          Локальная база данных
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ pl: 4, fontSize: '0.8rem', lineHeight: 1.4 }}>
                        Создание независимого администратора с хранением криптостойкого хеша пароля в PostgreSQL
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Paper
                      onClick={() => setAuthMode('ldap')}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        cursor: 'pointer',
                        borderRadius: 3,
                        border: '2px solid',
                        borderColor: authMode === 'ldap' ? 'primary.main' : '#e2e8f0',
                        bgcolor: authMode === 'ldap' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { borderColor: 'primary.light' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                        <Radio checked={authMode === 'ldap'} size="small" />
                        <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                          Active Directory / LDAP
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ pl: 4, fontSize: '0.8rem', lineHeight: 1.4 }}>
                        Прямая привязка (User Binding). Пароль НЕ сохраняется в базе данных платформы
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              {/* Mode 1: Local DB Form */}
              {authMode === 'local' && (
                <Stack spacing={2.5}>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Логин администратора"
                        value={adminLogin}
                        onChange={(e) => setAdminLogin(e.target.value)}
                        placeholder="admin"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockOutlinedIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
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
                              <IconButton onClick={() => setShowAdminPass(!showAdminPass)} edge="end" size="small">
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

                  {/* Secondary LDAP toggle */}
                  <Box>
                    <FormControlLabel
                      control={<Switch checked={ldapEnabled} onChange={(e) => setLdapEnabled(e.target.checked)} color="primary" />}
                      label={
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            Включить доменную авторизацию LDAP для остальных сотрудников
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Позволяет инженерам и МОЛ входить под своими доменными учетными записями Windows
                          </Typography>
                        </Box>
                      }
                    />

                    {ldapEnabled && (
                      <Stack spacing={2} sx={{ mt: 2, p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
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
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                          >
                            {isTestingLdap ? 'Проверка связи...' : 'Проверить связь с LDAP/AD'}
                          </Button>
                        </Box>
                      </Stack>
                    )}
                  </Box>
                </Stack>
              )}

              {/* Mode 2: LDAP User Binding Form */}
              {authMode === 'ldap' && (
                <Stack spacing={2.5}>
                  <Alert severity="info" sx={{ borderRadius: 3 }}>
                    <AlertTitle sx={{ fontWeight: 800 }}>Режим сквозной авторизации LDAP Binding</AlertTitle>
                    В этом режиме пароль администратора <strong>НЕ сохраняется в базе данных</strong>. Для продолжения установки подтвердите доменные учетные данные.
                  </Alert>

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
                    helperText="Адрес службы каталога (389 для LDAP, 636 для защищенного LDAPS)"
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
                        label="Фильтр поиска"
                        placeholder="(|(sAMAccountName={{username}})(uid={{username}}))"
                        value={ldapSearchFilter}
                        onChange={(e) => {
                          setLdapSearchFilter(e.target.value);
                          setLdapAuthVerified(false);
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="subtitle2" fontWeight={800}>
                    Учетные данные супер-администратора в домене / каталоге:
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Логин в LDAP"
                        value={adminLogin}
                        onChange={(e) => {
                          setAdminLogin(e.target.value);
                          setLdapAuthVerified(false);
                        }}
                        placeholder="admin"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        type={showAdminPass ? 'text' : 'password'}
                        label="Пароль в LDAP"
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          setLdapAuthVerified(false);
                        }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowAdminPass(!showAdminPass)} edge="end" size="small">
                                {showAdminPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>

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
                      variant="contained"
                      color={ldapAuthVerified ? 'success' : 'primary'}
                      startIcon={isTestingLdap ? <CircularProgress size={18} color="inherit" /> : (ldapAuthVerified ? <CheckCircleIcon /> : <LanIcon />)}
                      onClick={handleTestLdapAuth}
                      disabled={isTestingLdap || !adminLogin.trim() || !adminPassword || !ldapUrl.trim()}
                      sx={{ py: 1.2, px: 3, fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
                    >
                      {isTestingLdap ? 'Проверка связывания...' : (ldapAuthVerified ? 'Учетные данные в LDAP подтверждены' : 'Проверить соединение и пароль в LDAP')}
                    </Button>
                  </Box>
                </Stack>
              )}
            </Stack>
          )}

          {/* =========================================================================
              STEP 4: Storage & SRM Integrations
             ========================================================================= */}
          {activeStep === 3 && (
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(2, 132, 199, 0.1)', color: 'primary.main', width: 44, height: 44 }}>
                  <FolderOpenIcon sx={{ fontSize: 24 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={800} color="text.primary">
                    Шаг 4: Хранилище файлов и внешние интеграции
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Настройка директории для паспортов, чертежей и связи с заявками ServiceDesk
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Директория хранения файлов, паспортов и чертежей"
                value={storageDir}
                onChange={(e) => setStorageDir(e.target.value)}
                helperText="Локальный каталог сервера или путь внутри Docker-тома (/app/uploads)"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FolderOpenIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Divider />

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <HubIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                  <Typography variant="subtitle1" fontWeight={800}>
                    Интеграция с внешней системой ServiceDesk (SRM) — опционально
                  </Typography>
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[
                    { id: 'DISABLED', label: 'Отключено', desc: 'Автономная работа' },
                    { id: 'JIRA', label: 'Atlassian Jira', desc: 'Jira Cloud / Server' },
                    { id: 'REDMINE', label: 'Redmine', desc: 'REST API' },
                    { id: 'GITLAB', label: 'GitLab Issues', desc: 'GitLab API' },
                    { id: 'GENERIC_REST', label: 'Custom REST API', desc: 'Универсальный вебхук' },
                  ].map((prov) => (
                    <Grid item xs={12} sm={4} key={prov.id}>
                      <Paper
                        onClick={() => setSrmProvider(prov.id as any)}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          cursor: 'pointer',
                          borderRadius: 2.5,
                          border: '2px solid',
                          borderColor: srmProvider === prov.id ? 'primary.main' : '#e2e8f0',
                          bgcolor: srmProvider === prov.id ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': { borderColor: 'primary.light' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Radio checked={srmProvider === prov.id} size="small" />
                          <Typography variant="subtitle2" fontWeight={700}>
                            {prov.label}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ pl: 3.5, display: 'block' }}>
                          {prov.desc}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {srmProvider !== 'DISABLED' && (
                  <Grid container spacing={2} sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        label="URL внешней системы"
                        placeholder="https://jira.company.com или https://redmine.local"
                        value={srmUrl}
                        onChange={(e) => setSrmUrl(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Ключ проекта"
                        placeholder="EMS"
                        value={srmProjectKey}
                        onChange={(e) => setSrmProjectKey(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="API Token / Ключ доступа"
                        placeholder="••••••••••••"
                        value={srmApiKey}
                        onChange={(e) => setSrmApiKey(e.target.value)}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>
            </Stack>
          )}

          {/* =========================================================================
              STEP 5: Final Review & Execution
             ========================================================================= */}
          {activeStep === 4 && (
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

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                      База данных PostgreSQL
                    </Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ mt: 0.25 }}>
                      {dbHost}:{dbPort}/{dbName} (пользователь: {dbUser})
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
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
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                      Служба каталогов LDAP
                    </Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ mt: 0.25 }}>
                      {authMode === 'ldap' || ldapEnabled ? `Включена (${ldapUrl})` : 'Отключена (локальная БД)'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                      Хранилище файлов
                    </Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ mt: 0.25 }}>
                      {storageDir}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {isExecuting && (
                <Box sx={{ width: '100%', p: 2, bgcolor: 'rgba(2, 132, 199, 0.04)', borderRadius: 3, border: '1px solid rgba(2, 132, 199, 0.2)' }}>
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
          )}

          {/* =========================================================================
              Wizard Navigation Footer
             ========================================================================= */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 5,
              pt: 3,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <Button
              disabled={activeStep === 0 || isExecuting || execSuccess}
              onClick={() => setActiveStep((prev) => prev - 1)}
              startIcon={<ArrowBackIcon />}
              sx={{ textTransform: 'none', fontWeight: 700, px: 3, py: 1, borderRadius: '8px', color: 'text.secondary' }}
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
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3.5,
                  py: 1.1,
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                }}
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
                sx={{
                  px: 4,
                  py: 1.2,
                  fontWeight: 800,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                }}
              >
                {isExecuting ? 'Инициализация...' : 'Завершить установку и запустить'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
