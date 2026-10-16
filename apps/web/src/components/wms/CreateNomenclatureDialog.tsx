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

export interface StorageCellOption {
  id: string;
  code: string;
  name?: string | null;
  zoneName?: string;
}

export interface CreatedNomenclatureResult {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  category?: { name: string } | null;
  initialQuantity?: number;
  initialCellId?: string | null;
}

interface CreateNomenclatureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (createdItem: CreatedNomenclatureResult) => void;
  categories?: CategoryOption[];
  initialName?: string;
  initialType?: string;
  showReceiptFields?: boolean;
  warehouseName?: string;
  cells?: StorageCellOption[];
  initialQuantity?: number;
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
  showReceiptFields = false,
  warehouseName,
  cells = [],
  initialQuantity = 1,
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
  const [receiptQuantity, setReceiptQuantity] = useState<string>(String(initialQuantity || '1'));
  const [receiptCellId, setReceiptCellId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialName) setName(initialName);
      if (initialType) setSelectedType(initialType);
      if (initialQuantity) setReceiptQuantity(String(initialQuantity));
      setReceiptCellId('');
    }
  }, [open, initialName, initialType, initialQuantity]);

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
    setReceiptQuantity('1');
    setReceiptCellId('');
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
        onCreated({
          ...json.data,
          initialQuantity: showReceiptFields ? parseFloat(receiptQuantity) || 1 : undefined,
          initialCellId: showReceiptFields ? receiptCellId || null : undefined,
        });
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
      maxWidth="md"
      loading={isSubmitting}
      submitLabel={isSubmitting ? 'Сохранение...' : 'Создать номенклатуру'}
      onSubmit={handleSubmit}
      submitDisabled={isSubmitting || !name.trim()}
    >
      <Stack spacing={2}>
        {/* Type Selector Pills */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
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
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'action.hover' : 'background.paper',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Box sx={{ color: isSelected ? 'primary.main' : 'text.secondary', display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                      {t.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'primary.main' : 'text.primary',
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
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
            Наименование номенклатуры <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <TextField
            fullWidth
            required
            size="small"
            placeholder="например, Подшипник радиальный шариковый 6204 2RS"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: '0.875rem',
                backgroundColor: 'background.paper',
              },
            }}
          />
        </Box>

        {/* SKU & Unit */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
              Артикул / Заводской код
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="BRG-6204-2RS"
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Сгенерировать артикул автоматически">
                      <IconButton size="small" onClick={handleGenerateSku} color="secondary">
                        <AutoAwesomeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  backgroundColor: 'background.paper',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
              Ед. измерения <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="шт, м, л, кг, компл"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  backgroundColor: 'background.paper',
                },
              }}
            />
          </Grid>
        </Grid>

        {/* Блок оприходования (отображается при вызове из мастера прихода) */}
        {showReceiptFields && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'success.light',
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.dark', mb: 1.5 }}>
              Параметры оприходования в текущую операцию {warehouseName ? `(Склад: ${warehouseName})` : ''}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={cells && cells.length > 0 ? 6 : 12}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
                  Количество к оприходованию <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={receiptQuantity}
                  onChange={(e) => setReceiptQuantity(e.target.value)}
                  inputProps={{ min: 0.01, step: 'any' }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {unit || 'шт'}
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  helperText="Будет сразу добавлено в позиции операции с указанным количеством"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: 'background.paper',
                    },
                  }}
                />
              </Grid>
              {cells && cells.length > 0 && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
                    Целевая ячейка склада
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={receiptCellId}
                    onChange={(e) => setReceiptCellId(e.target.value)}
                    helperText="Закрепляет адрес хранения при приходе"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        backgroundColor: 'background.paper',
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>— Без ячейки —</em>
                    </MenuItem>
                    {cells.map((cell) => (
                      <MenuItem key={cell.id} value={cell.id}>
                        {cell.code} {cell.name ? `— ${cell.name}` : ''} {cell.zoneName ? `(${cell.zoneName})` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Category & Min Stock */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
              Товарная группа / Категория
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              SelectProps={{ displayEmpty: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  backgroundColor: 'background.paper',
                },
              }}
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
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
              Мин. остаток (норматив)
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              placeholder="0"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              inputProps={{ min: 0 }}
              helperText="Порог контроля дефицита"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  backgroundColor: 'background.paper',
                },
                '& .MuiFormHelperText-root': {
                  fontSize: '0.75rem',
                  mt: 0.5,
                },
              }}
            />
          </Grid>
        </Grid>

        {/* Description */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
            Описание / Спецификация
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2.5}
            size="small"
            placeholder="Технические характеристики, совместимые узлы оборудования..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: '0.875rem',
                backgroundColor: 'background.paper',
              },
            }}
          />
        </Box>
      </Stack>
    </FormDialog>
  );
}
