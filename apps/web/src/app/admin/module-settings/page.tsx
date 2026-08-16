'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TuneIcon from '@mui/icons-material/Tune';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';

interface CustomFieldItem {
  id: string;
  key: string;
  name: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  isRequired: boolean;
  defaultValue: string | null;
  options: string[] | null;
  sortOrder: number;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
  equipmentCount: number;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Текстовое поле',
  NUMBER: 'Числовое значение',
  DATE: 'Дата',
  SELECT: 'Выпадающий список',
  BOOLEAN: 'Флаг (Да/Нет)',
};

const PRESET_COLORS = ['#0284c7', '#0f766e', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#475569'];

export default function ModuleSettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);

  // EPS Metadata State
  const [fields, setFields] = useState<CustomFieldItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loadingEps, setLoadingEps] = useState(true);

  // Create Field Dialog
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [fieldKey, setFieldKey] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('TEXT');
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [optionsStr, setOptionsStr] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [savingField, setSavingField] = useState(false);

  // Create Tag Dialog
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#0284c7');
  const [savingTag, setSavingTag] = useState(false);

  const fetchEpsData = useCallback(async () => {
    setLoadingEps(true);
    try {
      const [fRes, tRes] = await Promise.all([
        fetch('/api/eps/custom-fields'),
        fetch('/api/eps/tags'),
      ]);
      if (fRes.ok && tRes.ok) {
        const [fJson, tJson] = await Promise.all([fRes.json(), tRes.json()]);
        if (fJson.success) setFields(fJson.data);
        if (tJson.success) setTags(tJson.data);
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки настроек EPS', { variant: 'error' });
    } finally {
      setLoadingEps(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchEpsData();
  }, [fetchEpsData]);

  // Save Custom Field
  const handleSaveField = async () => {
    if (!fieldKey.trim() || !fieldName.trim()) {
      enqueueSnackbar('Укажите ключ и название поля', { variant: 'warning' });
      return;
    }
    setSavingField(true);
    try {
      const options = fieldType === 'SELECT' ? optionsStr.split(',').map((o) => o.trim()).filter(Boolean) : undefined;
      const res = await fetch('/api/eps/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: fieldKey.trim(),
          name: fieldName.trim(),
          fieldType,
          isRequired,
          defaultValue: defaultValue.trim() || null,
          options,
          sortOrder: Number(sortOrder) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Кастомное поле сохранено', { variant: 'success' });
        setFieldDialogOpen(false);
        setFieldKey('');
        setFieldName('');
        fetchEpsData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingField(false);
    }
  };

  // Delete Custom Field
  const handleDeleteField = async (f: CustomFieldItem) => {
    if (!confirm(`Удалить кастомное поле «${f.name}»?`)) return;
    try {
      const res = await fetch(`/api/eps/custom-fields?id=${f.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Поле удалено', { variant: 'info' });
        fetchEpsData();
      }
    } catch {
      enqueueSnackbar('Ошибка удаления', { variant: 'error' });
    }
  };

  // Save Tag
  const handleSaveTag = async () => {
    if (!tagName.trim()) {
      enqueueSnackbar('Укажите название тега', { variant: 'warning' });
      return;
    }
    setSavingTag(true);
    try {
      const res = await fetch('/api/eps/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName.trim(), color: tagColor }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Тег создан', { variant: 'success' });
        setTagDialogOpen(false);
        setTagName('');
        fetchEpsData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingTag(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title="Справочники и настройки модулей"
        subtitle="Единый центр конфигурации технических справочников, классификаторов и кастомных полей системы"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/users' },
          { label: 'Справочники модулей' },
        ]}
      />

      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<PrecisionManufacturingIcon />} iconPosition="start" label="EPS (Оборудование)" />
          <Tab icon={<Inventory2Icon />} iconPosition="start" label="WMS (Складской учёт)" />
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="SRM (Jira & Метрики)" />
          <Tab icon={<BuildCircleIcon />} iconPosition="start" label="MRO (ТО и Ремонт)" />
        </Tabs>
      </Card>

      {/* TAB 0: EPS — Оборудование */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Sub-section 1: Custom Fields */}
          <Grid item xs={12} lg={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Кастомные поля паспортов
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Динамические параметры в карточке оборудования
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setFieldKey('');
                      setFieldName('');
                      setFieldType('TEXT');
                      setIsRequired(false);
                      setDefaultValue('');
                      setOptionsStr('');
                      setSortOrder(fields.length + 1);
                      setFieldDialogOpen(true);
                    }}
                  >
                    Добавить поле
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {loadingEps ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Название</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Ключ</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Тип</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Обязательное</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Действия</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fields.map((f) => (
                          <TableRow key={f.id} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{f.name}</TableCell>
                            <TableCell>
                              <Chip label={f.key} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                            </TableCell>
                            <TableCell>
                              <Chip label={FIELD_TYPE_LABELS[f.fieldType] || f.fieldType} size="small" color="primary" />
                            </TableCell>
                            <TableCell>{f.isRequired ? 'Да' : 'Нет'}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="error" onClick={() => handleDeleteField(f)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sub-section 2: Tags & Categories */}
          <Grid item xs={12} lg={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Теги и классификаторы
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Группировка оборудования по типам и цехам
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setTagName('');
                      setTagColor('#0284c7');
                      setTagDialogOpen(true);
                    }}
                  >
                    Создать тег
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {loadingEps ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Тег</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Цвет</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Оборудование</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tags.map((t) => (
                          <TableRow key={t.id} hover>
                            <TableCell>
                              <Chip
                                label={t.name}
                                size="small"
                                sx={{
                                  backgroundColor: `${t.color}15`,
                                  color: t.color,
                                  borderColor: t.color,
                                  fontWeight: 600,
                                }}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: t.color }} />
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                  {t.color}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{t.equipmentCount} ед.</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: WMS — Складской учёт */}
      {activeTab === 1 && (
        <Card sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Справочники склада (WMS)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Управление перечнем физических складов, материально ответственных лиц и структурой категорий номенклатуры
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Склады хранения
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" paragraph>
                  Центральный склад, Цех №1 (ЗиП), Склад ГСМ
                </Typography>
                <Button variant="outlined" size="small" startIcon={<AddIcon />}>
                  Добавить склад
                </Button>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Категории номенклатуры
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" paragraph>
                  Запасные части, Расходные материалы, Инструмент, Масла и смазки
                </Typography>
                <Button variant="outlined" size="small" startIcon={<AddIcon />}>
                  Добавить категорию
                </Button>
              </Card>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* TAB 2: SRM — Дашборд Jira */}
      {activeTab === 2 && (
        <Card sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Конфигурация интеграции Jira (SRM)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Маппинг полей инцидентов, статусов завершения и правил расчета метрик MTTR / MTBF
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5} sx={{ maxWidth: 720 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="Ключ проекта Jira" defaultValue="EMS" fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Поле инвентарного номера" defaultValue="customfield_10100" fullWidth size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="JQL фильтр инцидентов ТОиР" defaultValue="project = EMS AND issuetype in (Bug, Incident)" fullWidth size="small" />
            </Grid>
          </Grid>
        </Card>
      )}

      {/* TAB 3: MRO — ТО и Ремонт */}
      {activeTab === 3 && (
        <Card sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Шаблоны регламентов и чек-листов (MRO)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Электронные типовые бланки проверки узлов (замеры вибрации, уровня масла, давления, температуры)
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Button variant="contained" startIcon={<AddIcon />}>
            Создать шаблон чек-листа
          </Button>
        </Card>
      )}

      {/* Create Custom Field Modal */}
      <Dialog open={fieldDialogOpen} onClose={() => setFieldDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавление кастомного поля оборудования</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Отображаемое название"
              placeholder="например: Рабочее давление (бар)"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Системный ключ (латиницей)"
              placeholder="например: working_pressure_bar"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              fullWidth
              size="small"
              required
            />
            <TextField
              select
              label="Тип данных"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
              fullWidth
              size="small"
            >
              {Object.entries(FIELD_TYPE_LABELS).map(([k, label]) => (
                <MenuItem key={k} value={k}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            {fieldType === 'SELECT' && (
              <TextField
                label="Варианты (через запятую)"
                placeholder="10 бар, 16 бар, 25 бар"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                fullWidth
                size="small"
              />
            )}
            {fieldType !== 'BOOLEAN' && (
              <TextField
                label="Значение по умолчанию"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                fullWidth
                size="small"
              />
            )}
            <FormControlLabel
              control={
                <Checkbox checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
              }
              label="Обязательно для заполнения"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialogOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSaveField} variant="contained" disabled={savingField}>
            {savingField ? <CircularProgress size={20} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Tag Modal */}
      <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Создание тега оборудования</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Название тега"
              placeholder="например: Взрывозащищенное"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              fullWidth
              size="small"
              required
            />
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Цвет бейджа:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setTagColor(color)}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: tagColor === color ? '3px solid #0f172a' : '2px solid transparent',
                      transition: 'transform 0.1s ease',
                      '&:hover': { transform: 'scale(1.15)' },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialogOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSaveTag} variant="contained" disabled={savingTag}>
            {savingTag ? <CircularProgress size={20} /> : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
