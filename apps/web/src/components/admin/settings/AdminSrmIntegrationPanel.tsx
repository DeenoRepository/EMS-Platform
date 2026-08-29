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
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

export interface SrmTestResult {
  success: boolean;
  latencyMs?: number;
  message?: string;
  error?: string;
  diagnostics?: string[];
  details?: {
    serverInfo?: {
      serverTitle?: string;
    };
  };
}

export interface AdminSrmIntegrationPanelProps {
  providerType: string;
  providerUrl: string;
  projectKey: string;
  apiKey: string;
  customFieldId: string;
  testing: boolean;
  testResult: SrmTestResult | null;
  onProviderTypeChange: (value: string) => void;
  onProviderUrlChange: (value: string) => void;
  onProjectKeyChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onCustomFieldIdChange: (value: string) => void;
  onTestConnection: () => void;
}

export function AdminSrmIntegrationPanel({
  providerType,
  providerUrl,
  projectKey,
  apiKey,
  customFieldId,
  testing,
  testResult,
  onProviderTypeChange,
  onProviderUrlChange,
  onProjectKeyChange,
  onApiKeyChange,
  onCustomFieldIdChange,
  onTestConnection,
}: AdminSrmIntegrationPanelProps) {
  return (
    <Grid item xs={12} md={6}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Внешняя интеграция Service Desk (SRM)
              </Typography>
            </Box>
            {providerType !== 'DISABLED' && (
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
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" paragraph>
            Протокол синхронизации заявок и дефектов с внешней корпоративной системой
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Тип внешней ServiceDesk-системы"
              value={providerType}
              onChange={(event) => onProviderTypeChange(event.target.value)}
              fullWidth
              size="small"
              helperText="Выберите используемый протокол или платформу Service Desk"
            >
              <MenuItem value="JIRA">Jira Service Desk / Jira Data Center</MenuItem>
              <MenuItem value="REDMINE">Redmine Issue Tracker</MenuItem>
              <MenuItem value="GITLAB">GitLab Issues</MenuItem>
              <MenuItem value="GENERIC_REST">Универсальный REST API</MenuItem>
              <MenuItem value="DISABLED">Отключено (Автономный локальный SRM)</MenuItem>
            </TextField>

            {providerType === 'JIRA' && (
              <>
                <TextField
                  label="Jira Base URL"
                  placeholder="https://jira.company.local"
                  fullWidth
                  size="small"
                  value={providerUrl}
                  onChange={(event) => onProviderUrlChange(event.target.value)}
                  helperText="Базовый URL Jira инстанса"
                />
                <TextField
                  label="Ключ проекта Jira"
                  placeholder="SD"
                  fullWidth
                  size="small"
                  value={projectKey}
                  onChange={(event) => onProjectKeyChange(event.target.value)}
                  helperText="Короткий префикс проекта Jira (например: SD, IT, EMS)"
                />
                <TextField
                  label="API-токен / Personal Access Token (PAT)"
                  placeholder="Укажите токен доступа Jira"
                  fullWidth
                  size="small"
                  type="password"
                  value={apiKey}
                  onChange={(event) => onApiKeyChange(event.target.value)}
                  helperText="Персональный токен доступа (PAT) для Jira Data Center или API-токен"
                />
                <TextField
                  label="Custom Field ID оборудования"
                  placeholder="customfield_10100"
                  fullWidth
                  size="small"
                  value={customFieldId}
                  onChange={(event) => onCustomFieldIdChange(event.target.value)}
                  helperText="ID кастомного поля Jira для привязки инвентарного номера"
                />
              </>
            )}

            {providerType === 'REDMINE' && (
              <>
                <TextField
                  label="Redmine Host URL"
                  placeholder="https://redmine.company.local"
                  fullWidth
                  size="small"
                  value={providerUrl}
                  onChange={(event) => onProviderUrlChange(event.target.value)}
                  helperText="Адрес сервера Redmine REST API"
                />
                <TextField
                  label="API-ключ (X-Redmine-API-Key)"
                  placeholder="Укажите API-токен"
                  fullWidth
                  size="small"
                  type="password"
                  value={apiKey}
                  onChange={(event) => onApiKeyChange(event.target.value)}
                  helperText="Ключ доступа из профиля Redmine"
                />
                <TextField
                  label="Идентификатор или ID проекта"
                  placeholder="operations"
                  fullWidth
                  size="small"
                  value={projectKey}
                  onChange={(event) => onProjectKeyChange(event.target.value)}
                  helperText="Символьный или числовой идентификатор проекта"
                />
                <TextField
                  label="ID кастомного поля инвентарного номера"
                  placeholder="customfield_1"
                  fullWidth
                  size="small"
                  value={customFieldId}
                  onChange={(event) => onCustomFieldIdChange(event.target.value)}
                  helperText="Поле задачи Redmine для привязки оборудования"
                />
              </>
            )}

            {providerType === 'GITLAB' && (
              <>
                <TextField
                  label="GitLab Instance URL"
                  placeholder="https://gitlab.company.local"
                  fullWidth
                  size="small"
                  value={providerUrl}
                  onChange={(event) => onProviderUrlChange(event.target.value)}
                  helperText="Адрес инстанса GitLab"
                />
                <TextField
                  label="Private Access Token (Bearer)"
                  placeholder="glpat-xxxxxxxxxxxxxxxx"
                  fullWidth
                  size="small"
                  type="password"
                  value={apiKey}
                  onChange={(event) => onApiKeyChange(event.target.value)}
                  helperText="Токен с правами доступа к API"
                />
                <TextField
                  label="Путь к проекту (Project Path)"
                  placeholder="group/infrastructure-maint"
                  fullWidth
                  size="small"
                  value={projectKey}
                  onChange={(event) => onProjectKeyChange(event.target.value)}
                  helperText="Namespace и название проекта в GitLab"
                />
              </>
            )}

            {providerType === 'GENERIC_REST' && (
              <>
                <TextField
                  label="Базовый Endpoint REST API"
                  placeholder="https://servicedesk.company.local/api/v1"
                  fullWidth
                  size="small"
                  value={providerUrl}
                  onChange={(event) => onProviderUrlChange(event.target.value)}
                  helperText="Базовый URL внешнего сервиса заявок"
                />
                <TextField
                  label="Токен авторизации (Bearer / API Key)"
                  placeholder="Bearer eyJhbGciOi..."
                  fullWidth
                  size="small"
                  type="password"
                  value={apiKey}
                  onChange={(event) => onApiKeyChange(event.target.value)}
                  helperText="Значение заголовка авторизации"
                />
                <TextField
                  label="Ресурс / Путь к списку задач"
                  placeholder="/incidents"
                  fullWidth
                  size="small"
                  value={projectKey}
                  onChange={(event) => onProjectKeyChange(event.target.value)}
                  helperText="Относительный URL для выборки инцидентов"
                />
              </>
            )}

            {providerType === 'DISABLED' && (
              <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.8125rem' }}>
                Внешняя интеграция отключена. Модуль SRM работает в автономном режиме с использованием встроенной базы данных.
              </Alert>
            )}

            {testResult && providerType !== 'DISABLED' && (
              <Alert
                severity={testResult.success ? 'success' : 'error'}
                icon={testResult.success ? <CheckCircleOutlineIcon fontSize="inherit" /> : <ErrorOutlineIcon fontSize="inherit" />}
                sx={{ mt: 1, borderRadius: 2, fontSize: '0.8125rem' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                    {testResult.success
                      ? testResult.message || 'Подключение успешно проверено'
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
                {testResult.details?.serverInfo?.serverTitle && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Инстанс: {testResult.details.serverInfo.serverTitle}
                  </Typography>
                )}
                {testResult.diagnostics && testResult.diagnostics.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    {testResult.diagnostics.map((diagnostic, index) => (
                      <Typography key={index} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        • {diagnostic}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

export default AdminSrmIntegrationPanel;
