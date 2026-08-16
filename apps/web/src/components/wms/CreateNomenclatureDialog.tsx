'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  Button,
  Stack,
} from '@mui/material';
import { useSnackbar } from 'notistack';

interface CategoryOption {
  id: string;
  name: string;
}

interface CreateNomenclatureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (createdItem: { id: string; name: string; article?: string | null; unit: string }) => void;
  categories?: CategoryOption[];
}

export default function CreateNomenclatureDialog({
  open,
  onClose,
  onCreated,
  categories: initialCategories,
}: CreateNomenclatureDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [name, setName] = useState('');
  const [article, setArticle] = useState('');
  const [unit, setUnit] = useState('шт');
  const [categoryId, setCategoryId] = useState('');
  const [minStock, setMinStock] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
    } else if (open) {
      fetch('/api/wms/categories')
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setCategories(json.data);
        })
        .catch(console.error);
    }
  }, [open, initialCategories]);

  const handleReset = () => {
    setName('');
    setArticle('');
    setUnit('шт');
    setCategoryId('');
    setMinStock('');
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      enqueueSnackbar('Укажите наименование номенклатуры (ТМЦ)', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wms/nomenclature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          article: article.trim() || undefined,
          unit: unit.trim() || 'шт',
          categoryId: categoryId || undefined,
          minStock: minStock ? Number(minStock) : undefined,
          description: description.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Номенклатура успешно создана', { variant: 'success' });
        handleReset();
        onCreated(json.data);
        onClose();
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания номенклатуры', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при создании номенклатуры', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !isSubmitting && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Создание позиции номенклатуры (ТМЦ)</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            required
            label="Наименование номенклатуры"
            placeholder="например, Подшипник радиальный шариковый 6204 2RS"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Артикул / Заводской код"
                placeholder="BRG-6204-2RS"
                value={article}
                onChange={(e) => setArticle(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Единица измерения"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Категория"
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Минимальный остаток"
                placeholder="для контроля дефицита"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Описание / Применение"
            placeholder="Характеристики, область применения к узлам оборудования..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение...' : 'Создать номенклатуру'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
