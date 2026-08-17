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
      const [resStats, resIssues, resMapping] = await Promise.all([
        fetch('/api/srm/stats').then((r) => r.json()),
        fetch('/api/srm/issues').then((r) => r.json()),
        fetch('/api/srm/mapping').then((r) => r.json()),
      ]);

      if (resStats.success) setStats(resStats.data);
      if (resIssues.success) setIssues(resIssues.data);
      if (resMapping.success) {
        setMappingConfig(resMapping.data.config);
        setMappingDefaults(resMapping.data.defaults);
        setSampleJsonText(JSON.stringify(resMapping.data.sampleIssue, null, 2));
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
        title="SRM — Дашборд заявок и интеграция Jira"
        subtitle="Мониторинг заявок на ремонт оборудования, контроль SLA, аналитика надежности и конструктор сопоставления полей"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Управление заявками SRM' }]}
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            Синхронизировать с Jira
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
          <Tab icon={<ListAltIcon />} iconPosition="start" label={`Реестр заявок Jira (${issues.length})`} />
          <Tab icon={<SettingsSuggestIcon />} iconPosition="start" label="Конструктор сопоставления полей" />
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

          {/* ВКЛАДКА 1: РЕЕСТР ЗАЯВОК JIRA */}
          {(currentTab === 0 || currentTab === 1) && (
            <Card sx={{ mb: 4 }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight={700}>
                    {currentTab === 0 ? 'Последние заявки из Jira' : 'Полный реестр инцидентов и заявок'}
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
                        <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          Заявки не найдены. Нажмите «Синхронизировать с Jira» для загрузки данных.
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

          {/* ВКЛАДКА 2: КОНСТРУКТОР СОПОСТАВЛЕНИЯ ПОЛЕЙ JIRA */}
          {currentTab === 2 && mappingConfig && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Здесь вы можете настраивать сопоставление (mapping) атрибутов, извлекаемых из Jira JSON, со структурой сущностей и аналитики SRM. Изменения применяются автоматически при каждой синхронизации.
              </Alert>

              {/* СЕКЦИЯ 1: СТАНДАРТНЫЕ ПОЛЯ SRM */}
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    1. Сопоставление базовых полей SRM
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Укажите dot-нотацию пути к соответствующему свойству в структуре задачи Jira (например: <code>fields.summary</code>, <code>fields.status.name</code>).
                  </Typography>

                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: '25%' }}>Поле в SRM</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: '35%' }}>Путь в JSON Jira</TableCell>
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
                              placeholder="fields.xxx"
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
                    Правило для поиска единицы оборудования в каталоге EMS на основе данных задачи Jira.
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Поле-источник идентификатора в Jira"
                        value={mappingConfig.equipmentMatching?.sourcePath || ''}
                        onChange={(e) => handleEquipmentMatchingChange('sourcePath', e.target.value)}
                        helperText="Например: fields.customfield_10100 или fields.summary"
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
                        Добавление произвольных атрибутов (время простоя, поставщик, код отказа и др.), извлекаемых из Jira.
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
                          <TableCell sx={{ fontWeight: 700 }}>Путь в Jira JSON</TableCell>
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
                    Вставьте образец задачи из Jira в формате JSON и проверьте, как сформируются поля и привязка к оборудованию до сохранения настроек.
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
                        placeholder="Вставьте JSON задачи Jira..."
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
        </>
      )}

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
