'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import TuneIcon from '@mui/icons-material/Tune';
import {
  EmptyState,
  DataTableWrapper,
  ConfirmDialog,
  FormDialog,
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

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Текстовое поле',
  NUMBER: 'Числовое значение',
  DATE: 'Дата',
  SELECT: 'Выпадающий список',
  BOOLEAN: 'Флаг (Да/Нет)',
};

export default function CustomFieldsBuilderPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [fields, setFields] = useState<CustomFieldItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete dialog state
  const [deleteDialogField, setDeleteDialogField] = useState<CustomFieldItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal state
  const [openDialog, setOpenDialog] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState('TEXT');
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [optionsStr, setOptionsStr] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/eps/custom-fields');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setFields(json.data);
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки кастомных полей', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleOpenCreate = () => {
    setKey('');
    setName('');
    setFieldType('TEXT');
    setIsRequired(false);
    setDefaultValue('');
    setOptionsStr('');
    setSortOrder(fields.length + 1);
    setOpenDialog(true);
  };

  const handleSaveField = async () => {
    if (!key.trim() || !name.trim()) {
      enqueueSnackbar('Заполните ключ и отображаемое название поля', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const options =
        fieldType === 'SELECT'
          ? optionsStr.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined;

      const res = await fetch('/api/eps/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: key.trim(),
          name: name.trim(),
          fieldType,
          isRequired,
          defaultValue: defaultValue.trim() || null,
          options,
          sortOrder: Number(sortOrder) || 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Кастомное поле успешно сохранено', { variant: 'success' });
        setOpenDialog(false);
        fetchFields();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogField) return;
    setDeleting(true);
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
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title="Конструктор кастомных полей оборудования"
        subtitle="Добавление произвольных технических параметров в паспорта оборудования без изменения программного кода"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Кастомные поля' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/eps')}
            >
              Назад к реестру
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Добавить поле
            </Button>
          </Box>
        }
      />

      {fields.length === 0 && !loading ? (
        <EmptyState
          paper
          icon={<TuneIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="Кастомные поля еще не созданы"
          description="Вы можете настроить дополнительные технические атрибуты, которые будут отображаться в паспортах оборудования."
          actionText="Создать первое поле"
          onAction={handleOpenCreate}
        />
      ) : (
        <DataTableWrapper
          loading={loading}
          total={fields.length}
          stickyHeader
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 80 }}>Порядок</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Отображаемое название</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Системный ключ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Тип данных</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Обязательное</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Значение по умолчанию / Варианты</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 100 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>{f.sortOrder}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{f.name}</TableCell>
                  <TableCell>
                    <Chip label={f.key} size="small" variant="outlined" sx={{ fontFamily: 'monospace', borderRadius: '4px' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={FIELD_TYPE_LABELS[f.fieldType] || f.fieldType} size="small" color="primary" variant="outlined" sx={{ borderRadius: '4px', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>{f.isRequired ? 'Да' : 'Нет'}</TableCell>
                  <TableCell>
                    {f.fieldType === 'SELECT' && f.options ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {f.options.map((opt, i) => (
                          <Chip key={i} label={opt} size="small" variant="outlined" sx={{ borderRadius: '4px' }} />
                        ))}
                      </Box>
                    ) : (
                      f.defaultValue || '—'
                    )}
                  </TableCell>
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteDialogField)}
        title="Удаление кастомного поля"
        message={`Вы действительно хотите удалить поле «${deleteDialogField?.name}»? Значения этого поля в паспортах оборудования будут недоступны.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialogField(null)}
      />

      {/* Create Field Dialog */}
      <FormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title="Добавление кастомного поля оборудования"
        icon={<TuneIcon color="primary" />}
        maxWidth="sm"
        loading={saving}
        submitLabel={saving ? 'Сохранение...' : 'Сохранить поле'}
        onSubmit={handleSaveField}
        submitDisabled={saving || !name || !key}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Отображаемое название"
            placeholder="например: Рабочее давление (бар)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            required
          />

          <TextField
            label="Системный ключ (латиницей)"
            placeholder="например: working_pressure_bar"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            fullWidth
            size="small"
            required
            helperText="Идентификатор поля в базе данных"
          />

          <TextField
            select
            label="Тип данных поля"
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
              label="Варианты выбора (через запятую)"
              placeholder="например: 10 бар, 16 бар, 25 бар, 40 бар"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              fullWidth
              size="small"
              helperText="Укажите доступные пункты для выпадающего списка"
            />
          )}

          {fieldType !== 'BOOLEAN' && (
            <TextField
              label="Значение по умолчанию"
              placeholder="например: 16"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              fullWidth
              size="small"
            />
          )}

          <TextField
            label="Порядковый номер сортировки"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            fullWidth
            size="small"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
            }
            label="Обязательно для заполнения при создании оборудования"
          />
        </Box>
      </FormDialog>
    </Box>
  );
}
