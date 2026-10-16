'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  InputAdornment,
  Paper,
  Tooltip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useSnackbar } from 'notistack';
import {
  DataTableWrapper,
  StatusBadge,
  ConfirmDialog,
  PageLoading,
  EmptyState,
} from '@/components/ui';

export interface CatalogFieldItem {
  id: string;
  key: string;
  name: string;
  fieldType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT';
  unit: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options: string[] | null;
  sectionId: string | null;
  section?: {
    id: string;
    name: string;
  } | null;
}

export function EquipmentFieldsCatalogView() {
  const { enqueueSnackbar } = useSnackbar();
  const [fields, setFields] = useState<CatalogFieldItem[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldKey, setFieldKey] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT'>('TEXT');
  const [fieldUnit, setFieldUnit] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [optionsStr, setOptionsStr] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; field: CatalogFieldItem | null }>({
    open: false,
    field: null,
  });

  const loadCatalogData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [fieldsRes, sectionsRes] = await Promise.all([
        fetch('/api/eps/custom-fields'),
        fetch('/api/eps/custom-sections'),
      ]);

      const fieldsJson = await fieldsRes.json();
      const sectionsJson = await sectionsRes.json();

      if (fieldsJson.success) {
        setFields(fieldsJson.data || []);
      }
      if (sectionsJson.success && sectionsJson.data?.sections) {
        setSections(sectionsJson.data.sections);
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки справочника полей', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  const handleOpenCreate = () => {
    setEditingFieldId(null);
    setFieldKey('');
    setFieldName('');
    setFieldType('TEXT');
    setFieldUnit('');
    setTargetSectionId('');
    setIsRequired(false);
    setDefaultValue('');
    setOptionsStr('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (f: CatalogFieldItem) => {
    setEditingFieldId(f.id);
    setFieldKey(f.key);
    setFieldName(f.name);
    setFieldType(f.fieldType);
    setFieldUnit(f.unit || '');
    setTargetSectionId(f.sectionId || '');
    setIsRequired(Boolean(f.isRequired));
    setDefaultValue(f.defaultValue || '');
    setOptionsStr(f.options ? f.options.join(', ') : '');
    setDialogOpen(true);
  };

  const handleSaveField = async () => {
    if (!fieldKey.trim() || !fieldName.trim()) {
      enqueueSnackbar('Заполните системный ключ и название поля', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(editingFieldId ? { id: editingFieldId } : {}),
        key: fieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        name: fieldName.trim(),
        fieldType,
        unit: fieldUnit.trim() || null,
        sectionId: targetSectionId || null,
        isRequired,
        defaultValue: defaultValue.trim() || null,
        options: fieldType === 'SELECT' && optionsStr ? optionsStr.split(',').map((s) => s.trim()).filter(Boolean) : null,
      };

      const res = await fetch('/api/eps/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        enqueueSnackbar('Поле успешно сохранено в справочнике', { variant: 'success' });
        setDialogOpen(false);
        loadCatalogData();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения поля', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при сохранении', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async () => {
    if (!deleteConfirm.field) return;
    try {
      const res = await fetch(`/api/eps/custom-fields?id=${deleteConfirm.field.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        enqueueSnackbar('Поле удалено из справочника', { variant: 'info' });
        setDeleteConfirm({ open: false, field: null });
        loadCatalogData();
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления поля', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при удалении', { variant: 'error' });
    }
  };

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return fields;
    const q = searchQuery.toLowerCase().trim();
    return fields.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        (f.unit && f.unit.toLowerCase().includes(q)) ||
        (f.section?.name && f.section.name.toLowerCase().includes(q))
    );
  }, [fields, searchQuery]);

  return (
    <Card sx={{ mb: 3, borderRadius: '12px' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MenuBookIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Справочник полей паспорта оборудования
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Единый каталог полей и характеристик. Из этих полей формируются разделы паспорта, и к ним привязываются колонки при импорте.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Поиск по названию или ключу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 260 }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{ borderRadius: '8px', fontWeight: 600 }}
            >
              Создать поле в справочнике
            </Button>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2.5, borderRadius: '8px' }}>
          Поля из этого справочника можно включать в любые технические разделы паспорта оборудования. При загрузке внешней таблицы (Excel/CSV) эти поля автоматически предлагаются для сопоставления колонок.
        </Alert>

        {loading ? (
          <PageLoading text="Загрузка справочника полей..." minHeight={160} size={28} />
        ) : filteredFields.length === 0 ? (
          <EmptyState
            title="Поля не найдены"
            description={searchQuery ? 'По вашему запросу ничего не найдено.' : 'В справочнике пока нет полей. Создайте первое поле или восстановите типовые разделы.'}
            actionText="Создать поле"
            onAction={handleOpenCreate}
            minHeight={160}
          />
        ) : (
          <DataTableWrapper total={filteredFields.length} stickyHeader>
            <Table size="small" aria-label="Справочник полей оборудования">
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700 }}>Название поля</TableCell>
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, width: 180 }}>Системный ключ</TableCell>
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, width: 140 }}>Тип данных</TableCell>
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, width: 90 }}>Ед. изм.</TableCell>
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, width: 220 }}>Раздел паспорта</TableCell>
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, width: 110 }}>Обязательное</TableCell>
                  <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, width: 90 }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFields.map((f) => (
                  <TableRow key={f.id} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{f.name}</span>
                        {f.isRequired && (
                          <Typography component="span" sx={{ color: 'error.main', fontWeight: 700, fontSize: '0.875rem' }}>
                            *
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={f.key} size="small" variant="outlined" sx={{ fontFamily: 'monospace', borderRadius: '4px', height: 20 }} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={f.fieldType} label={f.fieldType} size="small" />
                    </TableCell>
                    <TableCell>
                      {f.unit ? <Chip label={f.unit} size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: '4px', height: 20 }} /> : '—'}
                    </TableCell>
                    <TableCell>
                      {f.section ? (
                        <Chip label={f.section.name} size="small" color="primary" variant="outlined" sx={{ borderRadius: '4px', height: 22, fontSize: '0.75rem' }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          — Не привязано к разделу —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {f.isRequired ? (
                        <Chip label="Да *" size="small" color="error" variant="filled" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                      ) : (
                        'Нет'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleOpenEdit(f)} title="Редактировать поле">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ open: true, field: f })} title="Удалить поле">
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

        {/* Modal: Create/Edit Field */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '14px',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.15)',
              maxHeight: 'calc(100vh - 64px)',
              m: { xs: 1.5, sm: 3 },
            },
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MenuBookIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                {editingFieldId ? 'Редактирование поля справочника' : 'Новое поле справочника'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3, pt: '24px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Системный ключ поля (slug) *"
              placeholder="например: power_kw, serialNumber, operating_pressure"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              fullWidth
              size="small"
              required
              helperText="Используется в базе данных и для связывания при импорте (только английские буквы и подчеркивания)"
            />

            <TextField
              label="Наименование поля *"
              placeholder="например: Номинальная мощность"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              fullWidth
              size="small"
              required
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="Тип данных"
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as any)}
                fullWidth
                size="small"
              >
                <MenuItem value="TEXT">Текст</MenuItem>
                <MenuItem value="NUMBER">Число</MenuItem>
                <MenuItem value="BOOLEAN">Логический (Да / Нет)</MenuItem>
                <MenuItem value="DATE">Дата</MenuItem>
                <MenuItem value="SELECT">Список выбора</MenuItem>
              </TextField>

              <TextField
                label="Единица измерения"
                placeholder="кВт, МПа, В, шт."
                value={fieldUnit}
                onChange={(e) => setFieldUnit(e.target.value)}
                fullWidth
                size="small"
              />
            </Box>

            <TextField
              select
              label="Привязать к разделу паспорта (необязательно)"
              value={targetSectionId}
              onChange={(e) => setTargetSectionId(e.target.value)}
              fullWidth
              size="small"
              helperText="Если раздел выбран, поле появится в соответствующем блоке паспорта оборудования"
            >
              <MenuItem value="">— Без привязки к разделу (только в справочнике) —</MenuItem>
              {sections.map((sec) => (
                <MenuItem key={sec.id} value={sec.id}>
                  {sec.name}
                </MenuItem>
              ))}
            </TextField>

            {fieldType === 'SELECT' && (
              <TextField
                label="Варианты выбора (через запятую)"
                placeholder="Категория A, Категория B, Категория C"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                fullWidth
                size="small"
              />
            )}

            <FormControlLabel
              control={<Switch checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} color="primary" />}
              label="Обязательное поле для паспорта оборудования"
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 1.75, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Button onClick={() => setDialogOpen(false)} color="inherit" size="small">
              Отмена
            </Button>
            <Button variant="contained" size="small" onClick={handleSaveField} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить поле'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          open={deleteConfirm.open}
          title="Удаление поля из справочника"
          message={`Удалить поле «${deleteConfirm.field?.name}» (${deleteConfirm.field?.key})? Если поле было добавлено в раздел паспорта, оно перестанет там отображаться.`}
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          onConfirm={handleDeleteField}
          onClose={() => setDeleteConfirm({ open: false, field: null })}
        />
      </CardContent>
    </Card>
  );
}

export default EquipmentFieldsCatalogView;
