import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LanIcon from '@mui/icons-material/Lan';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

export interface LdapTestResult {
  success: boolean;
  latencyMs?: number;
  message?: string;
  error?: string;
  details?: {
    authMode?: string;
  };
}

export interface AdminLdapIntegrationPanelProps {
  ldapUrl: string;
  searchBase: string;
  testing: boolean;
  testResult: LdapTestResult | null;
  onLdapUrlChange: (value: string) => void;
  onSearchBaseChange: (value: string) => void;
  onTestConnection: () => void;
}

export function AdminLdapIntegrationPanel({
  ldapUrl,
  searchBase,
  testing,
  testResult,
  onLdapUrlChange,
  onSearchBaseChange,
  onTestConnection,
}: AdminLdapIntegrationPanelProps) {
  return (
    <Grid item xs={12} md={6}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LanIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Интеграция с LDAP / Active Directory
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={testing ? <CircularProgress size={14} color="inherit" /> : <NetworkCheckIcon />}
              disabled={testing}
              onClick={onTestConnection}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              {testing ? 'Проверка...' : 'Проверить подключение'}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" paragraph>
            Параметры корпоративного каталога для аутентификации пользователей
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="LDAP URL"
              placeholder="ldap://ldap.company.local:389"
              fullWidth
              size="small"
              value={ldapUrl}
              onChange={(event) => onLdapUrlChange(event.target.value)}
              helperText="Адрес сервера каталогов"
            />

            <TextField
              label="LDAP Search Base"
              placeholder="ou=users,dc=company,dc=local"
              fullWidth
              size="small"
              value={searchBase}
              onChange={(event) => onSearchBaseChange(event.target.value)}
              helperText="Базовая ветка поиска пользователей"
            />

            {testResult && (
              <Alert
                severity={testResult.success ? 'success' : 'error'}
                icon={testResult.success ? <CheckCircleOutlineIcon fontSize="inherit" /> : <ErrorOutlineIcon fontSize="inherit" />}
                sx={{ mt: 1, borderRadius: 2, fontSize: '0.8125rem' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                    {testResult.success
                      ? testResult.message || 'Подключение успешно установлено'
                      : testResult.error || 'Ошибка подключения'}
                  </Typography>
                  {testResult.latencyMs !== undefined && (
                    <Chip
                      label={`${testResult.latencyMs} мс`}
                      size="small"
                      color={testResult.success ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                    />
                  )}
                </Box>
                {testResult.details?.authMode && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Режим проверки: {testResult.details.authMode}
                  </Typography>
                )}
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

export default AdminLdapIntegrationPanel;
