'use client';

import React from 'react';
import {
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export const NOMENCLATURE_FETCH_LIMIT = Number('500');
export const STOCK_FETCH_PAGE_SIZE = Number('1000');
export const FONT_WEIGHT_BOLD = Number('700');
export const FONT_WEIGHT_MEDIUM = Number('600');
export const TABLE_COL_WIDTH_STOCK = Number('140');

export interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  responsibleUserId?: string | null;
  responsibleUser?: { displayName: string } | null;
}

export interface NomenclatureOption {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  category?: { name: string } | null;
}

export interface RequestLineItem {
  nomenclatureId: string;
  nomenclatureName: string;
  nomenclatureArticle?: string;
  unit: string;
  quantity: number;
}

export interface TransferWarehouseFieldsProps {
  targetWh?: WarehouseOption | null;
  sourceWarehouseId: string;
  onSourceChange: (id: string) => void;
  warehouses: WarehouseOption[];
  displayName?: string;
  requestReason: string;
  onReasonChange: (reason: string) => void;
}

function TargetWarehouseCard({
  targetWh,
  displayName,
}: {
  targetWh?: WarehouseOption | null;
  displayName?: string;
}) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: FONT_WEIGHT_BOLD,
          display: 'block',
          mb: 0.75,
          textTransform: 'uppercase',
        }}
      >
        Склад назначения (Ваш склад):
      </Typography>
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: FONT_WEIGHT_BOLD, color: 'text.primary' }}>
          {targetWh ? `${targetWh.name} (${targetWh.code})` : 'Определение склада...'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          МОЛ: <b>{displayName || 'Вы'}</b>
        </Typography>
      </Paper>
    </Grid>
  );
}

function SourceWarehouseSelect({
  sourceWarehouseId,
  onSourceChange,
  warehouses,
  targetWh,
}: {
  sourceWarehouseId: string;
  onSourceChange: (id: string) => void;
  warehouses: WarehouseOption[];
  targetWh?: WarehouseOption | null;
}) {
  const donorWarehouses = warehouses.filter((w) => w.id !== targetWh?.id);

  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: FONT_WEIGHT_BOLD, display: 'block', mb: 0.75, textTransform: 'uppercase' }}>
        Склад-донор (Откуда запросить ТМЦ):
      </Typography>
      <TextField
        select
        fullWidth
        size="small"
        required
        value={sourceWarehouseId}
        onChange={(e) => onSourceChange(e.target.value)}
        SelectProps={{ displayEmpty: true }}
      >
        <MenuItem value=""><em>— Выберите склад-донор —</em></MenuItem>
        {donorWarehouses.map((w) => (
          <MenuItem key={w.id} value={w.id}>
            {w.name} ({w.code}) {w.responsibleUser?.displayName ? `— МОЛ: ${w.responsibleUser.displayName}` : ''}
          </MenuItem>
        ))}
      </TextField>
    </Grid>
  );
}

/**
 * Подкомпонент выбора складов и обоснования заявки
 */
export function TransferWarehouseFields({
  targetWh,
  sourceWarehouseId,
  onSourceChange,
  warehouses,
  displayName,
  requestReason,
  onReasonChange,
}: TransferWarehouseFieldsProps) {
  return (
    <Grid container spacing={2}>
      <TargetWarehouseCard targetWh={targetWh} displayName={displayName} />
      <SourceWarehouseSelect
        sourceWarehouseId={sourceWarehouseId}
        onSourceChange={onSourceChange}
        warehouses={warehouses}
        targetWh={targetWh}
      />
      <Grid item xs={12}>
        <TextField
          fullWidth
          size="small"
          label="Обоснование / причина запроса (необязательно)"
          placeholder="Например: Срочная потребность для ТОиР токарного станка, пополнение неснижаемого остатка..."
          value={requestReason}
          onChange={(e) => onReasonChange(e.target.value)}
        />
      </Grid>
    </Grid>
  );
}

export interface TransferItemPickerProps {
  nomenclatures: NomenclatureOption[];
  selectedNomenclature: NomenclatureOption | null;
  onNomenclatureChange: (nom: NomenclatureOption | null) => void;
  itemQty: string;
  onQtyChange: (val: string) => void;
  onAddItem: () => void;
  stockMap: Record<string, number>;
  isLoadingStock: boolean;
}

function NomenclatureAutocompleteInput({
  nomenclatures,
  selectedNomenclature,
  onNomenclatureChange,
  isLoadingStock,
}: {
  nomenclatures: NomenclatureOption[];
  selectedNomenclature: NomenclatureOption | null;
  onNomenclatureChange: (nom: NomenclatureOption | null) => void;
  isLoadingStock: boolean;
}) {
  return (
    <Grid item xs={12} sm={7}>
      <Autocomplete
        options={nomenclatures}
        getOptionLabel={(opt) => `${opt.name}${opt.article ? ` [${opt.article}]` : ''}`}
        value={selectedNomenclature}
        onChange={(_, val) => onNomenclatureChange(val)}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder="Поиск по наименованию или артикулу..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoadingStock && <CircularProgress size={16} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Grid>
  );
}

function ItemQuantityField({
  itemQty,
  onQtyChange,
  currentDonorStock,
  unit,
}: {
  itemQty: string;
  onQtyChange: (val: string) => void;
  currentDonorStock: number | null;
  unit?: string;
}) {
  return (
    <Grid item xs={6} sm={3}>
      <TextField
        fullWidth
        size="small"
        type="number"
        label="Количество"
        value={itemQty}
        onChange={(e) => onQtyChange(e.target.value)}
        inputProps={{ min: 0.01, step: 1 }}
        helperText={
          currentDonorStock !== null
            ? `У донора: ${currentDonorStock} ${unit || ''}`
            : undefined
        }
      />
    </Grid>
  );
}

function AddItemButton({
  isAddDisabled,
  onAddItem,
}: {
  isAddDisabled: boolean;
  onAddItem: () => void;
}) {
  return (
    <Grid item xs={6} sm={2}>
      <Button
        fullWidth
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAddItem}
        disabled={isAddDisabled}
        sx={{ height: 40, borderRadius: '8px', fontWeight: FONT_WEIGHT_MEDIUM }}
      >
        Добавить
      </Button>
    </Grid>
  );
}

/**
 * Подкомпонент добавления строки позиции ТМЦ
 */
export function TransferItemPicker({
  nomenclatures,
  selectedNomenclature,
  onNomenclatureChange,
  itemQty,
  onQtyChange,
  onAddItem,
  stockMap,
  isLoadingStock,
}: TransferItemPickerProps) {
  const currentDonorStock = selectedNomenclature ? stockMap[selectedNomenclature.id] ?? 0 : null;
  const isAddDisabled = !selectedNomenclature || parseFloat(itemQty) <= 0 || isNaN(parseFloat(itemQty));

  return (
    <Grid container spacing={1.5} alignItems="center">
      <NomenclatureAutocompleteInput
        nomenclatures={nomenclatures}
        selectedNomenclature={selectedNomenclature}
        onNomenclatureChange={onNomenclatureChange}
        isLoadingStock={isLoadingStock}
      />
      <ItemQuantityField
        itemQty={itemQty}
        onQtyChange={onQtyChange}
        currentDonorStock={currentDonorStock}
        unit={selectedNomenclature?.unit}
      />
      <AddItemButton isAddDisabled={isAddDisabled} onAddItem={onAddItem} />
    </Grid>
  );
}

export interface TransferItemsTableProps {
  items: RequestLineItem[];
  stockMap: Record<string, number>;
  onRemove: (idx: number) => void;
}

/**
 * Подкомпонент таблицы выбранных позиций ТМЦ
 */
export function TransferItemsTable({
  items,
  stockMap,
  onRemove,
}: TransferItemsTableProps) {
  if (items.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ mt: 2, borderRadius: '8px', overflow: 'hidden' }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: 'background.paper' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: FONT_WEIGHT_BOLD }}>№</TableCell>
            <TableCell sx={{ fontWeight: FONT_WEIGHT_BOLD }}>Номенклатура</TableCell>
            <TableCell align="right" sx={{ fontWeight: FONT_WEIGHT_BOLD, width: TABLE_COL_WIDTH_STOCK }}>
              Наличие у донора
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: FONT_WEIGHT_BOLD, width: TABLE_COL_WIDTH_STOCK }}>
              Запрашиваемое кол-во
            </TableCell>
            <TableCell align="center" sx={{ width: 50 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, idx) => {
            const donorStock = stockMap[item.nomenclatureId] || 0;
            return (
              <TableRow key={item.nomenclatureId} hover>
                <TableCell sx={{ py: 1, color: 'text.secondary' }}>{idx + 1}</TableCell>
                <TableCell sx={{ py: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT_MEDIUM, color: 'text.primary' }}>
                    {item.nomenclatureName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {item.nomenclatureArticle ? `Арт: ${item.nomenclatureArticle} • ` : ''}
                    {item.unit}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1 }}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${donorStock} ${item.unit}`}
                    color={donorStock >= item.quantity ? 'success' : 'warning'}
                    sx={{ fontWeight: FONT_WEIGHT_BOLD, fontSize: '0.75rem' }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ py: 1, fontWeight: FONT_WEIGHT_BOLD, color: 'primary.main' }}>
                  {item.quantity} {item.unit}
                </TableCell>
                <TableCell align="center" sx={{ py: 0.5 }}>
                  <IconButton size="small" color="error" onClick={() => onRemove(idx)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
