'use client';

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import { FormDialog } from '@/components/ui';

export interface CustomFieldItem {
  id: string;
  sectionId: string | null;
  key: string;
  name: string;
  fieldType: string;
  unit: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options: string[] | null;
  sortOrder: number;
}

export interface CustomSectionItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldItem[];
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Текстовое поле',
  TEXTAREA: 'Многострочный текст',
  NUMBER: 'Числовое значение',
  DATE: 'Дата',
  SELECT: 'Выпадающий список',
  BOOLEAN: 'Флаг (Да/Нет)',
};

const PRESET_COLORS = [
  'primary.main',
  'secondary.main',
  'success.main',
  'warning.main',
  'error.main',
  'secondary.main',
  'secondary.main',
  'text.secondary',
];

interface SectionDialogProps {
  open: boolean;
  editingId: string | null;
  name: string;
  code: string;
  desc: string;
  icon: string;
  sort: number;
  saving: boolean;
  onClose: () => void;
  onNameChange: (val: string) => void;
  onCodeChange: (val: string) => void;
  onDescChange: (val: string) => void;
  onIconChange: (val: string) => void;
  onSortChange: (val: number) => void;
  onSave: () => Promise<void>;
}

export function SectionDialog({
  open,
  editingId,
  name,
  code,
  desc,
  icon,
  sort,
  saving,
  onClose,
  onNameChange,
  onCodeChange,
  onDescChange,
  onIconChange,
  onSortChange,
  onSave,
}: SectionDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editingId ? 'Редактирование технического раздела' : 'Создание технического раздела'}
      maxWidth="sm"
      loading={saving}
      submitLabel={saving ? 'Сохранение...' : 'Сохранить раздел'}
      onSubmit={onSave}
      submitDisabled={saving || !name}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <TextField
          label="Отображаемое название раздела"
          placeholder="например: Электротехнические характеристики"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          fullWidth
          size="small"
          required
        />
        {!editingId && (
          <TextField
            label="Системный код (латиницей)"
            placeholder="например: electrical_characteristics"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            fullWidth
            size="small"
            helperText="Оставьте пустым для автогенерации из названия"
          />
        )}
        <TextField
          label="Краткое описание"
          placeholder="Параметры мощности, напряжения, питающей сети"
          value={desc}
          onChange={(e) => onDescChange(e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={2}
        />
        <TextField
          select
          label="Иконка раздела"
          value={icon}
          onChange={(e) => onIconChange(e.target.value)}
          fullWidth
          size="small"
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="Category">Классификаторы / ОКОФ (Категория)</MenuItem>
          <MenuItem value="Speed">Состояние / Износ (Спидометр)</MenuItem>
          <MenuItem value="Shield">Регламент / Надежность (Щит)</MenuItem>
          <MenuItem value="Engineering">ТОиР / Инженерия (Инструменты)</MenuItem>
          <MenuItem value="Bolt">Электричество (Молния)</MenuItem>
          <MenuItem value="WaterDrop">Гидравлика / Среда (Капля)</MenuItem>
          <MenuItem value="Straighten">Габариты / Размеры (Линейка)</MenuItem>
        </TextField>
        <TextField
          label="Порядковый номер сортировки"
          type="number"
          value={sort}
          onChange={(e) => onSortChange(Number(e.target.value))}
          fullWidth
          size="small"
        />
      </Box>
    </FormDialog>
  );
}

interface FieldDialogProps {
  open: boolean;
  sections: CustomSectionItem[];
  targetSectionId: string;
  fieldKey: string;
  name: string;
  fieldType: string;
  unit: string;
  isRequired: boolean;
  defaultValue: string;
  optionsStr: string;
  sortOrder: number;
  saving: boolean;
  onClose: () => void;
  onTargetSectionIdChange: (val: string) => void;
  onFieldKeyChange: (val: string) => void;
  onNameChange: (val: string) => void;
  onFieldTypeChange: (val: string) => void;
  onUnitChange: (val: string) => void;
  onIsRequiredChange: (val: boolean) => void;
  onDefaultValueChange: (val: string) => void;
  onOptionsStrChange: (val: string) => void;
  onSortOrderChange: (val: number) => void;
  onSave: () => Promise<void>;
}

export function FieldDialog({
  open,
  sections,
  targetSectionId,
  fieldKey,
  name,
  fieldType,
  unit,
  isRequired,
  defaultValue,
  optionsStr,
  sortOrder,
  saving,
  onClose,
  onTargetSectionIdChange,
  onFieldKeyChange,
  onNameChange,
  onFieldTypeChange,
  onUnitChange,
  onIsRequiredChange,
  onDefaultValueChange,
  onOptionsStrChange,
  onSortOrderChange,
  onSave,
}: FieldDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Добавление технического параметра в паспорт"
      maxWidth="sm"
      loading={saving}
      submitLabel={saving ? 'Сохранение...' : 'Сохранить параметр'}
      onSubmit={onSave}
      submitDisabled={saving || !name || !fieldKey}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <TextField
          select
          label="Целевой раздел паспорта"
          value={targetSectionId}
          onChange={(e) => onTargetSectionIdChange(e.target.value)}
          fullWidth
          size="small"
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="">— Общий (без раздела) —</MenuItem>
          {sections.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Отображаемое наименование параметра"
          placeholder="например: Номинальная мощность"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          fullWidth
          size="small"
          required
        />

        <TextField
          label="Системный ключ (латиницей)"
          placeholder="например: nominal_power_kw"
          value={fieldKey}
          onChange={(e) => onFieldKeyChange(e.target.value)}
          fullWidth
          size="small"
          required
          helperText="Идентификатор параметра в структуре паспорта оборудования"
        />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={7}>
            <TextField
              select
              label="Тип данных"
              value={fieldType}
              onChange={(e) => onFieldTypeChange(e.target.value)}
              fullWidth
              size="small"
              SelectProps={{ displayEmpty: true }}
            >
              {Object.entries(FIELD_TYPE_LABELS).map(([k, label]) => (
                <MenuItem key={k} value={k}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={5}>
            <TextField
              label="Единица изм."
              placeholder="кВт, бар, В, кг, мм"
              value={unit}
              onChange={(e) => onUnitChange(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>

        {fieldType === 'SELECT' && (
          <TextField
            label="Варианты (через запятую)"
            placeholder="220 В, 380 В, 6 кВ, 10 кВ"
            value={optionsStr}
            onChange={(e) => onOptionsStrChange(e.target.value)}
            fullWidth
            size="small"
          />
        )}

        {fieldType !== 'BOOLEAN' && fieldType !== 'TEXTAREA' && (
          <TextField
            label="Значение по умолчанию"
            value={defaultValue}
            onChange={(e) => onDefaultValueChange(e.target.value)}
            fullWidth
            size="small"
          />
        )}

        <TextField
          label="Порядковый номер внутри раздела"
          type="number"
          value={sortOrder}
          onChange={(e) => onSortOrderChange(Number(e.target.value))}
          fullWidth
          size="small"
        />

        <FormControlLabel
          control={<Checkbox checked={isRequired} onChange={(e) => onIsRequiredChange(e.target.checked)} />}
          label="Обязательно для заполнения в паспорте"
        />
      </Box>
    </FormDialog>
  );
}

interface TagDialogProps {
  open: boolean;
  tagName: string;
  tagColor: string;
  saving: boolean;
  onClose: () => void;
  onTagNameChange: (val: string) => void;
  onTagColorChange: (val: string) => void;
  onSave: () => Promise<void>;
}

export function TagDialog({
  open,
  tagName,
  tagColor,
  saving,
  onClose,
  onTagNameChange,
  onTagColorChange,
  onSave,
}: TagDialogProps) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Создание классификатора / метки"
      maxWidth="xs"
      loading={saving}
      submitLabel={saving ? 'Создание...' : 'Создать метку'}
      onSubmit={onSave}
      submitDisabled={saving || !tagName}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <TextField
          label="Наименование метки"
          placeholder="например: Взрывозащищенное"
          value={tagName}
          onChange={(e) => onTagNameChange(e.target.value)}
          fullWidth
          size="small"
          required
        />
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Цвет метки:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((color) => (
              <Box
                key={color}
                onClick={() => onTagColorChange(color)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: tagColor === color ? '3px solid text.primary' : '2px solid transparent',
                  transition: 'transform 0.1s ease',
                  '&:hover': { transform: 'scale(1.15)' },
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </FormDialog>
  );
}
