'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  TextField,
  MenuItem,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Chip,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SyncIcon from '@mui/icons-material/Sync';
import BugReportIcon from '@mui/icons-material/BugReport';
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
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  StatCard,
  EmptyState,
  DataTableWrapper,
  CriticalAlertBanner,
  TrendSparkline,
  HealthScoreGauge,
  StatusBadge,
  SearchInput,
  FilterToolbar,
  PageLoading,
  ConfirmDialog,
  NavTabsContainer,
  type TableDensity,
} from '@/components/ui';
import {
  SrmIntegrationWizardDialog,
  CreateServiceRequestDialog,
  SrmIssueDetailsDrawer,
  SrmReliabilityAnalytics,
  SrmWarrantyTab,
} from '@/components/srm';
import { useAuth } from '@/lib/auth-client';
import {
  PERMISSIONS,
  SRM_FAILURE_CATEGORY_MAP,
  SRM_SOURCE_MAP,
  SRM_STATUS_MAP,
  SRM_PRIORITY_MAP,
} from '@ems/shared';

const CHART_PALETTE = ['#0284c7', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];

const TAB_INDEX_TO_SLUG: Record<number, string> = {
  0: 'metrics',
  1: 'issues',
  2: 'reliability',
  3: 'warranty',
  4: 'mapping',
  5: 'integrations',
};

const TAB_SLUG_TO_INDEX: Record<string, number> = {
  metrics: 0,
  issues: 1,
  reliability: 2,
  warranty: 3,
  mapping: 4,
  integrations: 5,
};

function SrmOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();

  // Tab State with URL query sync
  const initialTabSlug = searchParams.get('tab');
  const initialTabIndex = initialTabSlug && TAB_SLUG_TO_INDEX[initialTabSlug] !== undefined
    ? TAB_SLUG_TO_INDEX[initialTabSlug]
    : 0;

  const [currentTab, setCurrentTab] = useState<number>(initialTabIndex);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);

  // Modals and Drawers
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [selectedIssueForDrawer, setSelectedIssueForDrawer] = useState<any | null>(null);

  // Search, Filters and Pagination State for Registry
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [failureCategoryFilter, setFailureCategoryFilter] = useState('ALL');
  const [integrationFilter, setIntegrationFilter] = useState('ALL');
  const [equipmentFilter, setEquipmentFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [density, setDensity] = useState<TableDensity>('standard');

  // Integrations State
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [providerTemplates, setProviderTemplates] = useState<any[]>([]);
  const [openIntegrationDialog, setOpenIntegrationDialog] = useState(false);
  const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null);
  const [integrationPingResult, setIntegrationPingResult] = useState<any>(null);

  // Field Mapping Builder State
  const [mappingConfig, setMappingConfig] = useState<any>(null);
  const [mappingDefaults, setMappingDefaults] = useState<any>(null);
  const [sampleJsonText, setSampleJsonText] = useState<string>('');
  const [testingMapping, setTestingMapping] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [savingMapping, setSavingMapping] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resStats, resAnalytics, resIssues, resMapping, resIntegrations] = await Promise.all([
        fetch('/api/srm/stats').then((r) => r.json()),
        fetch('/api/srm/analytics/reliability').then((r) => r.json()),
        fetch('/api/srm/issues').then((r) => r.json()),
        fetch('/api/srm/mapping').then((r) => r.json()),
        fetch('/api/srm/integrations').then((r) => r.json()),
      ]);

      if (resStats.success) setStats(resStats.data);
      if (resAnalytics.success) setAnalytics(resAnalytics.data);
      if (resIssues.success) setIssues(resIssues.data || []);
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

  // Sync tab change with URL query parameter
  const handleTabChange = (newTab: number) => {
    setCurrentTab(newTab);
    const slug = TAB_INDEX_TO_SLUG[newTab] || 'metrics';
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', slug);
    router.replace(`/srm?${params.toString()}`, { scroll: false });
  };

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

  // Filtered and Searched Issues List
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // 1. Полнотекстовый поиск
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const keyMatch = issue.issueKey?.toLowerCase().includes(q);
        const summaryMatch = issue.summary?.toLowerCase().includes(q);
        const assigneeMatch = issue.assignee?.toLowerCase().includes(q);
        const reporterMatch = issue.reporter?.toLowerCase().includes(q);
        const eqNameMatch = issue.equipment?.name?.toLowerCase().includes(q);
        const eqInvMatch = issue.equipment?.inventoryNumber?.toLowerCase().includes(q);
        const contrMatch = issue.contractorName?.toLowerCase().includes(q);
        if (!keyMatch && !summaryMatch && !assigneeMatch && !reporterMatch && !eqNameMatch && !eqInvMatch && !contrMatch) {
          return false;
        }
      }

      // 2. Фильтр по статусу
      if (statusFilter !== 'ALL' && issue.status !== statusFilter) {
        return false;
      }

      // 3. Фильтр по приоритету
      if (priorityFilter !== 'ALL' && issue.priority !== priorityFilter) {
        return false;
      }

      // 4. Фильтр по источнику (INTERNAL, JIRA, REDMINE, 1C)
      if (sourceFilter !== 'ALL' && (issue.source || 'JIRA') !== sourceFilter) {
        return false;
      }

      // 5. Фильтр по категории отказа
      if (failureCategoryFilter !== 'ALL' && issue.failureCategory !== failureCategoryFilter) {
        return false;
      }

      // 6. Фильтр по интеграции
      if (integrationFilter !== 'ALL' && issue.integrationId !== integrationFilter) {
        return false;
      }

      // 7. Фильтр по оборудованию
      if (equipmentFilter === 'linked' && !issue.equipmentId) {
        return false;
      }
      if (equipmentFilter === 'unlinked' && issue.equipmentId) {
        return false;
      }

      return true;
    });
  }, [issues, searchQuery, statusFilter, priorityFilter, sourceFilter, failureCategoryFilter, integrationFilter, equipmentFilter]);

  // Paginated Issues
  const paginatedIssues = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredIssues.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredIssues, page, rowsPerPage]);

  // Active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (statusFilter !== 'ALL') count++;
    if (priorityFilter !== 'ALL') count++;
    if (sourceFilter !== 'ALL') count++;
    if (failureCategoryFilter !== 'ALL') count++;
    if (integrationFilter !== 'ALL') count++;
    if (equipmentFilter !== 'ALL') count++;
    return count;
  }, [searchQuery, statusFilter, priorityFilter, sourceFilter, failureCategoryFilter, integrationFilter, equipmentFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setSourceFilter('ALL');
    setFailureCategoryFilter('ALL');
    setIntegrationFilter('ALL');
    setEquipmentFilter('ALL');
    setPage(0);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (!filteredIssues || filteredIssues.length === 0) {
      enqueueSnackbar('Нет данных для экспорта', { variant: 'warning' });
      return;
    }

    try {
      const exportRows = filteredIssues.map((issue) => ({
        'Ключ заявки': issue.issueKey,
        'Тема инцидента': issue.summary,
        'Источник': SRM_SOURCE_MAP[issue.source]?.label || issue.integration?.name || issue.source || 'Внешняя система',
        'Статус': issue.status,
        'Приоритет': issue.priority,
        'Категория отказа': SRM_FAILURE_CATEGORY_MAP[issue.failureCategory]?.label || issue.failureCategory || '—',
        'Инвентарный №': issue.equipment?.inventoryNumber || '—',
        'Оборудование': issue.equipment?.name || '—',
        'Простой (мин)': issue.downtimeMinutes || 0,
        'Гарантия': issue.warrantyClaim ? 'Да' : 'Нет',
        'Подрядчик': issue.contractorName || '—',
        'Исполнитель': issue.assignee || '—',
        'Автор заявки': issue.reporter || '—',
        'Дата создания': issue.createdDate ? new Date(issue.createdDate).toLocaleString('ru-RU') : '—',
        'Дата закрытия': issue.resolvedDate ? new Date(issue.resolvedDate).toLocaleString('ru-RU') : '—',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Реестр SRM');
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `srm_incidents_${dateStr}.xlsx`);
      enqueueSnackbar(`Экспортировано ${exportRows.length} записей в Excel`, { variant: 'success' });
    } catch (err) {
      console.error('Ошибка экспорта в Excel:', err);
      enqueueSnackbar('Ошибка при формировании Excel-файла', { variant: 'error' });
    }
  };

  const handleCopyWebhookUrl = (id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const webhookUrl = `${origin}/api/srm/webhooks/${id}`;
    navigator.clipboard.writeText(webhookUrl);
    enqueueSnackbar('Webhook URL скопирован в буфер обмена', { variant: 'success' });
  };

  const [deleteIntegrationId, setDeleteIntegrationId] = useState<string | null>(null);

  const confirmDeleteIntegration = async () => {
    if (!deleteIntegrationId) return;
    try {
      const res = await fetch(`/api/srm/integrations/${deleteIntegrationId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Подключение удалено', { variant: 'success' });
        setDeleteIntegrationId(null);
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

  // Mapping Handlers
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
        title="SRM 2.0 — Управление заявками, инцидентами и надежностью оборудования"
        subtitle="Единый ServiceDesk: регистрация отказов, контроль SLA, RAMS-аналитика (MTTR/MTBF/КТГ) и интеграция с Jira, Redmine, 1C"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Система подачи заявок (SRM)' }]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{ fontWeight: 700, borderRadius: '8px' }}
            >
              Подать сервисную заявку
            </Button>

            {(hasPermission(PERMISSIONS.SRM_REPORTS_EXPORT) || hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) || user?.roles.includes('admin')) && (
              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportExcel}
                disabled={issues.length === 0}
              >
                Экспорт в Excel
              </Button>
            )}

            {(hasPermission(PERMISSIONS.SRM_SYNC_TRIGGER) || hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) || user?.roles.includes('admin')) && (
              <Button
                variant="outlined"
                startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
                onClick={handleSync}
                disabled={syncing}
              >
                Синхронизировать
              </Button>
            )}
          </Box>
        }
        tabs={
          <NavTabsContainer
            value={currentTab}
            onChange={handleTabChange}
            tabs={[
              { label: 'Обзор и дашборд', value: 0, icon: <DashboardIcon /> },
              { label: 'Реестр инцидентов', value: 1, icon: <ListAltIcon />, badge: issues.length },
              { label: 'RAMS & Анализ отказов', value: 2, icon: <SpeedIcon /> },
              { label: 'Гарантии и подрядчики', value: 3, icon: <ShieldOutlinedIcon />, badge: analytics?.warrantyIncidentsCount || 0 },
              ...(hasPermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE) || user?.roles.includes('admin')
                ? [
                    { label: 'Конструктор сопоставления', value: 4, icon: <SettingsSuggestIcon /> },
                    { label: 'Внешние API и Интеграции', value: 5, icon: <CableIcon />, badge: integrations.length },
                  ]
                : []),
            ]}
          />
        }
      />

      {loading ? (
        <PageLoading text="Загрузка данных SRM 2.0 и расчет метрик надежности..." />
      ) : (
        <>
          {/* ВКЛАДКА 0: ДАШБОРД И МЕТРИКИ */}
          {currentTab === 0 && (
            <>
              {/* Critical Incidents Alerts Banner */}
              {stats?.openIssues > 0 && (
                <CriticalAlertBanner
                  alerts={[
                    {
                      id: 'srm-open-issues',
                      severity: stats.openIssues > 5 ? 'CRITICAL' : 'WARNING',
                      title: 'Требуется обработка открытых инцидентов ServiceDesk',
                      description: `В очереди находится ${stats.openIssues} открытых и ${stats.inProgressIssues || 0} выполняемых заявок. Проверьте приоритеты и регламенты SLA.`,
                      count: stats.openIssues,
                      actionLabel: 'Открыть реестр инцидентов',
                      onAction: () => handleTabChange(1),
                    },
                  ]}
                />
              )}

              {/* KPI И ТРЕНДЫ */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <TrendSparkline
                    title="Динамика MTTR (время ремонта)"
                    currentValue={`${analytics?.mttrHours || stats?.mttrHours || '4.2'} ч`}
                    unit="ч"
                    changePercent={-8.5}
                    periodLabel="vs пред. период"
                    data={[6.2, 5.8, 5.1, 4.9, 4.5, analytics?.mttrHours || 4.2]}
                    color="#0284c7"
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TrendSparkline
                    title="Динамика MTBF (наработка)"
                    currentValue={`${analytics?.mtbfDays || stats?.mtbfDays || '48'} дн`}
                    unit="дн"
                    changePercent={12.4}
                    periodLabel="vs пред. период"
                    data={[32, 36, 40, 42, 45, analytics?.mtbfDays || 48]}
                    color="#16a34a"
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <HealthScoreGauge
                    score={analytics?.availabilityPercent || parseFloat(stats?.slaComplianceRate) || 96}
                    size="sm"
                    title="КТГ (Техническая готовность)"
                    subtitle="Availability Rate оборудования"
                    metrics={[
                      { label: 'КТГ', value: `${analytics?.availabilityPercent || 94.5}%`, status: 'good' },
                      { label: 'SLA', value: `${analytics?.slaComplianceRate || stats?.slaComplianceRate || 96}%`, status: 'good' },
                    ]}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="Всего заявок в SRM"
                    value={stats?.totalIssues || issues.length}
                    subtitle={`В работе: ${stats?.inProgressIssues || 0} | Открыто: ${stats?.openIssues || 0}`}
                    icon={<BugReportIcon sx={{ fontSize: 20 }} />}
                    iconBgColor="rgba(217, 119, 6, 0.08)"
                    iconColor="#d97706"
                    accentColor="#d97706"
                    active={true}
                    onClick={() => handleTabChange(1)}
                  />
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
                          <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]}>
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
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
                              <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
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

          {/* ВКЛАДКА 1: РЕЕСТР ИНЦИДЕНТОВ С ФИЛЬТРАМИ И ПОИСКОМ */}
          {currentTab === 1 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={700}>
                  Полный реестр инцидентов и сервисных заявок
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Всего: <b>{issues.length}</b> | Отфильтровано: <b>{filteredIssues.length}</b>
                </Typography>
              </Box>

              {/* ПАНЕЛЬ ФИЛЬТРОВ И ЖИВОГО ПОИСКА */}
              <FilterToolbar
                activeFilterCount={activeFilterCount}
                onResetFilters={handleResetFilters}
                variant="standalone"
              >
                <Box sx={{ width: { xs: '100%', sm: 260 } }}>
                  <SearchInput
                    placeholder="Поиск по ключу, теме, исполнителю..."
                    value={searchQuery}
                    onSearch={(val) => {
                      setSearchQuery(val);
                      setPage(0);
                    }}
                  />
                </Box>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Статус</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Статус"
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <MenuItem value="ALL">Все статусы</MenuItem>
                    <MenuItem value="OPEN">Новая / Открыта</MenuItem>
                    <MenuItem value="IN_PROGRESS">В работе</MenuItem>
                    <MenuItem value="WAITING">Ожидание</MenuItem>
                    <MenuItem value="RESOLVED">Решена</MenuItem>
                    <MenuItem value="CLOSED">Закрыта</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Приоритет</InputLabel>
                  <Select
                    value={priorityFilter}
                    label="Приоритет"
                    onChange={(e) => {
                      setPriorityFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <MenuItem value="ALL">Все приоритеты</MenuItem>
                    <MenuItem value="CRITICAL">Аварийный</MenuItem>
                    <MenuItem value="HIGH">Высокий</MenuItem>
                    <MenuItem value="MEDIUM">Средний</MenuItem>
                    <MenuItem value="LOW">Низкий</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Категория дефекта</InputLabel>
                  <Select
                    value={failureCategoryFilter}
                    label="Категория дефекта"
                    onChange={(e) => {
                      setFailureCategoryFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <MenuItem value="ALL">Все категории</MenuItem>
                    {Object.entries(SRM_FAILURE_CATEGORY_MAP).map(([key, meta]) => (
                      <MenuItem key={key} value={key}>
                        {meta.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Источник</InputLabel>
                  <Select
                    value={sourceFilter}
                    label="Источник"
                    onChange={(e) => {
                      setSourceFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <MenuItem value="ALL">Все источники</MenuItem>
                    <MenuItem value="INTERNAL">Внутренний ServiceDesk</MenuItem>
                    <MenuItem value="JIRA">Jira</MenuItem>
                    <MenuItem value="REDMINE">Redmine</MenuItem>
                    <MenuItem value="1C">1C</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Оборудование</InputLabel>
                  <Select
                    value={equipmentFilter}
                    label="Оборудование"
                    onChange={(e) => {
                      setEquipmentFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <MenuItem value="ALL">Любое</MenuItem>
                    <MenuItem value="linked">Только с оборудованием</MenuItem>
                    <MenuItem value="unlinked">Без привязки</MenuItem>
                  </Select>
                </FormControl>
              </FilterToolbar>

              {filteredIssues.length === 0 ? (
                <EmptyState
                  paper
                  icon={<ListAltIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
                  title={issues.length === 0 ? 'Заявки не найдены' : 'Нет заявок по заданным фильтрам'}
                  description={
                    issues.length === 0
                      ? 'В системе еще нет зарегистрированных заявок. Нажмите «Подать сервисную заявку» или синхронизируйте внешние системы.'
                      : 'Попробуйте изменить параметры поиска или сбросить активные фильтры.'
                  }
                  actionText={issues.length === 0 ? 'Подать заявку' : 'Сбросить фильтры'}
                  onAction={issues.length === 0 ? () => setOpenCreateDialog(true) : handleResetFilters}
                />
              ) : (
                <DataTableWrapper
                  total={filteredIssues.length}
                  page={page}
                  pageSize={rowsPerPage}
                  onPageChange={(_event: unknown, newPage: number) => setPage(newPage)}
                  onPageSizeChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  density={density}
                  onDensityChange={(d) => setDensity(d)}
                  showDensityToggle
                  stickyHeader
                >
                  <Table size={density === 'compact' ? 'small' : 'medium'} aria-label="Реестр инцидентов SRM">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 130 }}>Ключ задачи</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Тема инцидента</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 130 }}>Источник</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 120 }}>Статус</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 110 }}>Приоритет</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Связанное оборудование</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 130 }}>Исполнитель</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 120 }}>Дата создания</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 100 }} align="right">
                          Действия
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedIssues.map((issue) => (
                        <TableRow
                          key={issue.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedIssueForDrawer(issue)}
                        >
                          <TableCell sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}>
                            {issue.issueKey}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" noWrap title={issue.summary} fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                              {issue.summary}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
                              {issue.failureCategory && (
                                <Typography variant="caption" color="text.secondary">
                                  {SRM_FAILURE_CATEGORY_MAP[issue.failureCategory]?.label || issue.failureCategory}
                                </Typography>
                              )}
                              {issue.warrantyClaim && (
                                <Chip label="Гарантия" size="small" color="warning" sx={{ height: 16, fontSize: '0.65rem' }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={issue.source || 'INTERNAL'}
                              label={SRM_SOURCE_MAP[issue.source]?.label || issue.integration?.name || 'Внутренний'}
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={issue.status} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={issue.priority} variant="outlined" />
                          </TableCell>
                          <TableCell>
                            {issue.equipment ? (
                              <Box>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
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
                          <TableCell sx={{ fontSize: '0.8125rem' }}>{issue.assignee || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                            {new Date(issue.createdDate).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Box sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setSelectedIssueForDrawer(issue)}
                              >
                                Карточка
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DataTableWrapper>
              )}
            </Box>
          )}

          {/* ВКЛАДКА 2: RAMS & АНАЛИЗ НАДЕЖНОСТИ */}
          {currentTab === 2 && (
            <SrmReliabilityAnalytics analytics={analytics} loading={loading} />
          )}

          {/* ВКЛАДКА 3: ГАРАНТИИ И ПОДРЯДЧИКИ */}
          {currentTab === 3 && (
            <SrmWarrantyTab issues={issues} onSelectIssue={(iss) => setSelectedIssueForDrawer(iss)} />
          )}

          {/* ВКЛАДКА 4: КОНСТРУКТОР СОПОСТАВЛЕНИЯ ПОЛЕЙ */}
          {currentTab === 4 && mappingConfig && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <CriticalAlertBanner
                  alerts={[
                    {
                      id: 'srm-mapping-info',
                      severity: 'INFO',
                      title: 'Конструктор маппинга полей внешних SRM/ServiceDesk систем',
                      description:
                        'Здесь вы можете настраивать сопоставление (mapping) атрибутов, извлекаемых из внешней системы (Jira, Redmine, 1С, REST), со структурой сущностей и аналитики SRM. Изменения применяются автоматически при каждой синхронизации.',
                    },
                  ]}
                />
              </Box>

              {/* СЕКЦИЯ 1: СТАНДАРТНЫЕ ПОЛЯ SRM */}
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    1. Сопоставление базовых полей SRM
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Укажите dot-нотацию пути к соответствующему свойству в структуре задачи (например: <code>fields.summary</code>, <code>fields.status.name</code>, <code>subject</code>, <code>title</code>).
                  </Typography>

                  <DataTableWrapper total={mappingConfig.standardMappings.length} stickyHeader>
                    <Table size="small" aria-label="Сопоставление базовых полей SRM">
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
                                <code>{item.srmField}</code> {item.isRequired && <Box component="span" sx={{ color: 'error.main' }}>*</Box>}
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
                  </DataTableWrapper>
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
                    <EmptyState
                      title="Кастомные поля не настроены"
                      description="Дополнительные правила извлечения полей из JSON ServiceDesk не настроены. Нажмите «Добавить кастомное поле»."
                      minHeight={140}
                    />
                  ) : (
                    <DataTableWrapper>
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
                    </DataTableWrapper>
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
                                    <Box sx={{ display: 'inline-flex', gap: 1 }}>
                                      <StatusBadge status={testResult.mapped?.status || 'OPEN'} size="small" />
                                      <StatusBadge status={testResult.mapped?.priority || 'MEDIUM'} size="small" variant="outlined" />
                                    </Box>
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
                                      <StatusBadge status="ACTIVE" label="Оборудование привязано" size="small" />
                                    ) : (
                                      <Typography variant="caption" color="error">Не привязано</Typography>
                                    )}
                                  </TableCell>
                                </TableRow>
                                {testResult.customFields && Object.keys(testResult.customFields).length > 0 && (
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Кастомные поля:</TableCell>
                                    <TableCell>
                                      <Box component="pre" sx={{ m: 0, fontSize: '0.75rem' }}>
                                        {JSON.stringify(testResult.customFields, null, 2)}
                                      </Box>
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

          {/* ВКЛАДКА 5: ВНЕШНИЕ API И ИНТЕГРАЦИИ (CONNECTORS) */}
          {currentTab === 5 && (
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
                      onClick={() => setOpenIntegrationDialog(true)}
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
                      <StatusBadge status={template.type} label={`Тип: ${template.type}`} size="small" variant="outlined" />
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* СПИСОК АКТИВНЫХ ПОДКЛЮЧЕНИЙ */}
              <Card>
                <CardContent sx={{ p: integrations.length === 0 ? 3 : 0 }}>
                  {integrations.length === 0 ? (
                    <EmptyState
                      title="Подключения не настроены"
                      description="Подключения к внешним ServiceDesk не настроены. Добавьте подключение через шаблон выше или нажмите «Добавить подключение API»."
                      minHeight={180}
                    />
                  ) : (
                    <DataTableWrapper>
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
                          {integrations.map((item) => (
                            <TableRow key={item.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700}>
                                  {item.name}
                                </Typography>
                                {item.isDefault && <StatusBadge status="ACTIVE" label="По умолчанию" size="small" />}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={item.providerType} size="small" variant="outlined" />
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
                                <StatusBadge
                                  status={item.lastSyncStatus || 'WAITING'}
                                  tooltip={item.lastSyncError || undefined}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                  <Tooltip title="Скопировать Webhook URL для настройки Push в Jira/Redmine">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                                      onClick={() => handleCopyWebhookUrl(item.id)}
                                    >
                                      Webhook
                                    </Button>
                                  </Tooltip>
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
                                    onClick={() => setDeleteIntegrationId(item.id)}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DataTableWrapper>
                  )}
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
                </Alert>
              )}
            </Box>
          )}
        </>
      )}

      {/* Диалог создания сервисной заявки */}
      <CreateServiceRequestDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onSuccess={() => {
          loadData();
          handleTabChange(1);
        }}
      />

      {/* Drawer детального просмотра инцидента */}
      <SrmIssueDetailsDrawer
        open={Boolean(selectedIssueForDrawer)}
        onClose={() => setSelectedIssueForDrawer(null)}
        issue={selectedIssueForDrawer}
        onIssueUpdated={() => {
          loadData();
          setSelectedIssueForDrawer(null);
        }}
      />

      {/* Диалог мастера интеграций */}
      <SrmIntegrationWizardDialog
        open={openIntegrationDialog}
        onClose={() => setOpenIntegrationDialog(false)}
        onSuccess={() => loadData()}
      />

      {/* Диалог подтверждения удаления интеграции */}
      <ConfirmDialog
        open={Boolean(deleteIntegrationId)}
        onClose={() => setDeleteIntegrationId(null)}
        onConfirm={confirmDeleteIntegration}
        title="Удаление подключения к внешнему ServiceDesk"
        message="Вы действительно хотите удалить данное подключение API? Ранее синхронизированные заявки сохранятся в базе данных."
        confirmText="Удалить подключение"
        cancelText="Отмена"
        variant="danger"
      />
    </Box>
  );
}

export default function SrmPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка модуля SRM..." />}>
      <SrmOverviewContent />
    </Suspense>
  );
}
