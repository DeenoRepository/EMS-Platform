'use client';

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  CategoryOption,
  StorageCellOption,
  NomenclatureTypeItem,
  NOMENCLATURE_TYPES,
  SKU_RANDOM_BASE,
  SKU_RANDOM_RANGE,
  FONT_WEIGHT_BOLD,
  FONT_WEIGHT_SEMI,
  FONT_WEIGHT_NORMAL,
  PLACEHOLDER_SKU,
  PLACEHOLDER_NAME,
  CreatedNomenclatureResult,
} from './nomenclatureTypes';

export type {
  CategoryOption,
  StorageCellOption,
  NomenclatureTypeItem,
  CreatedNomenclatureResult,
};

export {
  NOMENCLATURE_TYPES,
  SKU_RANDOM_BASE,
  SKU_RANDOM_RANGE,
  FONT_WEIGHT_BOLD,
  FONT_WEIGHT_SEMI,
  FONT_WEIGHT_NORMAL,
  PLACEHOLDER_SKU,
  PLACEHOLDER_NAME,
};

function NomenclatureTypeButton({
  typeItem,
  isSelected,
  onSelect,
}: {
  typeItem: NomenclatureTypeItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Grid item xs={6} sm={2.4}>
      <Paper
        elevation={0}
        onClick={onSelect}
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
          {typeItem.icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: isSelected ? FONT_WEIGHT_BOLD : FONT_WEIGHT_NORMAL,
            color: isSelected ? 'primary.main' : 'text.primary',
            display: 'block',
            fontSize: '0.6875rem',
          }}
          noWrap
        >
          {typeItem.label}
        </Typography>
      </Paper>
    </Grid>
  );
}

export function NomenclatureTypePills({
  selectedType,
  onSelectType,
}: {
  selectedType: string;
  onSelectType: (type: string) => void;
}) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: FONT_WEIGHT_SEMI, display: 'block', mb: 1 }}>
        Тип товарно-материальной ценности:
      </Typography>
      <Grid container spacing={1}>
        {NOMENCLATURE_TYPES.map((t) => (
          <NomenclatureTypeButton
            key={t.id}
            typeItem={t}
            isSelected={selectedType === t.id}
            onSelect={() => onSelectType(t.id)}
          />
        ))}
      </Grid>
    </Box>
  );
}
export function NomenclatureNameField({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (val: string) => void;
}) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_SEMI, color: 'text.secondary', mb: 0.75, display: 'block' }}>
        Наименование номенклатуры <Box component="span" sx={{ color: 'error.main' }}>*</Box>
      </Typography>
      <TextField
        fullWidth
        required
        size="small"
        placeholder={PLACEHOLDER_NAME}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            fontSize: '0.875rem',
            backgroundColor: 'background.paper',
          },
        }}
      />
    </Box>
  );
}

function SkuInputField({
  article,
  onArticleChange,
  onGenerateSku,
}: {
  article: string;
  onArticleChange: (val: string) => void;
  onGenerateSku: () => void;
}) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_SEMI, color: 'text.secondary', mb: 0.75, display: 'block' }}>
        Артикул / Заводской код
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder={PLACEHOLDER_SKU}
        value={article}
        onChange={(e) => onArticleChange(e.target.value)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Сгенерировать артикул автоматически">
                <IconButton size="small" onClick={onGenerateSku} color="secondary">
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
  );
}

export function NomenclatureSkuAndUnit({
  article,
  onArticleChange,
  onGenerateSku,
  unit,
  onUnitChange,
}: {
  article: string;
  onArticleChange: (val: string) => void;
  onGenerateSku: () => void;
  unit: string;
  onUnitChange: (val: string) => void;
}) {
  return (
    <Grid container spacing={2}>
      <SkuInputField
        article={article}
        onArticleChange={onArticleChange}
        onGenerateSku={onGenerateSku}
      />
      <Grid item xs={12} sm={6}>
        <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_SEMI, color: 'text.secondary', mb: 0.75, display: 'block' }}>
          Ед. измерения <Box component="span" sx={{ color: 'error.main' }}>*</Box>
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
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
  );
}


function ReceiptQuantityInput({
  receiptQuantity,
  onQuantityChange,
  hasCells,
}: {
  receiptQuantity: string;
  onQuantityChange: (val: string) => void;
  hasCells: boolean;
}) {
  return (
    <Grid item xs={12} sm={hasCells ? 6 : 12}>
      <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_SEMI, color: 'text.secondary', mb: 0.75, display: 'block' }}>
        Количество к оприходованию <Box component="span" sx={{ color: 'error.main' }}>*</Box>
      </Typography>
      <TextField
        fullWidth
        size="small"
        type="number"
        value={receiptQuantity}
        onChange={(e) => onQuantityChange(e.target.value)}
        inputProps={{ min: 0.01, step: 'any' }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            fontSize: '0.875rem',
            backgroundColor: 'background.paper',
          },
        }}
      />
    </Grid>
  );
}

function ReceiptCellSelectInput({
  cells,
  receiptCellId,
  onCellChange,
}: {
  cells: StorageCellOption[];
  receiptCellId: string;
  onCellChange: (val: string) => void;
}) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_SEMI, color: 'text.secondary', mb: 0.75, display: 'block' }}>
        Целевая ячейка склада
      </Typography>
      <TextField
        select
        fullWidth
        size="small"
        value={receiptCellId}
        onChange={(e) => onCellChange(e.target.value)}
        SelectProps={{ displayEmpty: true }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            fontSize: '0.875rem',
            backgroundColor: 'background.paper',
          },
        }}
      >
        <MenuItem value=""><em>— Без ячейки —</em></MenuItem>
        {cells.map((cell) => (
          <MenuItem key={cell.id} value={cell.id}>
            {cell.code} {cell.name ? `— ${cell.name}` : ''} {cell.zoneName ? `(${cell.zoneName})` : ''}
          </MenuItem>
        ))}
      </TextField>
    </Grid>
  );
}

export function NomenclatureReceiptFields({
  warehouseName,
  cells,
  receiptQuantity,
  onQuantityChange,
  receiptCellId,
  onCellChange,
}: {
  warehouseName?: string;
  cells: StorageCellOption[];
  receiptQuantity: string;
  onQuantityChange: (val: string) => void;
  receiptCellId: string;
  onCellChange: (val: string) => void;
}) {
  const hasCells = Boolean(cells && cells.length > 0);

  return (
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
      <Typography variant="subtitle2" sx={{ fontWeight: FONT_WEIGHT_BOLD, color: 'success.dark', mb: 1.5 }}>
        Параметры оприходования в текущую операцию {warehouseName ? `(Склад: ${warehouseName})` : ''}
      </Typography>
      <Grid container spacing={2}>
        <ReceiptQuantityInput
          receiptQuantity={receiptQuantity}
          onQuantityChange={onQuantityChange}
          hasCells={hasCells}
        />
        {hasCells && (
          <ReceiptCellSelectInput
            cells={cells}
            receiptCellId={receiptCellId}
            onCellChange={onCellChange}
          />
        )}
      </Grid>
    </Paper>
  );
}

function CategorySelectField({
  categoryId,
  onCategoryChange,
  categories,
}: {
  categoryId: string;
  onCategoryChange: (id: string) => void;
  categories: CategoryOption[];
}) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_SEMI, color: 'text.secondary', mb: 0.75, display: 'block' }}>
        Товарная группа / Категория
      </Typography>
      <TextField
        select
        fullWidth
        size="small"
        value={categoryId}
        onChange={(e) => onCategoryChange(e.target.value)}
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
          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
        ))}
      </TextField>
    </Grid>
  );
}

function MinStockField({
  minStock,
  onMinStockChange,
}: {
  minStock: string;
  onMinStockChange: (val: string) => void;
}) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_SEMI, color: 'text.secondary', mb: 0.75, display: 'block' }}>
        Мин. остаток (норматив)
      </Typography>
      <TextField
        fullWidth
        size="small"
        type="number"
        placeholder="0"
        value={minStock}
        onChange={(e) => onMinStockChange(e.target.value)}
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
  );
}

export function NomenclatureCategoryAndStock({
  categoryId,
  onCategoryChange,
  categories,
  minStock,
  onMinStockChange,
}: {
  categoryId: string;
  onCategoryChange: (id: string) => void;
  categories: CategoryOption[];
  minStock: string;
  onMinStockChange: (val: string) => void;
}) {
  return (
    <Grid container spacing={2}>
      <CategorySelectField
        categoryId={categoryId}
        onCategoryChange={onCategoryChange}
        categories={categories}
      />
      <MinStockField
        minStock={minStock}
        onMinStockChange={onMinStockChange}
      />
    </Grid>
  );
}

export function NomenclatureDescriptionField({
  description,
  onDescriptionChange,
}: {
  description: string;
  onDescriptionChange: (val: string) => void;
}) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT_SEMI, color: 'text.secondary', mb: 0.75, display: 'block' }}>
        Описание / Спецификация
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={2.5}
        size="small"
        placeholder="Технические характеристики, совместимые узлы оборудования..."
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            fontSize: '0.875rem',
            backgroundColor: 'background.paper',
          },
        }}
      />
    </Box>
  );
}

