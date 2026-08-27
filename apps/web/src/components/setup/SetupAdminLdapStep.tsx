'use client';

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Radio,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LanIcon from '@mui/icons-material/Lan';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export interface LdapTestResult {
  success: boolean;
  message: string;
}

export interface SetupAdminLdapStepProps {
  authMode: 'local' | 'ldap';
  adminLogin: string;
  adminDisplayName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  showAdminPassword: boolean;
  ldapEnabled: boolean;
  ldapUrl: string;
  ldapBindDn: string;
  ldapBindPassword: string;
  ldapSearchBase: string;
  ldapSearchFilter: string;
  ldapTestResult: LdapTestResult | null;
  ldapAuthVerified: boolean;
  isTestingLdap: boolean;
  onAuthModeChange: (mode: 'local' | 'ldap') => void;
  onAdminLoginChange: (value: string) => void;
  onAdminDisplayNameChange: (value: string) => void;
  onAdminEmailChange: (value: string) => void;
  onAdminPasswordChange: (value: string) => void;
  onAdminPasswordConfirmChange: (value: string) => void;
  onShowAdminPasswordChange: (show: boolean) => void;
  onLdapEnabledChange: (enabled: boolean) => void;
  onLdapUrlChange: (value: string) => void;
  onLdapBindDnChange: (value: string) => void;
  onLdapBindPasswordChange: (value: string) => void;
  onLdapSearchBaseChange: (value: string) => void;
  onLdapSearchFilterChange: (value: string) => void;
  onTestLdap: () => void;
  onTestLdapAuth: () => void;
}

export function SetupAdminLdapStep({
  authMode,
  adminLogin,
  adminDisplayName,
  adminEmail,
  adminPassword,
  adminPasswordConfirm,
  showAdminPassword,
  ldapEnabled,
  ldapUrl,
  ldapBindDn,
  ldapBindPassword,
  ldapSearchBase,
  ldapSearchFilter,
  ldapTestResult,
  ldapAuthVerified,
  isTestingLdap,
  onAuthModeChange,
  onAdminLoginChange,
  onAdminDisplayNameChange,
  onAdminEmailChange,
  onAdminPasswordChange,
  onAdminPasswordConfirmChange,
  onShowAdminPasswordChange,
  onLdapEnabledChange,
  onLdapUrlChange,
  onLdapBindDnChange,
  onLdapBindPasswordChange,
  onLdapSearchBaseChange,
  onLdapSearchFilterChange,
  onTestLdap,
  onTestLdapAuth,
}: SetupAdminLdapStepProps) {
  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ bgcolor: 'rgba(2, 132, 199, 0.1)', color: 'primary.main', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
          <AdminPanelSettingsIcon sx={{ fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={800} color="text.primary">
            Шаг 3: Авторизация и учетная запись Главного Администратора
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Выберите режим управления пользователями и настройте супер-администратора
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: '#334155' }}>
          Режим аутентификации главного администратора:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Paper
              onClick={() => onAuthModeChange('local')}
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
              onClick={() => onAuthModeChange('ldap')}
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

      {authMode === 'local' && (
        <Stack spacing={2.5}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth required label="Логин администратора" value={adminLogin}
                onChange={(event) => onAdminLoginChange(event.target.value)} placeholder="admin"
                InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="ФИО / Отображаемое имя" value={adminDisplayName} onChange={(event) => onAdminDisplayNameChange(event.target.value)} placeholder="Главный Администратор" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Email администратора" type="email" value={adminEmail} onChange={(event) => onAdminEmailChange(event.target.value)} placeholder="admin@company.local" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth required type={showAdminPassword ? 'text' : 'password'} label="Пароль администратора" value={adminPassword}
                onChange={(event) => onAdminPasswordChange(event.target.value)}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => onShowAdminPasswordChange(!showAdminPassword)} edge="end" size="small">{showAdminPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth required type={showAdminPassword ? 'text' : 'password'} label="Подтверждение пароля" value={adminPasswordConfirm}
                onChange={(event) => onAdminPasswordConfirmChange(event.target.value)}
                error={Boolean(adminPasswordConfirm && adminPassword !== adminPasswordConfirm)}
                helperText={adminPasswordConfirm && adminPassword !== adminPasswordConfirm ? 'Пароли не совпадают' : undefined}
              />
            </Grid>
          </Grid>
          <Divider sx={{ my: 1 }} />
          <Box>
            <FormControlLabel
              control={<Switch checked={ldapEnabled} onChange={(event) => onLdapEnabledChange(event.target.checked)} color="primary" />}
              label={<Box><Typography variant="subtitle2" fontWeight={700}>Включить доменную авторизацию LDAP для остальных сотрудников</Typography><Typography variant="caption" color="text.secondary">Позволяет инженерам и МОЛ входить под своими доменными учетными записями Windows</Typography></Box>}
            />
            {ldapEnabled && (
              <Stack spacing={2} sx={{ mt: 2, p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <TextField fullWidth label="LDAP URL" placeholder="ldap://ad.company.local:389" value={ldapUrl} onChange={(event) => onLdapUrlChange(event.target.value)} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Bind DN (Служебный аккаунт)" placeholder="CN=EMS_Service,OU=Services,DC=company,DC=local" value={ldapBindDn} onChange={(event) => onLdapBindDnChange(event.target.value)} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth type="password" label="Bind Password" value={ldapBindPassword} onChange={(event) => onLdapBindPasswordChange(event.target.value)} /></Grid>
                </Grid>
                <TextField fullWidth label="Search Base (Корень поиска)" placeholder="OU=Users,DC=company,DC=local" value={ldapSearchBase} onChange={(event) => onLdapSearchBaseChange(event.target.value)} />
                {ldapTestResult && <Alert severity={ldapTestResult.success ? 'success' : 'error'} icon={ldapTestResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />} sx={{ borderRadius: 2 }}>{ldapTestResult.message}</Alert>}
                <Box><Button variant="outlined" size="small" startIcon={isTestingLdap ? <CircularProgress size={16} /> : <LanIcon />} onClick={onTestLdap} disabled={isTestingLdap} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}>{isTestingLdap ? 'Проверка связи...' : 'Проверить связь с LDAP/AD'}</Button></Box>
              </Stack>
            )}
          </Box>
        </Stack>
      )}

      {authMode === 'ldap' && (
        <Stack spacing={2.5}>
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            <AlertTitle sx={{ fontWeight: 800 }}>Режим сквозной авторизации LDAP Binding</AlertTitle>
            В этом режиме пароль администратора <strong>НЕ сохраняется в базе данных</strong>. Для продолжения установки подтвердите доменные учетные данные.
          </Alert>
          <TextField fullWidth required label="LDAP URL" placeholder="ldap://ad.company.local:389" value={ldapUrl} onChange={(event) => { onLdapUrlChange(event.target.value); }} helperText="Адрес службы каталога (389 для LDAP, 636 для защищенного LDAPS)" />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth required label="Search Base (Корень поиска)" placeholder="DC=company,DC=local" value={ldapSearchBase} onChange={(event) => onLdapSearchBaseChange(event.target.value)} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Фильтр поиска" placeholder="(|(sAMAccountName={{username}})(uid={{username}}))" value={ldapSearchFilter} onChange={(event) => onLdapSearchFilterChange(event.target.value)} /></Grid>
          </Grid>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" fontWeight={800}>Учетные данные супер-администратора в домене / каталоге:</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth required label="Логин в LDAP" value={adminLogin} onChange={(event) => onAdminLoginChange(event.target.value)} placeholder="admin" /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required type={showAdminPassword ? 'text' : 'password'} label="Пароль в LDAP" value={adminPassword} onChange={(event) => onAdminPasswordChange(event.target.value)} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => onShowAdminPasswordChange(!showAdminPassword)} edge="end" size="small">{showAdminPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
            </Grid>
          </Grid>
          {ldapTestResult && <Alert severity={ldapTestResult.success ? 'success' : 'error'} icon={ldapTestResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />} sx={{ borderRadius: 2 }}>{ldapTestResult.message}</Alert>}
          <Box><Button variant="contained" color={ldapAuthVerified ? 'success' : 'primary'} startIcon={isTestingLdap ? <CircularProgress size={18} color="inherit" /> : (ldapAuthVerified ? <CheckCircleIcon /> : <LanIcon />)} onClick={onTestLdapAuth} disabled={isTestingLdap || !adminLogin.trim() || !adminPassword || !ldapUrl.trim()} sx={{ py: 1.2, px: 3, fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}>{isTestingLdap ? 'Проверка связывания...' : (ldapAuthVerified ? 'Учетные данные в LDAP подтверждены' : 'Проверить соединение и пароль в LDAP')}</Button></Box>
        </Stack>
      )}
    </Stack>
  );
}
