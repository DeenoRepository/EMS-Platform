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
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import { StatusBadge, PageLoading, ConfirmDialog } from '@/components/ui';
import { PlatformMaintenanceStatus } from '@ems/shared';

export default function AdminSettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const [settings, setSettings] = useState({
    APP_NAME: '',
    LDAP_URL: '',
    LDAP_SEARCH_BASE: '',
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
    setSettings((prev) => ({ ...prev, [field]: value }));
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

  const MODULE_ITEMS = [
    {
      id: 'eps',
      name: 'Паспортизация (EPS)',
      desc: 'Реестр оборудования, технические паспорта, классификаторы и кастомные атрибуты.',
      icon: <BadgeOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
    {
      id: 'wms',
      name: 'Складской учёт (WMS)',
      desc: 'Управление складами, остатками ТМЦ, перемещениями, приходами, расходами и инвентаризацией.',
      icon: <WarehouseOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
    {
      id: 'srm',
      name: 'Подача заявок (SRM)',
      desc: 'Учёт инцидентов, синхронизация с ServiceDesk, статистика отказов и расчет MTTR/MTBF.',
      icon: <AnalyticsOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
    {
      id: 'mro',
      name: 'ТО и Ремонт (MRO)',
      desc: 'Графики ППР, технологические регламенты, проведение ТО и списание запчастей.',
      icon: <BuildOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
  ];

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        title="Настройки платформы"
        subtitle="Управление режимами технического обслуживания, глобальными параметрами и интеграциями"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin' },
          { label: 'Настройки' },
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
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LanIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Интеграция с LDAP / Active Directory
                    </Typography>
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
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Jira Settings */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AssessmentIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Интеграция с Jira Service Desk
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" paragraph>
                    Параметры подключения к корпоративной Jira для модуля SRM
                  </Typography>
                  <Divider sx={{ mb: 2.5 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Jira Base URL"
                      placeholder="https://jira.company.local"
                      fullWidth
                      size="small"
                      value={settings.JIRA_BASE_URL}
                      onChange={(e) => handleChange('JIRA_BASE_URL', e.target.value)}
                      helperText="Базовый URL Jira инстанса"
                    />

                    <TextField
                      label="Ключ проекта Jira"
                      placeholder="EMS"
                      fullWidth
                      size="small"
                      value={settings.JIRA_PROJECT_KEY}
                      onChange={(e) => handleChange('JIRA_PROJECT_KEY', e.target.value)}
                      helperText="Ключ проекта для сервисных заявок"
                    />

                    <TextField
                      label="Custom Field ID оборудования"
                      placeholder="customfield_10100"
                      fullWidth
                      size="small"
                      value={settings.JIRA_EQUIPMENT_CUSTOM_FIELD}
                      onChange={(e) => handleChange('JIRA_EQUIPMENT_CUSTOM_FIELD', e.target.value)}
                      helperText="ID кастомного поля Jira для привязки инвентарного номера"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
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
    </Box>
  );
}
