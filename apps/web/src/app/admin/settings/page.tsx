'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import LanIcon from '@mui/icons-material/Lan';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import EngineeringIcon from '@mui/icons-material/Engineering';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import StorageIcon from '@mui/icons-material/Storage';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import { StatusBadge, PageLoading, ConfirmDialog } from '@/components/ui';
import { PlatformMaintenanceStatus } from '@ems/shared';

export default function AdminSettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  // Connection Testing States
  const [testingLdap, setTestingLdap] = useState(false);
  const [ldapTestResult, setLdapTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message?: string;
    error?: string;
    details?: any;
  } | null>(null);

  const [testingSrm, setTestingSrm] = useState(false);
  const [srmTestResult, setSrmTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message?: string;
    error?: string;
    diagnostics?: string[];
    details?: any;
  } | null>(null);

  const [settings, setSettings] = useState({
    APP_NAME: '',
    LDAP_URL: '',
    LDAP_SEARCH_BASE: '',
    SRM_PROVIDER_TYPE: 'JIRA',
    SRM_PROVIDER_URL: '',
    SRM_PROJECT_KEY: '',
    SRM_API_KEY: '',
    SRM_CUSTOM_FIELD_ID: '',
    JIRA_BASE_URL: '',
    JIRA_PROJECT_KEY: '',
    JIRA_EQUIPMENT_CUSTOM_FIELD: '',
  });

  // Maintenance Status State
  const [maintStatus, setMaintStatus] = useState<PlatformMaintenanceStatus>({
    system: {
      enabled: false,
      message: 'В настоящее время на платформе проводятся плановые регламентные работы.',
      estimatedUntil: null,
      allowedRoles: ['admin', 'administrator'],
    },
    modules: {
      eps: { enabled: false, message: 'Модуль паспортизации оборудования (EPS) находится на техническом обслуживании.', estimatedUntil: null },
      wms: { enabled: false, message: 'Модуль складского учёта (WMS) находится на техническом обслуживании.', estimatedUntil: null },
      srm: { enabled: false, message: 'Модуль подачи заявок (SRM) находится на техническом обслуживании.', estimatedUntil: null },
      mro: { enabled: false, message: 'Модуль ТО и ремонта (MRO) находится на техническом обслуживании.', estimatedUntil: null },
    },
  });

  const [confirmGlobalDialogOpen, setConfirmGlobalDialogOpen] = useState(false);
  const [pendingGlobalEnabled, setPendingGlobalEnabled] = useState(false);

  // Database Backup States
  const [dumpMode, setDumpMode] = useState<'full' | 'data' | 'schema'>('full');
  const [downloadingDump, setDownloadingDump] = useState(false);
  const [confirmDumpDialogOpen, setConfirmDumpDialogOpen] = useState(false);

  const handleDownloadDump = async () => {
    setConfirmDumpDialogOpen(false);
    setDownloadingDump(true);
    enqueueSnackbar('Формирование дампа базы данных начато. Пожалуйста, подождите...', { variant: 'info' });

    try {
      const res = await fetch(`/api/admin/database/dump?mode=${dumpMode}`);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP error ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition');
      let filename = `ems_database_${dumpMode}_${new Date().toISOString().slice(0, 10)}.sql.gz`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      enqueueSnackbar(`Дамп базы данных успешно сформирован и скачан (${(blob.size / 1024 / 1024).toFixed(2)} МБ)`, { variant: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка скачивания дампа БД';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setDownloadingDump(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [setRes, maintRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/system/maintenance'),
      ]);
      if (setRes.ok) {
        const json = await setRes.json();
        if (json.success && json.data) {
          setSettings(json.data);
        }
      }
      if (maintRes.ok) {
        const json = await maintRes.json();
        if (json.success && json.data) {
          setMaintStatus(json.data);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки настроек', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (field: string, value: string) => {
    setSettings((prev) => {
      const next = { ...prev, [field]: value };
      // Sync legacy aliases with polymorphic fields
      if (field === 'SRM_PROVIDER_URL') next.JIRA_BASE_URL = value;
      if (field === 'JIRA_BASE_URL') next.SRM_PROVIDER_URL = value;
      if (field === 'SRM_PROJECT_KEY') next.JIRA_PROJECT_KEY = value;
      if (field === 'JIRA_PROJECT_KEY') next.SRM_PROJECT_KEY = value;
      if (field === 'SRM_CUSTOM_FIELD_ID') next.JIRA_EQUIPMENT_CUSTOM_FIELD = value;
      if (field === 'JIRA_EQUIPMENT_CUSTOM_FIELD') next.SRM_CUSTOM_FIELD_ID = value;
      return next;
    });
  };

  const handleGlobalMaintSwitch = (checked: boolean) => {
    setPendingGlobalEnabled(checked);
    setConfirmGlobalDialogOpen(true);
  };

  const handleConfirmGlobalMaint = async () => {
    setConfirmGlobalDialogOpen(false);
    setSavingMaintenance(true);
    try {
      const updatedSystem = {
        ...maintStatus.system,
        enabled: pendingGlobalEnabled,
      };
      const res = await fetch('/api/system/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: updatedSystem }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMaintStatus(json.data);
        enqueueSnackbar(
          pendingGlobalEnabled
            ? 'Платформа переведена в режим ТО. Вход для обычных пользователей заблокирован.'
            : 'Режим ТО платформы отключен. Обычный доступ восстановлен.',
          { variant: pendingGlobalEnabled ? 'warning' : 'success' }
        );
      } else {
        enqueueSnackbar(json.error || 'Ошибка изменения статуса ТО', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при изменении статуса ТО', { variant: 'error' });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleSaveSystemMaintDetails = async () => {
    setSavingMaintenance(true);
    try {
      const res = await fetch('/api/system/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: maintStatus.system }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMaintStatus(json.data);
        enqueueSnackbar('Параметры сообщения глобального ТО сохранены', { variant: 'success' });
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleToggleModuleMaint = async (moduleId: string, newMaintEnabled: boolean) => {
    try {
      const updatedModules = {
        [moduleId]: {
          ...(maintStatus.modules as any)[moduleId],
          enabled: newMaintEnabled,
        },
      };
      const res = await fetch('/api/system/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: updatedModules }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMaintStatus(json.data);
        enqueueSnackbar(
          `Модуль ${moduleId.toUpperCase()} ${newMaintEnabled ? 'переведен в режим ТО' : 'возвращен в штатный режим'}`,
          { variant: newMaintEnabled ? 'warning' : 'success' }
        );
      } else {
        enqueueSnackbar(json.error || 'Ошибка переключения ТО модуля', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при переключении статуса модуля', { variant: 'error' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Системные настройки успешно сохранены', { variant: 'success' });
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestLdap = async () => {
    if (!settings.LDAP_URL.trim()) {
      enqueueSnackbar('Укажите LDAP URL для проверки подключения', { variant: 'warning' });
      return;
    }

    setTestingLdap(true);
    setLdapTestResult(null);
    try {
      const res = await fetch('/api/admin/settings/test-ldap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ldapUrl: settings.LDAP_URL,
          searchBase: settings.LDAP_SEARCH_BASE,
        }),
      });
      const data = await res.json();
      setLdapTestResult(data);
      if (data.success) {
        enqueueSnackbar(data.message || 'Подключение к LDAP успешно установлено', { variant: 'success' });
      } else {
        enqueueSnackbar(data.error || 'Ошибка проверки LDAP', { variant: 'error' });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Сетевая ошибка при проверке LDAP';
      setLdapTestResult({ success: false, error: errorMsg });
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setTestingLdap(false);
    }
  };

  const handleTestSrm = async () => {
    if (settings.SRM_PROVIDER_TYPE === 'DISABLED') {
      enqueueSnackbar('Внешняя интеграция отключена. SRM работает в автономном режиме.', { variant: 'info' });
      return;
    }

    const targetUrl = settings.SRM_PROVIDER_URL || settings.JIRA_BASE_URL;
    if (!targetUrl.trim()) {
      enqueueSnackbar('Укажите URL внешней системы для проверки подключения', { variant: 'warning' });
      return;
    }

    setTestingSrm(true);
    setSrmTestResult(null);
    try {
      const res = await fetch('/api/admin/settings/test-srm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerType: settings.SRM_PROVIDER_TYPE,
          providerUrl: targetUrl,
          projectKey: settings.SRM_PROJECT_KEY || settings.JIRA_PROJECT_KEY,
          apiKey: settings.SRM_API_KEY,
          customFieldId: settings.SRM_CUSTOM_FIELD_ID || settings.JIRA_EQUIPMENT_CUSTOM_FIELD,
        }),
      });
      const data = await res.json();
      setSrmTestResult(data);
      if (data.success) {
        enqueueSnackbar(data.message || 'Подключение к внешней системе успешно проверено', { variant: 'success' });
      } else {
        enqueueSnackbar(data.error || data.message || 'Ошибка проверки подключения', { variant: 'error' });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Сетевая ошибка при проверке подключения';
      setSrmTestResult({ success: false, error: errorMsg });
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setTestingSrm(false);
    }
  };

  const MODULE_ITEMS = [
    {
      id: 'eps',
      name: 'Паспортизация оборудования (EPS)',
      desc: 'Реестр оборудования, технические паспорта, классификаторы и структура технических параметров.',
      icon: <BadgeOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
    {
      id: 'wms',
      name: 'Складской учёт ТМЦ (WMS)',
      desc: 'Управление складами, остатками ТМЦ, перемещениями, приходами, расходами и инвентаризацией.',
      icon: <WarehouseOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
    {
      id: 'srm',
      name: 'Управление инцидентами и сервисом (SRM)',
      desc: 'Учёт инцидентов, синхронизация с Service Desk, статистика отказов и расчет показателей надежности (MTTR / MTBF).',
      icon: <AnalyticsOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
    {
      id: 'mro',
      name: 'Техническое обслуживание и ремонт (MRO)',
      desc: 'Графики ППР, технологические регламенты, проведение ТО и списание комплектующих.',
      icon: <BuildOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
  ];

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        title="Системные параметры платформы"
        subtitle="Управление режимами технического обслуживания, глобальными параметрами безопасности и интеграциями"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/settings' },
          { label: 'Системные параметры' },
        ]}
      />

      {loading ? (
        <PageLoading text="Загрузка настроек..." />
      ) : (
        <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* SECTION 1: GLOBAL SYSTEM MAINTENANCE MODE */}
          <Card
            sx={{
              borderRadius: '12px',
              border: maintStatus.system.enabled ? '2px solid #ea580c' : '1px solid #e2e8f0',
              backgroundColor: maintStatus.system.enabled ? '#fffbeb' : '#ffffff',
              boxShadow: maintStatus.system.enabled ? '0 4px 20px rgba(234, 88, 12, 0.12)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '10px',
                      backgroundColor: maintStatus.system.enabled ? '#ffedd5' : '#f1f5f9',
                      color: maintStatus.system.enabled ? '#ea580c' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <EngineeringIcon sx={{ fontSize: 26 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: maintStatus.system.enabled ? '#9a3412' : '#0f172a' }}>
                      Техническое обслуживание платформы
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                      Перевод всей системы в режим ТО с блокировкой входа для всех пользователей кроме администратора
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <StatusBadge
                    status={maintStatus.system.enabled ? 'MAINTENANCE' : 'ACTIVE'}
                    label={maintStatus.system.enabled ? 'РЕЖИМ ТО (ВХОД ОГРАНИЧЕН)' : 'ШТАТНЫЙ РЕЖИМ (ДОСТУПЕН ВСЕМ)'}
                    size="medium"
                  />
                  <Switch
                    checked={maintStatus.system.enabled}
                    onChange={(e) => handleGlobalMaintSwitch(e.target.checked)}
                    color="warning"
                    disabled={savingMaintenance}
                    sx={{ transform: 'scale(1.2)' }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    label="Сообщение для пользователей на экране входа"
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={maintStatus.system.message || ''}
                    onChange={(e) =>
                      setMaintStatus((prev) => ({
                        ...prev,
                        system: { ...prev.system, message: e.target.value },
                      }))
                    }
                    placeholder="Например: Проводятся регламентные технические работы по обновлению базы данных."
                    helperText="Данный текст увидят пользователи на странице авторизации /login"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Плановое время окончания ТО"
                    fullWidth
                    size="small"
                    value={maintStatus.system.estimatedUntil || ''}
                    onChange={(e) =>
                      setMaintStatus((prev) => ({
                        ...prev,
                        system: { ...prev.system, estimatedUntil: e.target.value },
                      }))
                    }
                    placeholder="Например: Сегодня до 18:30 МСК"
                    helperText="Ориентировочный срок завершения для информирования"
                  />
                  <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleSaveSystemMaintDetails}
                      disabled={savingMaintenance}
                      sx={{ fontWeight: 600, borderRadius: '8px' }}
                    >
                      Сохранить текст ТО
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* SECTION 2: PER-MODULE MAINTENANCE TOGGLES */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TuneOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Техническое обслуживание модулей (EPS, WMS, SRM, MRO)
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: '0.8125rem' }}>
                При переводе модуля в режим ТО обычные пользователи видят информационный экран-заглушку, а администратор сохраняет доступ для проведения настройки и проверки.
              </Typography>
              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                {MODULE_ITEMS.map((mod) => {
                  const modMaint = (maintStatus.modules as any)[mod.id] || { enabled: false, message: '' };
                  const isMaint = Boolean(modMaint.enabled);

                  return (
                    <Grid item xs={12} sm={6} md={3} key={mod.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2.5,
                          height: '100%',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          backgroundColor: isMaint ? '#fffbeb' : '#ffffff',
                          borderColor: isMaint ? '#fed7aa' : 'divider',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          },
                        }}
                      >
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {mod.icon}
                              <Typography variant="subtitle1" fontWeight={700} fontSize="0.875rem">
                                {mod.name}
                              </Typography>
                            </Box>
                            <StatusBadge
                              status={isMaint ? 'MAINTENANCE' : 'ACTIVE'}
                              label={isMaint ? 'ТО' : 'Штатно'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78125rem', lineHeight: 1.4, mb: 2 }}>
                            {mod.desc}
                          </Typography>
                        </Box>

                        <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" fontWeight={600} color={isMaint ? '#ea580c' : 'primary.main'}>
                            {isMaint ? 'Режим ТО включен' : 'Работает штатно'}
                          </Typography>
                          <Switch
                            checked={isMaint}
                            onChange={(e) => handleToggleModuleMaint(mod.id, e.target.checked)}
                            color="warning"
                            size="small"
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>

          {/* SECTION 3: GENERAL SETTINGS */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Основные параметры
              </Typography>
              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Название системы"
                    fullWidth
                    size="small"
                    value={settings.APP_NAME}
                    onChange={(e) => handleChange('APP_NAME', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* SECTION 4: INTEGRATIONS (LDAP & JIRA) */}
          <Grid container spacing={3}>
            {/* LDAP Settings */}
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
                      startIcon={testingLdap ? <CircularProgress size={14} color="inherit" /> : <NetworkCheckIcon />}
                      disabled={testingLdap}
                      onClick={handleTestLdap}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                      {testingLdap ? 'Проверка...' : 'Проверить подключение'}
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" paragraph>
                    Параметры корпоративного каталога для аутентификации пользователей
                  </Typography>
                  <Divider sx={{ mb: 2.5 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="LDAP URL"
                      placeholder="ldap://ldap.company.local:389"
                      fullWidth
                      size="small"
                      value={settings.LDAP_URL}
                      onChange={(e) => handleChange('LDAP_URL', e.target.value)}
                      helperText="Адрес сервера каталогов"
                    />

                    <TextField
                      label="LDAP Search Base"
                      placeholder="ou=users,dc=company,dc=local"
                      fullWidth
                      size="small"
                      value={settings.LDAP_SEARCH_BASE}
                      onChange={(e) => handleChange('LDAP_SEARCH_BASE', e.target.value)}
                      helperText="Базовая ветка поиска пользователей"
                    />

                    {/* LDAP Test Result Banner */}
                    {ldapTestResult && (
                      <Alert
                        severity={ldapTestResult.success ? 'success' : 'error'}
                        icon={ldapTestResult.success ? <CheckCircleOutlineIcon fontSize="inherit" /> : <ErrorOutlineIcon fontSize="inherit" />}
                        sx={{ mt: 1, borderRadius: 2, fontSize: '0.8125rem' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                            {ldapTestResult.success
                              ? ldapTestResult.message || 'Подключение успешно установлено'
                              : ldapTestResult.error || 'Ошибка подключения'}
                          </Typography>
                          {ldapTestResult.latencyMs !== undefined && (
                            <Chip
                              label={`${ldapTestResult.latencyMs} мс`}
                              size="small"
                              color={ldapTestResult.success ? 'success' : 'error'}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                            />
                          )}
                        </Box>
                        {ldapTestResult.details?.authMode && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Режим проверки: {ldapTestResult.details.authMode}
                          </Typography>
                        )}
                      </Alert>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Polymorphic External ServiceDesk / SRM Settings */}
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
                    {settings.SRM_PROVIDER_TYPE !== 'DISABLED' && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={testingSrm ? <CircularProgress size={14} color="inherit" /> : <NetworkCheckIcon />}
                        disabled={testingSrm}
                        onClick={handleTestSrm}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                      >
                        {testingSrm ? 'Проверка...' : 'Проверить подключение'}
                      </Button>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" paragraph>
                    Протокол синхронизации заявок и дефектов с внешней корпоративной системой
                  </Typography>
                  <Divider sx={{ mb: 2.5 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      select
                      label="Тип внешней ServiceDesk-системы"
                      value={settings.SRM_PROVIDER_TYPE}
                      onChange={(e) => handleChange('SRM_PROVIDER_TYPE', e.target.value)}
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

                    {settings.SRM_PROVIDER_TYPE === 'JIRA' && (
                      <>
                        <TextField
                          label="Jira Base URL"
                          placeholder="https://jira.company.local"
                          fullWidth
                          size="small"
                          value={settings.SRM_PROVIDER_URL}
                          onChange={(e) => handleChange('SRM_PROVIDER_URL', e.target.value)}
                          helperText="Базовый URL Jira инстанса"
                        />

                        <TextField
                          label="Ключ проекта Jira"
                          placeholder="SD"
                          fullWidth
                          size="small"
                          value={settings.SRM_PROJECT_KEY}
                          onChange={(e) => handleChange('SRM_PROJECT_KEY', e.target.value)}
                          helperText="Короткий префикс проекта Jira (например: SD, IT, EMS)"
                        />

                        <TextField
                          label="API-токен / Personal Access Token (PAT)"
                          placeholder="Укажите токен доступа Jira"
                          fullWidth
                          size="small"
                          type="password"
                          value={settings.SRM_API_KEY}
                          onChange={(e) => handleChange('SRM_API_KEY', e.target.value)}
                          helperText="Персональный токен доступа (PAT) для Jira Data Center или API-токен"
                        />

                        <TextField
                          label="Custom Field ID оборудования"
                          placeholder="customfield_10100"
                          fullWidth
                          size="small"
                          value={settings.SRM_CUSTOM_FIELD_ID}
                          onChange={(e) => handleChange('SRM_CUSTOM_FIELD_ID', e.target.value)}
                          helperText="ID кастомного поля Jira для привязки инвентарного номера"
                        />
                      </>
                    )}

                    {settings.SRM_PROVIDER_TYPE === 'REDMINE' && (
                      <>
                        <TextField
                          label="Redmine Host URL"
                          placeholder="https://redmine.company.local"
                          fullWidth
                          size="small"
                          value={settings.SRM_PROVIDER_URL}
                          onChange={(e) => handleChange('SRM_PROVIDER_URL', e.target.value)}
                          helperText="Адрес сервера Redmine REST API"
                        />

                        <TextField
                          label="API-ключ (X-Redmine-API-Key)"
                          placeholder="Укажите API-токен"
                          fullWidth
                          size="small"
                          type="password"
                          value={settings.SRM_API_KEY}
                          onChange={(e) => handleChange('SRM_API_KEY', e.target.value)}
                          helperText="Ключ доступа из профиля Redmine"
                        />

                        <TextField
                          label="Идентификатор или ID проекта"
                          placeholder="operations"
                          fullWidth
                          size="small"
                          value={settings.SRM_PROJECT_KEY}
                          onChange={(e) => handleChange('SRM_PROJECT_KEY', e.target.value)}
                          helperText="Символьный или числовой идентификатор проекта"
                        />

                        <TextField
                          label="ID кастомного поля инвентарного номера"
                          placeholder="customfield_1"
                          fullWidth
                          size="small"
                          value={settings.SRM_CUSTOM_FIELD_ID}
                          onChange={(e) => handleChange('SRM_CUSTOM_FIELD_ID', e.target.value)}
                          helperText="Поле задачи Redmine для привязки оборудования"
                        />
                      </>
                    )}

                    {settings.SRM_PROVIDER_TYPE === 'GITLAB' && (
                      <>
                        <TextField
                          label="GitLab Instance URL"
                          placeholder="https://gitlab.company.local"
                          fullWidth
                          size="small"
                          value={settings.SRM_PROVIDER_URL}
                          onChange={(e) => handleChange('SRM_PROVIDER_URL', e.target.value)}
                          helperText="Адрес инстанса GitLab"
                        />

                        <TextField
                          label="Private Access Token (Bearer)"
                          placeholder="glpat-xxxxxxxxxxxxxxxx"
                          fullWidth
                          size="small"
                          type="password"
                          value={settings.SRM_API_KEY}
                          onChange={(e) => handleChange('SRM_API_KEY', e.target.value)}
                          helperText="Токен с правами доступа к API"
                        />

                        <TextField
                          label="Путь к проекту (Project Path)"
                          placeholder="group/infrastructure-maint"
                          fullWidth
                          size="small"
                          value={settings.SRM_PROJECT_KEY}
                          onChange={(e) => handleChange('SRM_PROJECT_KEY', e.target.value)}
                          helperText="Namespace и название проекта в GitLab"
                        />
                      </>
                    )}

                    {settings.SRM_PROVIDER_TYPE === 'GENERIC_REST' && (
                      <>
                        <TextField
                          label="Базовый Endpoint REST API"
                          placeholder="https://servicedesk.company.local/api/v1"
                          fullWidth
                          size="small"
                          value={settings.SRM_PROVIDER_URL}
                          onChange={(e) => handleChange('SRM_PROVIDER_URL', e.target.value)}
                          helperText="Базовый URL внешнего сервиса заявок"
                        />

                        <TextField
                          label="Токен авторизации (Bearer / API Key)"
                          placeholder="Bearer eyJhbGciOi..."
                          fullWidth
                          size="small"
                          type="password"
                          value={settings.SRM_API_KEY}
                          onChange={(e) => handleChange('SRM_API_KEY', e.target.value)}
                          helperText="Значение заголовка авторизации"
                        />

                        <TextField
                          label="Ресурс / Путь к списку задач"
                          placeholder="/incidents"
                          fullWidth
                          size="small"
                          value={settings.SRM_PROJECT_KEY}
                          onChange={(e) => handleChange('SRM_PROJECT_KEY', e.target.value)}
                          helperText="Относительный URL для выборки инцидентов"
                        />
                      </>
                    )}

                    {settings.SRM_PROVIDER_TYPE === 'DISABLED' && (
                      <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.8125rem' }}>
                        Внешняя интеграция отключена. Модуль SRM работает в автономном режиме с использованием встроенной базы данных.
                      </Alert>
                    )}

                    {/* SRM Test Result Banner */}
                    {srmTestResult && settings.SRM_PROVIDER_TYPE !== 'DISABLED' && (
                      <Alert
                        severity={srmTestResult.success ? 'success' : 'error'}
                        icon={srmTestResult.success ? <CheckCircleOutlineIcon fontSize="inherit" /> : <ErrorOutlineIcon fontSize="inherit" />}
                        sx={{ mt: 1, borderRadius: 2, fontSize: '0.8125rem' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                            {srmTestResult.success
                              ? srmTestResult.message || 'Подключение успешно проверено'
                              : srmTestResult.error || 'Ошибка подключения'}
                          </Typography>
                          {srmTestResult.latencyMs !== undefined && (
                            <Chip
                              label={`${srmTestResult.latencyMs} мс`}
                              size="small"
                              color={srmTestResult.success ? 'success' : 'error'}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                            />
                          )}
                        </Box>
                        {srmTestResult.details?.serverInfo?.serverTitle && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Инстанс: {srmTestResult.details.serverInfo.serverTitle}
                          </Typography>
                        )}
                        {srmTestResult.diagnostics && srmTestResult.diagnostics.length > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            {srmTestResult.diagnostics.map((diag, i) => (
                              <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                • {diag}
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
          </Grid>

          {/* Database Backup and Dump Export Card */}
          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: '8px',
                      bgcolor: 'rgba(2, 132, 199, 0.08)',
                      color: 'primary.main',
                      display: 'flex',
                    }}
                  >
                    <StorageIcon />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Резервное копирование и дамп базы данных
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Экспорт структуры и данных PostgreSQL в архивном формате .sql.gz для переноса и резервного хранения
                    </Typography>
                  </Box>
                </Box>
                <StatusBadge status="ACTIVE" label="PostgreSQL" size="small" />
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={7}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1, color: 'text.primary' }}>
                      Выберите режим выгрузки дампа:
                    </FormLabel>
                    <RadioGroup
                      row
                      value={dumpMode}
                      onChange={(e) => setDumpMode(e.target.value as 'full' | 'data' | 'schema')}
                    >
                      <FormControlLabel
                        value="full"
                        control={<Radio size="small" />}
                        label={<Typography variant="body2" fontWeight={dumpMode === 'full' ? 700 : 400}>Полный дамп (Схема + Данные)</Typography>}
                      />
                      <FormControlLabel
                        value="data"
                        control={<Radio size="small" />}
                        label={<Typography variant="body2" fontWeight={dumpMode === 'data' ? 700 : 400}>Только данные (INSERTs)</Typography>}
                      />
                      <FormControlLabel
                        value="schema"
                        control={<Radio size="small" />}
                        label={<Typography variant="body2" fontWeight={dumpMode === 'schema' ? 700 : 400}>Только структура (DDL)</Typography>}
                      />
                    </RadioGroup>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {dumpMode === 'full' && '• Создается полный самодостаточный дамп с удалением и созданием всех таблиц, связей и записей.'}
                    {dumpMode === 'data' && '• Экспортируются только строки таблиц для восстановления поверх существующей структуры.'}
                    {dumpMode === 'schema' && '• Экспортируется DDL-структура таблиц, индексов и ограничений без бизнес-данных.'}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="medium"
                    startIcon={downloadingDump ? <CircularProgress size={18} color="inherit" /> : <CloudDownloadIcon />}
                    disabled={downloadingDump || loading}
                    onClick={() => setConfirmDumpDialogOpen(true)}
                    sx={{ px: 3, py: 1.2, fontWeight: 700 }}
                  >
                    {downloadingDump ? 'Формирование дампа...' : 'Скачать дамп БД (.sql.gz)'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              disabled={saving}
              sx={{ px: 4, py: 1.2, fontWeight: 700 }}
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Confirmation Dialog for Global Maintenance Mode */}
      <ConfirmDialog
        open={confirmGlobalDialogOpen}
        title={pendingGlobalEnabled ? 'Включение режима технического обслуживания?' : 'Отключение режима технического обслуживания?'}
        message={
          pendingGlobalEnabled
            ? 'Внимание! При включении режима ТО вся платформа станет недоступна для обычных сотрудников. Вход будет разрешен только администраторам.'
            : 'Вы уверены, что хотите завершить режим ТО и открыть доступ к платформе для всех сотрудников?'
        }
        confirmText={pendingGlobalEnabled ? 'Включить ТО' : 'Отключить ТО'}
        cancelText="Отмена"
        variant={pendingGlobalEnabled ? 'warning' : 'info'}
        onConfirm={handleConfirmGlobalMaint}
        onClose={() => setConfirmGlobalDialogOpen(false)}
      />

      {/* Confirmation Dialog for Database Dump Export */}
      <ConfirmDialog
        open={confirmDumpDialogOpen}
        title="Подтверждение скачивания дампа базы данных"
        message={`Будет сформирован и скачан сжатый архив дампа PostgreSQL (режим: ${dumpMode === 'full' ? 'Полный' : dumpMode === 'data' ? 'Только данные' : 'Только структура'}). Операция будет зафиксирована в журнале аудита.`}
        confirmText="Сформировать и скачать"
        cancelText="Отмена"
        variant="info"
        onConfirm={handleDownloadDump}
        onClose={() => setConfirmDumpDialogOpen(false)}
      />
    </Box>
  );
}
