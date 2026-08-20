'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  Paper,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TuneIcon from '@mui/icons-material/Tune';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/layout/PageHeader';
import {
  EmptyState,
  DataTableWrapper,
  ConfirmDialog,
  FormDialog,
  StatusBadge,
} from '@/components/ui';

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

function EpsSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'tags' ? 1 : 0);

  useEffect(() => {
    if (tabParam === 'tags') setActiveTab(1);
    else if (tabParam === 'fields') setActiveTab(0);
  }, [tabParam]);

  const handleTabChange = (_: React.SyntheticEvent, newTab: number) => {
    setActiveTab(newTab);
    const tabName = newTab === 1 ? 'tags' : 'fields';
    router.replace(`/eps/settings?tab=${tabName}`);
  };

  // ─── TAB 0: Custom Fields State ───
  const [fields, setFields] = useState<CustomFieldItem[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [deleteDialogField, setDeleteDialogField] = useState<CustomFieldItem | null>(null);
  const [deletingField, setDeletingField] = useState(false);
  const [openFieldDialog, setOpenFieldDialog] = useState(false);
  const [fieldKey, setFieldKey] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('TEXT');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldDefault, setFieldDefault] = useState('');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldSort, setFieldSort] = useState(0);
  const [savingField, setSavingField] = useState(false);

  // ─── TAB 1: Tags State ───
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [openTagDialog, setOpenTagDialog] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#0284c7');
  const [savingTag, setSavingTag] = useState(false);

  const fetchFields = useCallback(async () => {
    setLoadingFields(true);
    try {
      const res = await fetch('/api/eps/custom-fields');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setFields(json.data || []);
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки кастомных полей', { variant: 'error' });
    } finally {
      setLoadingFields(false);
    }
  }, [enqueueSnackbar]);

  const fetchTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      const res = await fetch('/api/eps/tags');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTags(json.data || []);
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки тегов', { variant: 'error' });
    } finally {
      setLoadingTags(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchFields();
    fetchTags();
  }, [fetchFields, fetchTags]);

  const handleOpenCreateField = () => {
    setFieldKey('');
    setFieldName('');
    setFieldType('TEXT');
    setFieldRequired(false);
    setFieldDefault('');
    setFieldOptions('');
    setFieldSort(fields.length + 1);
    setOpenFieldDialog(true);
  };

  const handleSaveField = async () => {
    if (!fieldKey.trim() || !fieldName.trim()) {
      enqueueSnackbar('Заполните ключ и отображаемое название поля', { variant: 'warning' });
      return;
    }

    setSavingField(true);
    try {
      const options =
        fieldType === 'SELECT'
          ? fieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined;

      const res = await fetch('/api/eps/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: fieldKey.trim(),
          name: fieldName.trim(),
          fieldType,
          isRequired: fieldRequired,
          defaultValue: fieldDefault.trim() || null,
          options,
          sortOrder: Number(fieldSort) || 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Кастомное поле успешно сохранено', { variant: 'success' });
        setOpenFieldDialog(false);
        fetchFields();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingField(false);
    }
  };

  const handleConfirmDeleteField = async () => {
    if (!deleteDialogField) return;
    setDeletingField(true);
    try {
      const res = await fetch(`/api/eps/custom-fields?id=${deleteDialogField.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Поле успешно удалено', { variant: 'info' });
        setDeleteDialogField(null);
        fetchFields();
      } else {
        enqueueSnackbar(data.error || 'Ошибка удаления', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setDeletingField(false);
    }
  };

  const handleCreateTag = async () => {
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
        enqueueSnackbar('Тег успешно создан', { variant: 'success' });
        setOpenTagDialog(false);
        setTagName('');
        fetchTags();
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания тега', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingTag(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto', pb: 4 }}>
      <PageHeader
        title="Настройки структуры и классификации EPS"
        subtitle="Управление динамическими техническими атрибутами паспортов оборудования и справочником технологических меток"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Настройки EPS' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/eps')}
              sx={{
                height: 38,
                borderRadius: '8px',
                borderColor: '#e2e8f0',
                color: '#334155',
                px: 2,
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
              }}
            >
              К реестру
            </Button>
            {activeTab === 0 ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateField}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  px: 2.25,
                  boxSizing: 'border-box',
                  backgroundColor: '#0284c7',
                  '&:hover': { backgroundColor: '#0369a1' },
                }}
              >
                Добавить поле
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenTagDialog(true)}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  px: 2.25,
                  boxSizing: 'border-box',
                  backgroundColor: '#0284c7',
                  '&:hover': { backgroundColor: '#0369a1' },
                }}
              >
                Создать тег
              </Button>
            )}
          </Box>
        }
      />

      {/* Tabs Header */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            px: 2,
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              py: 1,
            },
          }}
        >
          <Tab icon={<TuneIcon sx={{ fontSize: 18, mr: 0.5 }} />} iconPosition="start" label="Кастомные поля и секции" />
          <Tab icon={<LocalOfferOutlinedIcon sx={{ fontSize: 18, mr: 0.5 }} />} iconPosition="start" label="Теги и классификаторы" />
        </Tabs>
      </Paper>

      {/* TAB 0: Custom Fields */}
      {activeTab === 0 && (
        <>
          {fields.length === 0 && !loadingFields ? (
            <EmptyState
              paper
              icon={<TuneIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
              title="Кастомные поля еще не созданы"
              description="Вы можете настроить дополнительные технические атрибуты, которые будут отображаться в паспортах оборудования."
              actionText="Создать первое поле"
              onAction={handleOpenCreateField}
            />
          ) : (
            <DataTableWrapper loading={loadingFields} total={fields.length} stickyHeader>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 80 }}>Порядок</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Отображаемое название</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Системный ключ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Тип данных</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Обязательное</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Значение по умолчанию</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell>{f.sortOrder}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{f.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', color: '#0284c7' }}>{f.key}</TableCell>
                      <TableCell>
                        <Chip
                          label={FIELD_TYPE_LABELS[f.fieldType] || f.fieldType}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 500, borderRadius: '6px' }}
                        />
                      </TableCell>
                      <TableCell>
                        {f.isRequired ? (
                          <Chip label="Да" size="small" color="error" variant="filled" sx={{ height: 20, fontSize: '0.7rem' }} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">Нет</Typography>
                        )}
                      </TableCell>
                      <TableCell>{f.defaultValue || '—'}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialogField(f)}
                          title="Удалить поле"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableWrapper>
          )}
        </>
      )}

      {/* TAB 1: Tags */}
      {activeTab === 1 && (
        <>
          {tags.length === 0 && !loadingTags ? (
            <EmptyState
              paper
              icon={<LocalOfferOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
              title="Теги оборудования еще не созданы"
              description="Теги позволяют классифицировать оборудование по цехам, критичности или функциональным группам."
              actionText="Создать первый тег"
              onAction={() => setOpenTagDialog(true)}
            />
          ) : (
            <DataTableWrapper loading={loadingTags} total={tags.length} stickyHeader>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Тег / Бейдж</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Цвет метки</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Количество оборудования</TableCell>
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
                            backgroundColor: `${t.color}20`,
                            color: t.color,
                            fontWeight: 700,
                            border: `1px solid ${t.color}`,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 16, height: 16, borderRadius: '4px', backgroundColor: t.color }} />
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {t.color}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {t.equipmentCount || 0} ед.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableWrapper>
          )}
        </>
      )}

      {/* Confirm Delete Field Dialog */}
      <ConfirmDialog
        open={Boolean(deleteDialogField)}
        title="Удаление кастомного поля"
        message={`Вы действительно хотите удалить поле «${deleteDialogField?.name}»? Значения этого поля в паспортах оборудования будут недоступны.`}
        confirmText="Удалить"
        variant="danger"
        loading={deletingField}
        onConfirm={handleConfirmDeleteField}
        onClose={() => setDeleteDialogField(null)}
      />

      {/* Create Field Dialog */}
      <FormDialog
        open={openFieldDialog}
        onClose={() => setOpenFieldDialog(false)}
        title="Добавление кастомного поля оборудования"
        icon={<TuneIcon color="primary" />}
        maxWidth="sm"
        loading={savingField}
        onSubmit={handleSaveField}
        submitLabel="Сохранить поле"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Отображаемое название (например, Мощность двигателя)"
            required
            fullWidth
            size="small"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
          />

          <TextField
            label="Системный ключ (латиницей, например, engine_power_kw)"
            required
            fullWidth
            size="small"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
            helperText="Используется в API, фильтрах и отчетах"
          />

          <TextField
            select
            label="Тип данных"
            fullWidth
            size="small"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value)}
          >
            {Object.entries(FIELD_TYPE_LABELS).map(([k, label]) => (
              <MenuItem key={k} value={k}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          {fieldType === 'SELECT' && (
            <TextField
              label="Варианты выбора (через запятую)"
              placeholder="380 В, 220 В, 10 кВ"
              fullWidth
              size="small"
              value={fieldOptions}
              onChange={(e) => setFieldOptions(e.target.value)}
              helperText="Введите доступные опции, разделенные запятыми"
            />
          )}

          <TextField
            label="Значение по умолчанию"
            fullWidth
            size="small"
            value={fieldDefault}
            onChange={(e) => setFieldDefault(e.target.value)}
          />

          <TextField
            label="Порядковый номер"
            type="number"
            fullWidth
            size="small"
            value={fieldSort}
            onChange={(e) => setFieldSort(Number(e.target.value))}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
                color="primary"
              />
            }
            label="Обязательное для заполнения поле"
          />
        </Box>
      </FormDialog>

      {/* Create Tag Dialog */}
      <FormDialog
        open={openTagDialog}
        onClose={() => setOpenTagDialog(false)}
        title="Создание нового тега оборудования"
        icon={<LocalOfferOutlinedIcon color="primary" />}
        maxWidth="xs"
        loading={savingTag}
        onSubmit={handleCreateTag}
        submitLabel="Создать тег"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Название тега"
            placeholder="например: Цех №2 или Критическое"
            required
            fullWidth
            size="small"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
          />

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Выберите цвет метки:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setTagColor(c)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '6px',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: tagColor === c ? '2.5px solid #0f172a' : '1px solid transparent',
                    transition: 'transform 0.1s',
                    '&:hover': { transform: 'scale(1.15)' },
                  }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Предпросмотр бейджа:
            </Typography>
            <Chip
              label={tagName || 'Название тега'}
              size="small"
              sx={{
                backgroundColor: `${tagColor}20`,
                color: tagColor,
                fontWeight: 700,
                border: `1px solid ${tagColor}`,
              }}
            />
          </Box>
        </Box>
      </FormDialog>
    </Box>
  );
}

export default function EpsSettingsPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 4 }}>Загрузка настроек EPS...</Box>}>
      <EpsSettingsContent />
    </Suspense>
  );
}
