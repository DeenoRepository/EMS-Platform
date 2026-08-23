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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import LanIcon from '@mui/icons-material/Lan';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import { StatusBadge, PageLoading } from '@/components/ui';

export default function AdminSettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    APP_NAME: '',
    LDAP_URL: '',
    LDAP_SEARCH_BASE: '',
    JIRA_BASE_URL: '',
    JIRA_PROJECT_KEY: '',
    JIRA_EQUIPMENT_CUSTOM_FIELD: '',
  });

  // Module Status State
  const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>({
    eps: true,
    wms: true,
    srm: true,
    mro: true,
  });
  const [togglingModule, setTogglingModule] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [setRes, modRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/modules/status'),
      ]);
      if (setRes.ok) {
        const json = await setRes.json();
        if (json.success && json.data) {
          setSettings(json.data);
        }
      }
      if (modRes.ok) {
        const modJson = await modRes.json();
        if (modJson.success && modJson.data) {
          setModuleStatus(modJson.data);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки настроек', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field: string, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleModule = async (moduleId: string, newEnabled: boolean) => {
    setTogglingModule(moduleId);
    try {
      const res = await fetch('/api/modules/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, enabled: newEnabled }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setModuleStatus(json.data);
        enqueueSnackbar(`Модуль успешно ${newEnabled ? 'включен' : 'отключен'}`, {
          variant: newEnabled ? 'success' : 'info',
        });
      } else {
        enqueueSnackbar(json.error || 'Ошибка изменения статуса модуля', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при изменении статуса модуля', { variant: 'error' });
    } finally {
      setTogglingModule(null);
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
      desc: 'Номенклатура ТМЦ, склады, приходные/расходные ордера и списание на единицы оборудования.',
      icon: <WarehouseOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
    {
      id: 'srm',
      name: 'Система подачи заявок (SRM)',
      desc: 'Мониторинг инцидентов, синхронизация с ServiceDesk (Jira, Redmine, 1C), аналитика MTTR/MTBF и SLA.',
      icon: <AnalyticsOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
    {
      id: 'mro',
      name: 'ТО и Ремонт (MRO)',
      desc: 'Графики ППР, технологические карты, регламентные журналы и дефектовочные ведомости.',
      icon: <BuildOutlinedIcon color="primary" sx={{ fontSize: 24 }} />,
    },
  ];

  return (
    <Box sx={{ width: '100%', pb: 2 }}>
      <PageHeader
        title="Параметры системы"
        subtitle="Глобальная конфигурация платформы, активность модулей и параметры интеграции с LDAP и Jira API"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/users' },
          { label: 'Параметры системы' },
        ]}
      />

      {loading ? (
        <PageLoading text="Загрузка параметров и конфигурации системы..." />
      ) : (
        <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Section 1: Module Enablement & Activation Grid */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
                <TuneOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Управление активностью модулей платформы
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" paragraph>
                Включение и отключение функциональных подсистем платформы. Отключенные модули скрываются из главного меню и становятся недоступными для пользователей.
              </Typography>
              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2.5}>
                {MODULE_ITEMS.map((mod) => {
                  const enabled = moduleStatus[mod.id] !== false;
                  const isPending = togglingModule === mod.id;

                  return (
                    <Grid item xs={12} sm={6} md={6} lg={3} key={mod.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2.5,
                          height: '100%',
                          borderRadius: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          backgroundColor: enabled ? 'background.paper' : 'background.default',
                          borderColor: enabled ? 'grey.400' : 'divider',
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
                              status={enabled ? 'ACTIVE' : 'INACTIVE'}
                              label={enabled ? 'Активен' : 'Отключен'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78125rem', lineHeight: 1.4, mb: 2 }}>
                            {mod.desc}
                          </Typography>
                        </Box>

                        <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" fontWeight={600} color={enabled ? 'primary.main' : 'text.disabled'}>
                            {enabled ? 'Включен в навигации' : 'Отключен'}
                          </Typography>
                          <Switch
                            checked={enabled}
                            disabled={isPending}
                            onChange={(e) => handleToggleModule(mod.id, e.target.checked)}
                            color="primary"
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

          {/* Section 2: General System Settings */}
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

          {/* Section 3: Integrations (LDAP & Jira) */}
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
    </Box>
  );
}
