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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import LanIcon from '@mui/icons-material/Lan';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';

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

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSettings(json.data);
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

  return (
    <Box>
      <PageHeader
        title="Системные настройки"
        subtitle="Параметры интеграции с LDAP и Jira API"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование' },
          { label: 'Настройки' },
        ]}
      />

      {loading ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Card>
      ) : (
        <Box component="form" onSubmit={handleSave}>
          <Grid container spacing={3}>
            {/* General Settings */}
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
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
            </Grid>

            {/* LDAP Settings */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LanIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
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

            {/* Jira Integration */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AssessmentIcon color="secondary" />
                    <Typography variant="h6" fontWeight={600}>
                      Интеграция с Jira API (SRM)
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" paragraph>
                    Подключение к Jira для мониторинга заявок и расчёта MTTR/MTBF
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
                    />

                    <TextField
                      label="Ключ проекта Jira (Project Key)"
                      placeholder="EMS или MAINT"
                      fullWidth
                      size="small"
                      value={settings.JIRA_PROJECT_KEY}
                      onChange={(e) => handleChange('JIRA_PROJECT_KEY', e.target.value)}
                    />

                    <TextField
                      label="Кастомное поле оборудования в Jira"
                      placeholder="customfield_10100"
                      fullWidth
                      size="small"
                      value={settings.JIRA_EQUIPMENT_CUSTOM_FIELD}
                      onChange={(e) => handleChange('JIRA_EQUIPMENT_CUSTOM_FIELD', e.target.value)}
                      helperText="Идентификатор поля в Jira, в котором указывается инвентарный номер"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Save Button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={<SaveIcon />}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={24} /> : 'Сохранить настройки'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
