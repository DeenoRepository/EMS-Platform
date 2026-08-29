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
import { SetupAdminLdapStep } from '@/components/setup/SetupAdminLdapStep';
import { buildSetupPayload } from './setup-payload';
import { SetupDatabaseStep } from '@/components/setup/SetupDatabaseStep';
import { SetupDependencyStep } from '@/components/setup/SetupDependencyStep';
import { SetupStorageSrmStep } from '@/components/setup/SetupStorageSrmStep';
import { SetupExecutionStep } from '@/components/setup/SetupExecutionStep';
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
      backgroundImage: 'linear-gradient(95deg, primary.main 0%, primary.light 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, success.main 0%, success.light 100%)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: 'divider',
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
        bgcolor: completed ? 'success.main' : active ? 'primary.main' : 'action.hover',
        color: completed || active ? 'background.paper' : 'text.secondary',
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
  const [dbPassword, setDbPassword] = useState('');
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [showDbPass, setShowDbPass] = useState(false);

  // Step 3: Admin & LDAP Config
  const [authMode, setAuthMode] = useState<'local' | 'ldap'>('local');
  const [adminLogin, setAdminLogin] = useState('admin');
  const [adminDisplayName, setAdminDisplayName] = useState('Главный Администратор');
  const [adminEmail, setAdminEmail] = useState('admin@company.local');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [ldapUrl, setLdapUrl] = useState('ldap://127.0.0.1:389');
  const [ldapBindDn, setLdapBindDn] = useState('cn=admin,dc=company,dc=local');
  const [ldapBindPassword, setLdapBindPassword] = useState('');
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
      const payload = buildSetupPayload({
        dbHost,
        dbPort,
        dbName,
        dbUser,
        dbPassword,
        adminLogin,
        adminDisplayName,
        adminEmail,
        adminPassword,
        authMode,
        ldapEnabled,
        ldapUrl,
        ldapBindDn,
        ldapBindPassword,
        ldapSearchBase,
        ldapSearchFilter,
        storageDir,
        srmUrl,
        srmProjectKey,
        srmApiKey,
      });

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


  if (isCheckingStatus) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.900' }}>
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
          background: 'radial-gradient(1000px circle at 50% 10%, rgba(14, 165, 233, 0.12), transparent 40%), linear-gradient(180deg, grey.900 0%, text.primary 100%)',
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 520, width: '100%', borderRadius: 4, p: 2, textAlign: 'center', boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)' }}>
          <CardContent sx={{ p: 4 }}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'success.main', mx: 'auto', mb: 2.5 }}>
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
        background: 'radial-gradient(1200px circle at 50% 0%, rgba(14, 165, 233, 0.15), transparent 50%), linear-gradient(180deg, grey.900 0%, text.primary 100%)',
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
        <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '0.875rem' }}>
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
          bgcolor: 'background.paper',
        }}
      >
        {/* Stepper Header */}
        <Box sx={{ bgcolor: 'background.default', px: 4, py: 3.5, borderBottom: '1px solid divider' }}>
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
            <SetupDependencyStep
              dependencies={dependencies}
              isRefreshingDeps={isRefreshingDeps}
              isCheckingStatus={isCheckingStatus}
              onRefreshDependencies={handleRefreshDependencies}
            />
          )}

          {/* =========================================================================
              STEP 2: Database Configuration
             ========================================================================= */}
          {activeStep === 1 && (
            <SetupDatabaseStep
              host={dbHost}
              port={dbPort}
              database={dbName}
              user={dbUser}
              password={dbPassword}
              testResult={dbTestResult}
              isTesting={isTestingDb}
              showPassword={showDbPass}
              onHostChange={(value) => { setDbHost(value); setDbTestResult(null); }}
              onPortChange={(value) => { setDbPort(value); setDbTestResult(null); }}
              onDatabaseChange={(value) => { setDbName(value); setDbTestResult(null); }}
              onUserChange={(value) => { setDbUser(value); setDbTestResult(null); }}
              onPasswordChange={(value) => { setDbPassword(value); setDbTestResult(null); }}
              onShowPasswordChange={setShowDbPass}
              onTest={handleTestDatabase}
            />
          )}

          {/* =========================================================================
              STEP 3: Admin & LDAP Authentication
             ========================================================================= */}
          {activeStep === 2 && (
            <SetupAdminLdapStep
              authMode={authMode}
              adminLogin={adminLogin}
              adminDisplayName={adminDisplayName}
              adminEmail={adminEmail}
              adminPassword={adminPassword}
              adminPasswordConfirm={adminPasswordConfirm}
              showAdminPassword={showAdminPass}
              ldapEnabled={ldapEnabled}
              ldapUrl={ldapUrl}
              ldapBindDn={ldapBindDn}
              ldapBindPassword={ldapBindPassword}
              ldapSearchBase={ldapSearchBase}
              ldapSearchFilter={ldapSearchFilter}
              ldapTestResult={ldapTestResult}
              ldapAuthVerified={ldapAuthVerified}
              isTestingLdap={isTestingLdap}
              onAuthModeChange={(mode) => {
                setAuthMode(mode);
                if (mode === 'local') setLdapAuthVerified(false);
              }}
              onAdminLoginChange={(value) => { setAdminLogin(value); if (authMode === 'ldap') setLdapAuthVerified(false); }}
              onAdminDisplayNameChange={setAdminDisplayName}
              onAdminEmailChange={setAdminEmail}
              onAdminPasswordChange={(value) => { setAdminPassword(value); if (authMode === 'ldap') setLdapAuthVerified(false); }}
              onAdminPasswordConfirmChange={setAdminPasswordConfirm}
              onShowAdminPasswordChange={setShowAdminPass}
              onLdapEnabledChange={setLdapEnabled}
              onLdapUrlChange={(value) => { setLdapUrl(value); if (authMode === 'ldap') setLdapAuthVerified(false); }}
              onLdapBindDnChange={setLdapBindDn}
              onLdapBindPasswordChange={setLdapBindPassword}
              onLdapSearchBaseChange={(value) => { setLdapSearchBase(value); if (authMode === 'ldap') setLdapAuthVerified(false); }}
              onLdapSearchFilterChange={(value) => { setLdapSearchFilter(value); if (authMode === 'ldap') setLdapAuthVerified(false); }}
              onTestLdap={handleTestLdap}
              onTestLdapAuth={handleTestLdapAuth}
            />
          )}

          {/* =========================================================================
              STEP 4: Storage & SRM Integrations
             ========================================================================= */}
          {activeStep === 3 && (
            <SetupStorageSrmStep
              storageDir={storageDir}
              setStorageDir={setStorageDir}
              srmProvider={srmProvider}
              setSrmProvider={setSrmProvider}
              srmUrl={srmUrl}
              setSrmUrl={setSrmUrl}
              srmProjectKey={srmProjectKey}
              setSrmProjectKey={setSrmProjectKey}
              srmApiKey={srmApiKey}
              setSrmApiKey={setSrmApiKey}
            />
          )}

          {/* =========================================================================
              STEP 5: Final Review & Execution
             ========================================================================= */}
          {activeStep === 4 && (
            <SetupExecutionStep
              dbHost={dbHost}
              dbPort={dbPort}
              dbName={dbName}
              dbUser={dbUser}
              adminLogin={adminLogin}
              adminDisplayName={adminDisplayName}
              authMode={authMode}
              ldapEnabled={ldapEnabled}
              ldapUrl={ldapUrl}
              storageDir={storageDir}
              isExecuting={isExecuting}
              execError={execError}
              execSuccess={execSuccess}
            />
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
              borderTop: '1px solid divider',
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
