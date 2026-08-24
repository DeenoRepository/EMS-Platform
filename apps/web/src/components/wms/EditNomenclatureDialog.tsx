'use client';

import React, { useState, useEffect } from 'react';
import {
  TextField,
  Grid,
  MenuItem,
  Stack,
  Box,
  Typography,
  Paper,
  InputAdornment,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { useSnackbar } from 'notistack';
import { FormDialog } from '@/components/ui';

interface CategoryOption {
  id: string;
  name: string;
}

export interface EditNomenclatureItem {
  id: string;
  nomenclatureId?: string;
  name: string;
  article?: string | null;
  unit?: string;
  category?: string | null;
  categoryId?: string | null;
  minStock?: number | string | null;
  description?: string | null;
}

interface EditNomenclatureDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (updatedItem: any) => void;
  item: EditNomenclatureItem | null;
}

export default function EditNomenclatureDialog({
  open,
  onClose,
  onSaved,
  item,
}: EditNomenclatureDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [name, setName] = useState('');
  const [article, setArticle] = useState('');
  const [unit, setUnit] = useState('шт');
  const [categoryId, setCategoryId] = useState('');
  const [minStock, setMinStock] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && item) {
      setName(item.name || '');
      setArticle(item.article && item.article !== '—' ? item.article : '');
      setUnit(item.unit || 'шт');
      setCategoryId(item.categoryId || '');
      setMinStock(item.minStock !== undefined && item.minStock !== null && item.minStock !== '—' ? String(item.minStock) : '');
      setDescription(item.description || '');

      // Load categories
      fetch('/api/wms/categories')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setCategories(json.data);
            if (!item.categoryId && item.category) {
              const matched = json.data.find((c: CategoryOption) => c.name === item.category);
              if (matched) setCategoryId(matched.id);
            }
          }
        })
        .catch(console.error);
    }
  }, [open, item]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      enqueueSnackbar('Введите наименование ТМЦ', { variant: 'warning' });
      return;
    }

    const targetId = item?.nomenclatureId || item?.id;
    if (!targetId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/wms/nomenclature/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          article: article.trim() || null,
          unit: unit.trim() || 'шт',
          categoryId: categoryId || null,
          minStock: minStock !== '' ? Number(minStock) : null,
          description: description.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Карточка ТМЦ успешно обновлена', { variant: 'success' });
        onSaved(json.data);
        onClose();
      } else {
        enqueueSnackbar(json.error || 'Ошибка при сохранении изменений', { variant: 'error' });
      }
    } catch (e) {
      enqueueSnackbar('Ошибка сети при сохранении', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Редактирование карточки ТМЦ"
      subtitle="Изменение параметров номенклатурной позиции, модели и лимитов"
      submitLabel="Сохранить изменения"
      loading={isSubmitting}
      onSubmit={handleSubmit}
      maxWidth="sm"
    >
      <Stack spacing={2.5}>
        <TextField
          label="Наименование ТМЦ / Материала"
          required
          fullWidth
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Подшипник 623ZZ, Сверло 4.8мм"
          helperText="Полное наименование номенклатуры для отображения в реестрах и накладных"
        />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Артикул / Модель"
              fullWidth
              size="small"
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              placeholder="Например: 623ZZ, КУТ61-35-100-15"
              helperText="Уникальный заводской артикул или модель"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Единица измерения"
              required
              fullWidth
              size="small"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="шт, кг, м, л, компл"
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={7}>
            <TextField
              select
              label="Товарная группа / Категория"
              fullWidth
              size="small"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <MenuItem value="">Без категории</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              label="Мин. остаток (норматив)"
              fullWidth
              size="small"
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="0"
              helperText="Порог для оповещения о дефиците"
            />
          </Grid>
        </Grid>

        <TextField
          label="Описание / Спецификация"
          fullWidth
          multiline
          rows={2}
          size="small"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Дополнительные характеристики, завод-изготовитель, параметры..."
        />
      </Stack>
    </FormDialog>
  );
}
