'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Stack,
  Paper,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import CableIcon from '@mui/icons-material/Cable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import LanguageIcon from '@mui/icons-material/Language';
import { useSnackbar } from 'notistack';
import { FormDialog } from '@/components/ui';

export interface SrmIntegrationWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    id?: string;
    name?: string;
    providerType?: string;
    baseUrl?: string;
    authType?: string;
    syncInterval?: number;
  } | null;
}

const PROVIDERS = [
  { key: 'JIRA', name: 'Atlassian Jira REST API', defaultEndpoint: '/rest/api/2/search', placeholder: 'https://jira.company.ru' },
  { key: 'REDMINE', name: 'Redmine Issue Tracker', defaultEndpoint: '/issues.json', placeholder: 'https://redmine.corp.local' },
  { key: 'GITLAB_ISSUES', name: 'GitLab Issues API', defaultEndpoint: '/api/v4/projects', placeholder: 'https://gitlab.com' },
  { key: 'REST_GENERIC', name: 'Универсальный REST / 1C ServiceDesk', defaultEndpoint: '/api/v1/incidents', placeholder: 'https://servicedesk.corp.local/api' },
  { key: 'SERVICE_NOW', name: 'ServiceNow ITSM Table API', defaultEndpoint: '/api/now/table/incident', placeholder: 'https://instance.service-now.com' },
];

export default function SrmIntegrationWizardDialog({
  open,
  onClose,
  onSuccess,
  initialData,
}: SrmIntegrationWizardDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  // Stepper State (0: Выбор провайдера и URL, 1: Аутентификация и параметры, 2: Проверка и сохранение)
  const [activeStep, setActiveStep] = useState(0);

  // Form Fields
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState('JIRA');
  const [baseUrl, setBaseUrl] = useState('');
  const [authType, setAuthType] = useState('BASIC');
  const [projectKeyOrId, setProjectKeyOrId] = useState('EMS');
  const [equipmentCustomField, setEquipmentCustomField] = useState('customfield_10100');
  const [username, setUsername] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('X-Api-Key');
  const [syncInterval, setSyncInterval] = useState(60);

  // Test connection state
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setTestResult(null);
      if (initialData) {
        setName(initialData.name || '');
        setProviderType(initialData.providerType || 'JIRA');
        setBaseUrl(initialData.baseUrl || '');
        setAuthType(initialData.authType || 'BASIC');
        setSyncInterval(initialData.syncInterval || 60);
      } else {
        setName('Корпоративная Jira SRM');
        setProviderType('JIRA');
        setBaseUrl('https://jira.company.ru');
        setAuthType('BASIC');
        setProjectKeyOrId('EMS');
        setEquipmentCustomField('customfield_10100');
        setUsername('');
        setApiToken('');
        setSyncInterval(60);
      }
    }
  }, [open, initialData]);

  const selectedProviderMeta = PROVIDERS.find((p) => p.key === providerType) || PROVIDERS[0];

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/srm/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerType,
          baseUrl,
          authType,
          authConfig: {
            username: username.trim(),
            apiToken: apiToken.trim(),
            headerName: apiKeyHeader.trim(),
            apiKey: apiToken.trim(),
          },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTestResult({ success: true, message: json.message || 'Подключение успешно верифицировано!' });
        enqueueSnackbar('Соединение с сервером успешно установлено', { variant: 'success' });
      } else {
        setTestResult({ success: false, message: json.error || 'Не удалось подключиться к серверу' });
        enqueueSnackbar(json.error || 'Ошибка проверки связи', { variant: 'warning' });
      }
    } catch {
      setTestResult({ success: false, message: 'Ошибка сетевого запроса к серверу' });
      enqueueSnackbar('Сетевая ошибка при проверке подключения', { variant: 'error' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleNextStep = () => {
    if (activeStep === 0) {
      if (!name.trim()) {
        enqueueSnackbar('Укажите название подключения', { variant: 'warning' });
        return;
      }
      if (!baseUrl.trim()) {
        enqueueSnackbar('Укажите базовый URL сервера', { variant: 'warning' });
        return;
      }
    }
    setActiveStep((prev) => Math.min(prev + 1, 2));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const authConfig: Record<string, any> = {};
      if (authType === 'BASIC') {
        authConfig.username = username.trim();
        authConfig.apiToken = apiToken.trim();
      } else if (authType === 'BEARER') {
        authConfig.apiToken = apiToken.trim();
      } else if (authType === 'API_KEY') {
        authConfig.headerName = apiKeyHeader.trim();
        authConfig.apiKey = apiToken.trim();
      }

      const queryConfig: Record<string, any> = {
        endpoint: selectedProviderMeta.defaultEndpoint,
        method: 'GET',
        projectKey: projectKeyOrId.trim(),
        equipmentCustomField: equipmentCustomField.trim(),
      };

      const res = await fetch('/api/srm/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          providerType,
          baseUrl: baseUrl.trim(),
          authType,
          authConfig,
          queryConfig,
          syncInterval: Number(syncInterval) || 60,
          isActive: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Интеграция ServiceDesk успешно настроена и сохранена', { variant: 'success' });
        onSuccess();
        onClose();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения интеграции', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при сохранении интеграции', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Мастер настройки интеграции ServiceDesk / Jira"
      subtitle="Пошаговое подключение внешнего трекера инцидентов и заявок ТОиР"
      icon={<CableIcon />}
      maxWidth="md"
      steps={[
        '1. Провайдер и адрес',
        '2. Авторизация и проект',
        '3. Тест связи и синхронизация',
      ]}
      activeStep={activeStep}
      onStepChange={(step) => setActiveStep(step)}
      hideActions
    >
      <Box sx={{ mt: 1.5 }}>
        {/* STEP 0: Выбор провайдера и базового URL */}
        {activeStep === 0 && (
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={7}>
                <TextField
                  label="Название подключения *"
                  fullWidth
                  size="small"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="например: Корпоративная Jira IT"
                  required
                />
              </Grid>

              <Grid item xs={12} sm={5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Тип провайдера</InputLabel>
                  <Select
                    value={providerType}
                    label="Тип провайдера"
                    onChange={(e) => setProviderType(e.target.value)}
                  >
                    {PROVIDERS.map((p) => (
                      <MenuItem key={p.key} value={p.key}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Базовый URL сервера (Base URL) *"
                  fullWidth
                  size="small"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={selectedProviderMeta.placeholder}
                  required
                  helperText="Корневой адрес сервера без завершающего слеша"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button
                variant="contained"
                onClick={handleNextStep}
                disabled={!name.trim() || !baseUrl.trim()}
                sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}
              >
                Далее: Авторизация и проект →
              </Button>
            </Box>
          </Stack>
        )}

        {/* STEP 1: Аутентификация и параметры проекта */}
        {activeStep === 1 && (
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Тип авторизации</InputLabel>
                  <Select
                    value={authType}
                    label="Тип авторизации"
                    onChange={(e) => setAuthType(e.target.value)}
                  >
                    <MenuItem value="BASIC">Basic Auth (Логин + Пароль / API-токен)</MenuItem>
                    <MenuItem value="BEARER">Bearer Token (Personal Access Token)</MenuItem>
                    <MenuItem value="API_KEY">API Key в заголовке</MenuItem>
                    <MenuItem value="NONE">Без авторизации (Public / Proxy)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Ключ проекта / Project ID"
                  fullWidth
                  size="small"
                  value={projectKeyOrId}
                  onChange={(e) => setProjectKeyOrId(e.target.value)}
                  placeholder="EMS или 42"
                  helperText="Фильтрация заявок по указанному проекту"
                />
              </Grid>

              {authType === 'BASIC' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Имя пользователя / Email"
                    fullWidth
                    size="small"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="service_account@company.ru"
                  />
                </Grid>
              )}

              {authType === 'API_KEY' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Имя заголовка API Key"
                    fullWidth
                    size="small"
                    value={apiKeyHeader}
                    onChange={(e) => setApiKeyHeader(e.target.value)}
                    placeholder="X-Api-Key"
                  />
                </Grid>
              )}

              {authType !== 'NONE' && (
                <Grid item xs={12} sm={authType === 'BASIC' || authType === 'API_KEY' ? 6 : 12}>
                  <TextField
                    label={authType === 'BASIC' ? 'Пароль или API Token' : 'API Token / Bearer Token'}
                    type="password"
                    fullWidth
                    size="small"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="••••••••••••••••"
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  label="ID кастомного поля оборудования"
                  fullWidth
                  size="small"
                  value={equipmentCustomField}
                  onChange={(e) => setEquipmentCustomField(e.target.value)}
                  placeholder="customfield_10100"
                  helperText="Код поля в Jira для привязки инвентарного номера"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Интервал автосинхронизации (мин)"
                  type="number"
                  fullWidth
                  size="small"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  inputProps={{ min: 5, step: 5 }}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setActiveStep(0)} sx={{ fontWeight: 600 }}>
                ← Назад
              </Button>
              <Button
                variant="contained"
                onClick={handleNextStep}
                sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}
              >
                Далее: Проверка и сохранение →
              </Button>
            </Box>
          </Stack>
        )}

        {/* STEP 2: Проверка связи и сохранение */}
        {activeStep === 2 && (
          <Stack spacing={2.5}>
            {/* Test Connection Card */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                  Верификация соединения с API
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={testingConnection ? <CircularProgress size={16} /> : <SyncAltIcon />}
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  sx={{ borderRadius: '8px', fontWeight: 600 }}
                >
                  {testingConnection ? 'Проверка...' : 'Проверить соединение'}
                </Button>
              </Box>

              {testResult && (
                <Alert severity={testResult.success ? 'success' : 'warning'} sx={{ borderRadius: '8px' }}>
                  {testResult.message}
                </Alert>
              )}
            </Paper>

            {/* Summary */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Название интеграции:
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                    {name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Провайдер:
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                    {selectedProviderMeta.name}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    URL сервера:
                  </Typography>
                  <Typography variant="body2" color="#0f172a" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {baseUrl}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Авторизация:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a">
                    {authType}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Ключ проекта:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a">
                    {projectKeyOrId || 'Все'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Интервал синхронизации:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a">
                    {syncInterval} мин
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setActiveStep(1)} sx={{ fontWeight: 600 }}>
                ← Назад
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleSubmit}
                disabled={isSubmitting || !name.trim() || !baseUrl.trim()}
                sx={{ borderRadius: '8px', px: 4, fontWeight: 700 }}
              >
                {isSubmitting ? 'Сохранение...' : 'Сохранить и активировать'}
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </FormDialog>
  );
}
