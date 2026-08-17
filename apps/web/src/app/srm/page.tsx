'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SyncIcon from '@mui/icons-material/Sync';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HubIcon from '@mui/icons-material/Hub';
import CableIcon from '@mui/icons-material/Cable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, PieChart, Pie, Legend } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  Open: '#f44336',
  'In Progress': '#ff9800',
  Closed: '#4caf50',
  Resolved: '#2196f3',
};

const PIE_COLORS = ['#3f51b5', '#00bcd4', '#4caf50', '#ff9800', '#f44336'];

export default function SrmOverviewPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);

  // Интеграции с внешними системами
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [providerTemplates, setProviderTemplates] = useState<any[]>([]);
  const [openIntegrationDialog, setOpenIntegrationDialog] = useState(false);
  const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null);
  const [integrationPingResult, setIntegrationPingResult] = useState<any>(null);

  // Форма новой интеграции
  const [integrationForm, setIntegrationForm] = useState({
    name: '',
    providerType: 'JIRA',
    baseUrl: '',
    authType: 'BASIC',
    username: '',
    apiToken: '',
    apiKey: '',
    headerName: '',
    endpoint: '',
    projectKeyOrId: '',
    syncInterval: 60,
    isActive: true,
    isDefault: false,
  });

  // Состояние конструктора сопоставления полей
  const [mappingConfig, setMappingConfig] = useState<any>(null);
  const [mappingDefaults, setMappingDefaults] = useState<any>(null);
  const [sampleJsonText, setSampleJsonText] = useState<string>('');
  const [testingMapping, setTestingMapping] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [savingMapping, setSavingMapping] = useState(false);

  // Выбранная задача для просмотра сырых данных JSON
  const [selectedRawIssue, setSelectedRawIssue] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resStats, resIssues, resMapping, resIntegrations] = await Promise.all([
        fetch('/api/srm/stats').then((r) => r.json()),
        fetch('/api/srm/issues').then((r) => r.json()),
        fetch('/api/srm/mapping').then((r) => r.json()),
        fetch('/api/srm/integrations').then((r) => r.json()),
      ]);

      if (resStats.success) setStats(resStats.data);
      if (resIssues.success) setIssues(resIssues.data);
      if (resMapping.success) {
        setMappingConfig(resMapping.data.config);
        setMappingDefaults(resMapping.data.defaults);
        setSampleJsonText(JSON.stringify(resMapping.data.sampleIssue, null, 2));
      }
      if (resIntegrations.success) {
        setIntegrations(resIntegrations.data.integrations || []);
        setProviderTemplates(resIntegrations.data.providerTemplates || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки данных SRM:', err);
      enqueueSnackbar('Не удалось загрузить данные SRM', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/srm/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar(data.message || 'Синхронизация завершена', { variant: 'success' });
        loadData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка синхронизации', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера при синхронизации', { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // Обработчики интеграций
  const handleSelectTemplate = (template: any) => {
    setIntegrationForm({
      name: template.name,
      providerType: template.type,
      baseUrl: 'https://',
      authType: template.defaultAuthType,
      username: '',
      apiToken: '',
      apiKey: '',
      headerName: '',
      endpoint: template.defaultEndpoint,
      projectKeyOrId: '',
      syncInterval: 60,
      isActive: true,
      isDefault: integrations.length === 0,
    });
    setOpenIntegrationDialog(true);
  };

  const handleCreateIntegration = async () => {
    if (!integrationForm.name || !integrationForm.baseUrl) {
      enqueueSnackbar('Заполните название и URL подключения', { variant: 'error' });
      return;
    }

    try {
      const authConfig: any = {};
      if (integrationForm.authType === 'BASIC') {
        authConfig.username = integrationForm.username;
        authConfig.apiToken = integrationForm.apiToken;
      } else if (integrationForm.authType === 'BEARER') {
        authConfig.token = integrationForm.apiToken;
      } else if (integrationForm.authType === 'API_KEY') {
        authConfig.apiKey = integrationForm.apiKey;
        authConfig.headerName = integrationForm.headerName;
      }

      const queryConfig: any = {
        endpoint: integrationForm.endpoint,
      };
      if (integrationForm.providerType === 'JIRA') {
        queryConfig.projectKey = integrationForm.projectKeyOrId || 'EMS';
      } else if (integrationForm.providerType === 'REDMINE' || integrationForm.providerType === 'GITLAB_ISSUES') {
        queryConfig.projectId = integrationForm.projectKeyOrId;
      }

      const res = await fetch('/api/srm/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: integrationForm.name,
          providerType: integrationForm.providerType,
          baseUrl: integrationForm.baseUrl,
          authType: integrationForm.authType,
          authConfig,
          queryConfig,
          syncInterval: integrationForm.syncInterval,
          isActive: integrationForm.isActive,
          isDefault: integrationForm.isDefault,
        }),
      });

      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Подключение успешно добавлено', { variant: 'success' });
        setOpenIntegrationDialog(false);
        loadData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка добавления подключения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера при создании интеграции', { variant: 'error' });
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить данное подключение?')) return;
    try {
      const res = await fetch(`/api/srm/integrations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Подключение удалено', { variant: 'success' });
        loadData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка удаления', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера при удалении', { variant: 'error' });
    }
  };

  const handleTestIntegrationConnection = async (id: string) => {
    setTestingIntegrationId(id);
    setIntegrationPingResult(null);
    try {
      const res = await fetch(`/api/srm/integrations/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setIntegrationPingResult({ id, ...data });
      if (data.success) {
        enqueueSnackbar(data.data?.message || 'Соединение успешно проверено!', { variant: 'success' });
      } else {
        enqueueSnackbar(data.error || data.data?.message || 'Ошибка соединения с внешним API', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при проверке подключения', { variant: 'error' });
    } finally {
      setTestingIntegrationId(null);
    }
  };

  const handleSyncSingleIntegration = async (id: string) => {
    try {
      const res = await fetch(`/api/srm/integrations/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar(data.message || 'Синхронизация завершена', { variant: 'success' });
        loadData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка синхронизации', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера при синхронизации', { variant: 'error' });
    }
  };

  // Обработчики конструктора маппинга
  const handleStandardFieldChange = (index: number, field: string, value: any) => {
    if (!mappingConfig) return;
    const nextMappings = [...mappingConfig.standardMappings];
    nextMappings[index] = { ...nextMappings[index], [field]: value };
    setMappingConfig({ ...mappingConfig, standardMappings: nextMappings });
  };

  const handleCustomFieldChange = (index: number, field: string, value: any) => {
    if (!mappingConfig) return;
    const nextCustom = [...mappingConfig.customMappings];
    nextCustom[index] = { ...nextCustom[index], [field]: value };
    setMappingConfig({ ...mappingConfig, customMappings: nextCustom });
  };

  const handleAddCustomField = () => {
    if (!mappingConfig) return;
    const newField = {
      key: `custom_${Date.now().toString().slice(-4)}`,
      label: 'Новое поле',
      jiraPath: 'fields.',
      transformType: 'string',
      defaultValue: '',
    };
    setMappingConfig({
      ...mappingConfig,
      customMappings: [...(mappingConfig.customMappings || []), newField],
    });
  };

  const handleDeleteCustomField = (index: number) => {
    if (!mappingConfig) return;
    const nextCustom = mappingConfig.customMappings.filter((_: any, i: number) => i !== index);
    setMappingConfig({ ...mappingConfig, customMappings: nextCustom });
  };

  const handleEquipmentMatchingChange = (field: string, value: any) => {
    if (!mappingConfig) return;
    setMappingConfig({
      ...mappingConfig,
      equipmentMatching: {
        ...mappingConfig.equipmentMatching,
        [field]: value,
      },
    });
  };

  const handleResetToDefaults = () => {
    if (mappingDefaults) {
      setMappingConfig(JSON.parse(JSON.stringify(mappingDefaults)));
      enqueueSnackbar('Конфигурация сброшена к эталонным значениям', { variant: 'info' });
    }
  };

  const handleSaveMapping = async () => {
    if (!mappingConfig) return;
    setSavingMapping(true);
    try {
      const res = await fetch('/api/srm/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingConfig),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Конфигурация сопоставления полей успешно сохранена', { variant: 'success' });
      } else {
        enqueueSnackbar(data.error || 'Ошибка при сохранении конфигурации', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при сохранении настроек', { variant: 'error' });
    } finally {
      setSavingMapping(false);
    }
  };

  const handleTestMapping = async () => {
    if (!sampleJsonText || !mappingConfig) return;
    setTestingMapping(true);
    setTestResult(null);
    try {
      let parsedJson;
      try {
        parsedJson = JSON.parse(sampleJsonText);
      } catch (e: any) {
        enqueueSnackbar('Некорректный синтаксис JSON в поле образца', { variant: 'error' });
        setTestingMapping(false);
        return;
      }

      const res = await fetch('/api/srm/mapping/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleIssue: parsedJson,
          config: mappingConfig,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult(data.data);
        enqueueSnackbar('Тестирование сопоставления успешно завершено', { variant: 'success' });
      } else {
        enqueueSnackbar(data.error || 'Ошибка при выполнении теста', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера при выполнении теста сопоставления', { variant: 'error' });
    } finally {
      setTestingMapping(false);
    }
  };

  const statusChartData = stats?.statusCounts
    ? Object.entries(stats.statusCounts).map(([status, count]) => ({
        status,
        count,
      }))
    : [];

  const priorityChartData = stats?.priorityCounts
    ? Object.entries(stats.priorityCounts).map(([priority, value]) => ({
        name: priority,
        value,
      }))
    : [];

  return (
    <Box>
      <PageHeader
        title="SRM — Сервис-Деск и Управление заявками"
        subtitle="Мониторинг инцидентов, контроль SLA, аналитика надежности оборудования и единый центр интеграций (Jira, Redmine, GitLab, 1C)"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Управление заявками SRM' }]}
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            Синхронизировать все системы
          </Button>
        }
      />

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, val) => setCurrentTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<DashboardIcon />} iconPosition="start" label="Дашборд и Метрики" />
          <Tab icon={<ListAltIcon />} iconPosition="start" label={`Реестр заявок (${issues.length})`} />
          <Tab icon={<SettingsSuggestIcon />} iconPosition="start" label="Конструктор сопоставления полей" />
          <Tab icon={<CableIcon />} iconPosition="start" label={`Внешние API и Интеграции (${integrations.length})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ВКЛАДКА 0: ДАШБОРД И МЕТРИКИ */}
          {currentTab === 0 && (
            <>
              {/* KPI КАРТОЧКИ */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ height: '100%', borderLeft: '4px solid #1976d2' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <SpeedIcon color="primary" sx={{ fontSize: 32 }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                          MTTR (Время восстановления)
                        </Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={800} color="primary.main">
                        {stats?.mttrHours || '0'} ч
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Среднее время устранения неисправностей
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ height: '100%', borderLeft: '4px solid #009688' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <TimerIcon sx={{ color: '#009688', fontSize: 32 }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                          MTBF (Наработка на отказ)
                        </Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={800} sx={{ color: '#009688' }}>
                        {stats?.mtbfDays || '0'} дн
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Средний интервал между отказами
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ height: '100%', borderLeft: '4px solid #4caf50' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <AssessmentIcon color="success" sx={{ fontSize: 32 }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                          Соблюдение SLA
                        </Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={800} color="success.main">
                        {stats?.slaComplianceRate || '100'}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Устранено в регламентный срок (&le; 48ч)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ height: '100%', borderLeft: '4px solid #ff9800' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <BugReportIcon color="warning" sx={{ fontSize: 32 }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                          Всего заявок
                        </Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={800} color="warning.main">
                        {stats?.totalIssues || '0'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        В работе: {stats?.inProgressIssues || 0} | Открыто: {stats?.openIssues || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* ГРАФИКИ */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: 360 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                        Распределение заявок по статусам
                      </Typography>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={statusChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                          <XAxis dataKey="status" />
                          <YAxis allowDecimals={false} />
                          <RechartsTooltip />
                          <Bar dataKey="count" fill="#3f51b5" radius={[6, 6, 0, 0]}>
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#3f51b5'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ height: 360 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                        Приоритетность инцидентов
                      </Typography>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={priorityChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {priorityChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}

          {/* ВКЛАДКА 1: РЕЕСТР ЗАЯВОК */}
          {(currentTab === 0 || currentTab === 1) && (
            <Card sx={{ mb: 4 }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight={700}>
                    {currentTab === 0 ? 'Последние заявки из внешних систем' : 'Полный реестр инцидентов и заявок'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего синхронизировано: {issues.length}
                  </Typography>
                </Box>
                <Table>
                  <TableHead sx={{ backgroundColor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Ключ задачи</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Тема инцидента</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Источник</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Статус</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Приоритет</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Связанное оборудование</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Исполнитель</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Дата создания</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Действия
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {issues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          Заявки не найдены. Нажмите «Синхронизировать все системы» для загрузки данных.
                        </TableCell>
                      </TableRow>
                    ) : (
                      issues.map((issue) => (
                        <TableRow key={issue.id} hover>
                          <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{issue.issueKey}</TableCell>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography variant="body2" noWrap title={issue.summary} fontWeight={500}>
                              {issue.summary}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Тип: {issue.issueType}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={issue.integration?.name || 'Jira Env'}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={issue.status}
                              size="small"
                              sx={{
                                backgroundColor: (STATUS_COLORS[issue.status] || '#757575') + '22',
                                color: STATUS_COLORS[issue.status] || '#757575',
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={issue.priority}
                              size="small"
                              variant="outlined"
                              color={issue.priority === 'High' || issue.priority === 'Highest' ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {issue.equipment ? (
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {issue.equipment.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Инв. №: {issue.equipment.inventoryNumber}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.disabled">
                                Не привязано
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{issue.assignee || '—'}</TableCell>
                          <TableCell>{new Date(issue.createdDate).toLocaleDateString('ru-RU')}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setSelectedRawIssue(issue)}
                            >
                              JSON
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ВКЛАДКА 2: КОНСТРУКТОР СОПОСТАВЛЕНИЯ ПОЛЕЙ */}
          {currentTab === 2 && mappingConfig && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Здесь вы можете настраивать сопоставление (mapping) атрибутов, извлекаемых из внешней системы (Jira, Redmine, 1С, REST), со структурой сущностей и аналитики SRM. Изменения применяются автоматически при каждой синхронизации.
              </Alert>

              {/* СЕКЦИЯ 1: СТАНДАРТНЫЕ ПОЛЯ SRM */}
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    1. Сопоставление базовых полей SRM
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Укажите dot-нотацию пути к соответствующему свойству в структуре задачи (например: <code>fields.summary</code>, <code>fields.status.name</code>, <code>subject</code>, <code>title</code>).
                  </Typography>

                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: '25%' }}>Поле в SRM</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: '35%' }}>Путь в JSON объекта</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: '20%' }}>Тип данных</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: '20%' }}>Значение по умолчанию</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mappingConfig.standardMappings.map((item: any, idx: number) => (
                        <TableRow key={item.srmField} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              <code>{item.srmField}</code> {item.isRequired && <span style={{ color: 'red' }}>*</span>}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              value={item.jiraPath}
                              onChange={(e) => handleStandardFieldChange(idx, 'jiraPath', e.target.value)}
                              placeholder="fields.xxx или xxx"
                            />
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={item.transformType}
                                onChange={(e) => handleStandardFieldChange(idx, 'transformType', e.target.value)}
                              >
                                <MenuItem value="string">Строка (String)</MenuItem>
                                <MenuItem value="date">Дата (DateTime)</MenuItem>
                                <MenuItem value="number">Число (Number)</MenuItem>
                                <MenuItem value="boolean">Логический (Boolean)</MenuItem>
                                <MenuItem value="json">Сырой JSON</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              value={item.defaultValue || ''}
                              onChange={(e) => handleStandardFieldChange(idx, 'defaultValue', e.target.value)}
                              placeholder="Дефолт"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* СЕКЦИЯ 2: ПРАВИЛА СВЯЗЫВАНИЯ С ОБОРУДОВАНИЕМ */}
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    2. Автоматическое связывание оборудования
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Правило для поиска единицы оборудования в каталоге EMS на основе данных задачи из внешней системы.
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Поле-источник идентификатора в задаче"
                        value={mappingConfig.equipmentMatching?.sourcePath || ''}
                        onChange={(e) => handleEquipmentMatchingChange('sourcePath', e.target.value)}
                        helperText="Например: fields.customfield_10100 или description или equipmentId"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Стратегия поиска в EMS</InputLabel>
                        <Select
                          value={mappingConfig.equipmentMatching?.matchBy || 'inventoryNumber'}
                          label="Стратегия поиска в EMS"
                          onChange={(e) => handleEquipmentMatchingChange('matchBy', e.target.value)}
                        >
                          <MenuItem value="inventoryNumber">По инвентарному номеру (Inventory Number)</MenuItem>
                          <MenuItem value="serialNumber">По серийному номеру (Serial Number)</MenuItem>
                          <MenuItem value="name">По совпадению наименования (Name)</MenuItem>
                          <MenuItem value="regex">По регулярному выражению (Regex из текста)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Паттерн Regex (если выбран Regex)"
                        value={mappingConfig.equipmentMatching?.regexPattern || ''}
                        onChange={(e) => handleEquipmentMatchingChange('regexPattern', e.target.value)}
                        helperText="Пример: (?:ИНВ|INV|EQ)[-_#]?([A-Za-z0-9-]+)"
                        disabled={mappingConfig.equipmentMatching?.matchBy !== 'regex'}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* СЕКЦИЯ 3: КОНСТРУКТОР КАСТОМНЫХ ПОЛЕЙ */}
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <div>
                      <Typography variant="h6" fontWeight={700}>
                        3. Конструктор дополнительных кастомных полей
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Добавление произвольных атрибутов (время простоя, поставщик, код отказа и др.), извлекаемых из внешних API.
                      </Typography>
                    </div>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddCircleOutlineIcon />}
                      onClick={handleAddCustomField}
                    >
                      Добавить кастомное поле
                    </Button>
                  </Box>

                  {(!mappingConfig.customMappings || mappingConfig.customMappings.length === 0) ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      Дополнительные кастомные поля не настроены.
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Ключ в SRM</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Отображаемое название</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Путь в JSON</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Тип</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Дефолт</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            Удалить
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {mappingConfig.customMappings.map((custom: any, idx: number) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <TextField
                                size="small"
                                value={custom.key}
                                onChange={(e) => handleCustomFieldChange(idx, 'key', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={custom.label}
                                onChange={(e) => handleCustomFieldChange(idx, 'label', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                fullWidth
                                value={custom.jiraPath}
                                onChange={(e) => handleCustomFieldChange(idx, 'jiraPath', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={custom.transformType}
                                  onChange={(e) => handleCustomFieldChange(idx, 'transformType', e.target.value)}
                                >
                                  <MenuItem value="string">Строка</MenuItem>
                                  <MenuItem value="number">Число</MenuItem>
                                  <MenuItem value="date">Дата</MenuItem>
                                  <MenuItem value="boolean">Boolean</MenuItem>
                                  <MenuItem value="json">JSON</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={custom.defaultValue || ''}
                                onChange={(e) => handleCustomFieldChange(idx, 'defaultValue', e.target.value)}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="error" onClick={() => handleDeleteCustomField(idx)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* СЕКЦИЯ 4: ИНТЕРАКТИВНЫЙ ТЕСТЕР СОПОСТАВЛЕНИЯ (LIVE TESTER) */}
              <Card sx={{ mb: 4, border: '1px solid #90caf9' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'primary.main' }}>
                    🧪 Интерактивный тестер сопоставления (Live Tester)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Вставьте образец задачи в формате JSON и проверьте, как сформируются поля и привязка к оборудованию до сохранения настроек.
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        multiline
                        rows={12}
                        fullWidth
                        variant="outlined"
                        value={sampleJsonText}
                        onChange={(e) => setSampleJsonText(e.target.value)}
                        placeholder="Вставьте JSON задачи..."
                        sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                      />
                      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                        <Button
                          variant="contained"
                          color="secondary"
                          startIcon={testingMapping ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                          onClick={handleTestMapping}
                          disabled={testingMapping}
                        >
                          Запустить тест сопоставления
                        </Button>
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%', minHeight: 300, backgroundColor: '#fcfcfc' }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                          Результат симуляции маппинга:
                        </Typography>
                        {testResult ? (
                          <Box>
                            <Table size="small">
                              <TableBody>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>Ключ заявки:</TableCell>
                                  <TableCell><code>{testResult.mapped?.issueKey}</code></TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>Тема:</TableCell>
                                  <TableCell>{testResult.mapped?.summary}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>Статус / Приоритет:</TableCell>
                                  <TableCell>
                                    <Chip label={testResult.mapped?.status} size="small" color="primary" sx={{ mr: 1 }} />
                                    <Chip label={testResult.mapped?.priority} size="small" variant="outlined" />
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>Исполнитель / Автор:</TableCell>
                                  <TableCell>{testResult.mapped?.assignee || '—'} / {testResult.mapped?.reporter || '—'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>Дата создания:</TableCell>
                                  <TableCell>{testResult.mapped?.createdDate ? new Date(testResult.mapped.createdDate).toLocaleString('ru-RU') : '—'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>Связанное оборудование:</TableCell>
                                  <TableCell>
                                    {testResult.mapped?.equipmentId ? (
                                      <Chip icon={<CheckCircleOutlineIcon />} label="Оборудование привязано" color="success" size="small" />
                                    ) : (
                                      <Typography variant="caption" color="error">Не привязано</Typography>
                                    )}
                                  </TableCell>
                                </TableRow>
                                {testResult.customFields && Object.keys(testResult.customFields).length > 0 && (
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Кастомные поля:</TableCell>
                                    <TableCell>
                                      <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                                        {JSON.stringify(testResult.customFields, null, 2)}
                                      </pre>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>

                            <Divider sx={{ my: 1.5 }} />
                            <Typography variant="caption" fontWeight={700}>Диагностика:</Typography>
                            {testResult.diagnostics?.map((diag: string, i: number) => (
                              <Typography key={i} variant="caption" display="block" color={diag.includes('не найдено') ? 'warning.main' : 'text.secondary'}>
                                • {diag}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                            Нажмите «Запустить тест сопоставления» для проверки текущих настроек маппинга.
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* ПАНЕЛЬ СОХРАНЕНИЯ */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<RestartAltIcon />}
                  onClick={handleResetToDefaults}
                >
                  Сбросить к эталону
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={savingMapping ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveMapping}
                  disabled={savingMapping}
                >
                  Сохранить конфигурацию маппинга
                </Button>
              </Box>
            </Box>
          )}

          {/* ВКЛАДКА 3: ВНЕШНИЕ API И ИНТЕГРАЦИИ (CONNECTORS) */}
          {currentTab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <div>
                  <Typography variant="h6" fontWeight={700}>
                    🔌 Подключенные системы ServiceDesk и внешние API
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Подключайте Jira, Redmine, GitLab, 1С:ТОиР или любые кастомные REST эндпоинты через единую модель SRM.
                  </Typography>
                </div>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => {
                    setIntegrationForm({
                      name: 'Новое подключение API',
                      providerType: 'JIRA',
                      baseUrl: 'https://',
                      authType: 'BASIC',
                      username: '',
                      apiToken: '',
                      apiKey: '',
                      headerName: '',
                      endpoint: '/rest/api/2/search',
                      projectKeyOrId: '',
                      syncInterval: 60,
                      isActive: true,
                      isDefault: integrations.length === 0,
                    });
                    setOpenIntegrationDialog(true);
                  }}
                >
                  Добавить подключение API
                </Button>
              </Box>

              {/* БЫСТРЫЕ ШАБЛОНЫ ПРОВАЙДЕРОВ */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Готовые шаблоны провайдеров:
              </Typography>
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {providerTemplates.map((template) => (
                  <Grid item xs={12} sm={6} md={3} key={template.type}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
                      }}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <HubIcon color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {template.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {template.description}
                      </Typography>
                      <Chip label={`Тип: ${template.type}`} size="small" variant="outlined" />
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* СПИСОК АКТИВНЫХ ПОДКЛЮЧЕНИЙ */}
              <Card>
                <CardContent sx={{ p: 0 }}>
                  <Table>
                    <TableHead sx={{ backgroundColor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Название подключения</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Тип провайдера</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Базовый URL</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Авторизация</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Синхронизировано задач</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Последняя синхронизация</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Статус</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Действия
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {integrations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            Подключения не настроены. Добавьте подключение через шаблон выше или нажмите «Добавить подключение API».
                          </TableCell>
                        </TableRow>
                      ) : (
                        integrations.map((item) => (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>
                                {item.name}
                              </Typography>
                              {item.isDefault && <Chip label="По умолчанию" size="small" color="primary" sx={{ mt: 0.5 }} />}
                            </TableCell>
                            <TableCell>
                              <Chip label={item.providerType} size="small" variant="outlined" color="primary" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {item.baseUrl}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {item.authType}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {item._count?.issues || 0}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString('ru-RU') : 'Никогда'}
                            </TableCell>
                            <TableCell>
                              {item.lastSyncStatus === 'SUCCESS' ? (
                                <Chip icon={<CheckCircleIcon />} label="ОК" color="success" size="small" />
                              ) : item.lastSyncStatus === 'ERROR' ? (
                                <Tooltip title={item.lastSyncError || 'Ошибка'}>
                                  <Chip icon={<ErrorOutlineIcon />} label="Ошибка" color="error" size="small" />
                                </Tooltip>
                              ) : (
                                <Chip label="Ожидание" size="small" />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={testingIntegrationId === item.id ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                                  onClick={() => handleTestIntegrationConnection(item.id)}
                                  disabled={testingIntegrationId === item.id}
                                >
                                  Проверить связь
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<SyncIcon />}
                                  onClick={() => handleSyncSingleIntegration(item.id)}
                                >
                                  Синхронизировать
                                </Button>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteIntegration(item.id)}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* РЕЗУЛЬТАТ ПРОВЕРКИ СВЯЗИ */}
              {integrationPingResult && (
                <Alert
                  severity={integrationPingResult.success ? 'success' : 'error'}
                  sx={{ mt: 3 }}
                  onClose={() => setIntegrationPingResult(null)}
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    {integrationPingResult.data?.message || integrationPingResult.message || 'Результат проверки связи'}
                  </Typography>
                  {integrationPingResult.data?.diagnostics && (
                    <Box sx={{ mt: 1 }}>
                      {integrationPingResult.data.diagnostics.map((d: string, i: number) => (
                        <Typography key={i} variant="caption" display="block">
                          • {d}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Alert>
              )}
            </Box>
          )}
        </>
      )}

      {/* ДИАЛОГ ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ ИНТЕГРАЦИИ */}
      <Dialog
        open={openIntegrationDialog}
        onClose={() => setOpenIntegrationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Настройка подключения к внешней системе ServiceDesk / API</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Название подключения"
                fullWidth
                size="small"
                value={integrationForm.name}
                onChange={(e) => setIntegrationForm({ ...integrationForm, name: e.target.value })}
                placeholder="например: Корпоративная Jira IT"
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Тип провайдера</InputLabel>
                <Select
                  value={integrationForm.providerType}
                  label="Тип провайдера"
                  onChange={(e) => setIntegrationForm({ ...integrationForm, providerType: e.target.value })}
                >
                  <MenuItem value="JIRA">Atlassian Jira REST API</MenuItem>
                  <MenuItem value="REDMINE">Redmine Issue Tracker</MenuItem>
                  <MenuItem value="GITLAB_ISSUES">GitLab Issues API</MenuItem>
                  <MenuItem value="REST_GENERIC">Универсальный REST / 1C ServiceDesk</MenuItem>
                  <MenuItem value="SERVICE_NOW">ServiceNow API</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Базовый URL сервера (Base URL)"
                fullWidth
                size="small"
                value={integrationForm.baseUrl}
                onChange={(e) => setIntegrationForm({ ...integrationForm, baseUrl: e.target.value })}
                placeholder="https://jira.company.ru или https://redmine.corp.local"
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Тип авторизации</InputLabel>
                <Select
                  value={integrationForm.authType}
                  label="Тип авторизации"
                  onChange={(e) => setIntegrationForm({ ...integrationForm, authType: e.target.value })}
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
                value={integrationForm.projectKeyOrId}
                onChange={(e) => setIntegrationForm({ ...integrationForm, projectKeyOrId: e.target.value })}
                placeholder="EMS или 42"
              />
            </Grid>

            {integrationForm.authType === 'BASIC' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Имя пользователя / Email"
                    fullWidth
                    size="small"
                    value={integrationForm.username}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, username: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Пароль / API Токен"
                    fullWidth
                    size="small"
                    type="password"
                    value={integrationForm.apiToken}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, apiToken: e.target.value })}
                  />
                </Grid>
              </>
            )}

            {integrationForm.authType === 'BEARER' && (
              <Grid item xs={12}>
                <TextField
                  label="Bearer / Access Token"
                  fullWidth
                  size="small"
                  type="password"
                  value={integrationForm.apiToken}
                  onChange={(e) => setIntegrationForm({ ...integrationForm, apiToken: e.target.value })}
                />
              </Grid>
            )}

            {integrationForm.authType === 'API_KEY' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Имя заголовка (Header Name)"
                    fullWidth
                    size="small"
                    value={integrationForm.headerName}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, headerName: e.target.value })}
                    placeholder="X-API-Key или X-Redmine-API-Key"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Значение API-ключа"
                    fullWidth
                    size="small"
                    type="password"
                    value={integrationForm.apiKey}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, apiKey: e.target.value })}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                label="Эндпоинт поиска / задач"
                fullWidth
                size="small"
                value={integrationForm.endpoint}
                onChange={(e) => setIntegrationForm({ ...integrationForm, endpoint: e.target.value })}
                placeholder="/rest/api/2/search или /issues.json"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Интервал авто-синхронизации (минуты)"
                fullWidth
                size="small"
                type="number"
                value={integrationForm.syncInterval}
                onChange={(e) => setIntegrationForm({ ...integrationForm, syncInterval: parseInt(e.target.value) || 60 })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={integrationForm.isActive}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, isActive: e.target.checked })}
                  />
                }
                label="Подключение активно"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={integrationForm.isDefault}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, isDefault: e.target.checked })}
                  />
                }
                label="Основной источник SRM"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenIntegrationDialog(false)}>Отмена</Button>
          <Button variant="contained" color="primary" onClick={handleCreateIntegration}>
            Сохранить подключение
          </Button>
        </DialogActions>
      </Dialog>

      {/* ДИАЛОГ ПРОСМОТРА СЫРОГО JSON ЗАДАЧИ */}
      <Dialog
        open={Boolean(selectedRawIssue)}
        onClose={() => setSelectedRawIssue(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Исходный JSON задачи: {selectedRawIssue?.issueKey}
        </DialogTitle>
        <DialogContent dividers>
          <pre style={{ maxHeight: 400, overflow: 'auto', backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: '0.8rem' }}>
            {JSON.stringify(selectedRawIssue?.rawData || selectedRawIssue, null, 2)}
          </pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRawIssue(null)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
