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
  IconButton,
  Tooltip,
} from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useSnackbar } from 'notistack';
import { FormDialog } from '@/components/ui';

interface CategoryOption {
  id: string;
  name: string;
}

interface CreateNomenclatureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (createdItem: { id: string; name: string; article?: string | null; unit: string; category?: { name: string } | null }) => void;
  categories?: CategoryOption[];
  initialName?: string;
  initialType?: string;
}

const NOMENCLATURE_TYPES = [
  { id: 'SPARE_PART', label: 'Запчасть', icon: <PrecisionManufacturingIcon sx={{ fontSize: 18 }} />, prefix: 'SP' },
  { id: 'CONSUMABLE', label: 'Расходник', icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />, prefix: 'CS' },
  { id: 'TOOL', label: 'Инструмент', icon: <BuildOutlinedIcon sx={{ fontSize: 18 }} />, prefix: 'TL' },
  { id: 'LUBRICANT', label: 'Масла/ГСМ', icon: <ScienceOutlinedIcon sx={{ fontSize: 18 }} />, prefix: 'LB' },
  { id: 'PPE', label: 'СИЗ', icon: <SecurityOutlinedIcon sx={{ fontSize: 18 }} />, prefix: 'PPE' },
];

export default function CreateNomenclatureDialog({
  open,
  onClose,
  onCreated,
  categories: initialCategories,
  initialName = '',
  initialType = 'SPARE_PART',
}: CreateNomenclatureDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [selectedType, setSelectedType] = useState(initialType);
  const [name, setName] = useState(initialName);
  const [article, setArticle] = useState('');
  const [unit, setUnit] = useState('шт');
  const [categoryId, setCategoryId] = useState('');
  const [minStock, setMinStock] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialName) setName(initialName);
      if (initialType) setSelectedType(initialType);
    }
  }, [open, initialName, initialType]);

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
    setSelectedType('SPARE_PART');
    setName('');
    setArticle('');
    setUnit('шт');
    setCategoryId('');
    setMinStock('');
    setDescription('');
  };

  const handleGenerateSku = () => {
    const typeObj = NOMENCLATURE_TYPES.find((t) => t.id === selectedType) || NOMENCLATURE_TYPES[0];
    const rand = Math.floor(1000 + Math.random() * 9000);
    const sku = `${typeObj.prefix}-${rand}`;
    setArticle(sku);
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
    } catch {
      enqueueSnackbar('Ошибка сети при создании номенклатуры', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Создание позиции номенклатуры (ТМЦ)"
      subtitle="Регистрация новой позиции в справочнике запасных частей и материалов"
      icon={<Inventory2OutlinedIcon color="primary" />}
      maxWidth="sm"
      loading={isSubmitting}
      submitLabel={isSubmitting ? 'Сохранение...' : 'Создать номенклатуру'}
      onSubmit={handleSubmit}
      submitDisabled={isSubmitting || !name.trim()}
    >
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {/* Type Selector Pills */}
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1 }}>
            Тип товарно-материальной ценности:
          </Typography>
          <Grid container spacing={1}>
            {NOMENCLATURE_TYPES.map((t) => {
              const isSelected = selectedType === t.id;
              return (
                <Grid item xs={6} sm={2.4} key={t.id}>
                  <Paper
                    elevation={0}
                    onClick={() => setSelectedType(t.id)}
                    sx={{
                      p: 1,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isSelected ? '#0284c7' : '#e2e8f0',
                      bgcolor: isSelected ? 'rgba(2, 132, 199, 0.08)' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: '#0284c7',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Box sx={{ color: isSelected ? '#0284c7' : '#64748b', display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                      {t.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#0284c7' : '#334155',
                        display: 'block',
                        fontSize: '0.6875rem',
                      }}
                      noWrap
                    >
                      {t.label}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Nomenclature Name */}
        <TextField
          fullWidth
          required
          label="Наименование номенклатуры"
          placeholder="например, Подшипник радиальный шариковый 6204 2RS"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* SKU & Unit */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Артикул / Заводской код"
              placeholder="BRG-6204-2RS"
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Сгенерировать артикул автоматически">
                      <IconButton size="small" onClick={handleGenerateSku} sx={{ color: '#7c3aed' }}>
                        <AutoAwesomeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ед. измерения"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="шт, м, л, кг"
            />
          </Grid>
        </Grid>

        {/* Category & Min Stock */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Категория"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <MenuItem value="">
                <em>— Без категории —</em>
              </MenuItem>
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
              label="Неснижаемый остаток"
              placeholder="Контроль дефицита"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>

        {/* Description */}
        <TextField
          fullWidth
          multiline
          rows={2.5}
          label="Описание / Область применения"
          placeholder="Технические характеристики, совместимые узлы оборудования..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Stack>
    </FormDialog>
  );
}
