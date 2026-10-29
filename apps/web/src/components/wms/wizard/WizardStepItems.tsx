'use client';

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Stack,
  Paper,
  Chip,
  Alert,
  Autocomplete,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import {
  OperationType,
  WarehouseOption,
  EquipmentOption,
  NomenclatureOption,
  ZoneWithCells,
  OperationLineItem,
} from './types';
import { WizardItemsTable } from './WizardItemsTable';

interface WizardStepItemsProps {
  operationType: OperationType;
  currentWarehouse: WarehouseOption | null;
  targetWarehouseId: string;
  warehouses: WarehouseOption[];
  recipientName: string;
  nomenclatures: NomenclatureOption[];
  selectedNomenclature: NomenclatureOption | null;
  searchInputValue: string;
  itemQty: string;
  itemCellId: string;
  itemEquipmentId: string;
  selectedItemEquipment: EquipmentOption | null;
  itemWriteOffType: 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER';
  equipmentList: EquipmentOption[];
  warehouseZones: ZoneWithCells[];
  flatWarehouseCells: Array<{ id: string; code: string; name?: string | null; zoneName: string }>;
  lineItems: OperationLineItem[];
  isOutflow: boolean;
  getCurrentOpBannerTitle: () => string;
  getWarehouseStock: (nomenclatureId: string) => number;
  getAvailableStock: (nomenclatureId: string) => number;
  onSetSearchInputValue: (val: string) => void;
  onSetSelectedNomenclature: (val: NomenclatureOption | null) => void;
  onSetItemQty: (val: string) => void;
  onSetItemCellId: (val: string) => void;
  onSetItemEquipmentId: (val: string) => void;
  onSetSelectedItemEquipment: (val: EquipmentOption | null) => void;
  onSetItemWriteOffType: (val: 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER') => void;
  onOpenCreateNomDialog: (initialName?: string) => void;
  onAddItem: () => void;
  onUpdateItemQuantity: (index: number, newQty: number) => void;
  onUpdateItemCell: (index: number, cellId: string) => void;
  onRemoveItem: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function WizardStepItems(props: WizardStepItemsProps) {
  const {
    operationType,
    currentWarehouse,
    targetWarehouseId,
    warehouses,
    recipientName,
    nomenclatures,
    selectedNomenclature,
    searchInputValue,
    itemQty,
    itemCellId,
    selectedItemEquipment,
    itemWriteOffType,
    equipmentList,
    warehouseZones,
    flatWarehouseCells,
    lineItems,
    isOutflow,
    getCurrentOpBannerTitle,
    getWarehouseStock,
    getAvailableStock,
    onSetSearchInputValue,
    onSetSelectedNomenclature,
    onSetItemQty,
    onSetItemCellId,
    onSetItemEquipmentId,
    onSetSelectedItemEquipment,
    onSetItemWriteOffType,
    onOpenCreateNomDialog,
    onAddItem,
    onUpdateItemQuantity,
    onUpdateItemCell,
    onRemoveItem,
    onBack,
    onNext,
  } = props;

  return (
    <Stack spacing={2.5}>
      {/* Top Context Banner */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: '10px',
          bgcolor: 'action.hover',
          borderColor: 'divider',
          borderWidth: '1.5px',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, display: 'block', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
              Проводимая операция:
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9375rem' }}>
              {getCurrentOpBannerTitle()}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, display: 'block' }}>
                {operationType === 'TRANSFER' ? 'Склад списания (МОЛ):' : 'Склад операции (МОЛ):'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {currentWarehouse ? `${currentWarehouse.name} (${currentWarehouse.code})` : '—'}
              </Typography>
              {operationType === 'TRANSFER' && targetWarehouseId && (
                <Typography variant="caption" sx={{ display: 'block', color: 'secondary.main', fontWeight: 700, mt: 0.25 }}>
                  → Склад назначения: {warehouses.find((w) => w.id === targetWarehouseId)?.name}
                </Typography>
              )}
              {operationType === 'ISSUE_EMPLOYEE' && recipientName && (
                <Typography variant="caption" sx={{ display: 'block', color: 'info.dark', fontWeight: 700, mt: 0.25 }}>
                  Получатель: {recipientName}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Quick Item Add / Search Card */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Поиск и добавление позиций ТМЦ:
          </Typography>
          {operationType === 'RECEIPT' && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => onOpenCreateNomDialog('')}
              sx={{ fontWeight: 600, textTransform: 'none', color: 'primary.main' }}
            >
              + Новая номенклатура
            </Button>
          )}
        </Box>

        <Grid container spacing={1.5} alignItems="flex-start">
          {operationType === 'ISSUE_WRITE_OFF' && (
            <Grid item xs={12}>
              <Stack spacing={1.5} sx={{ mb: 1, p: 1.5, bgcolor: 'background.paper', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                    Причина / основание списания:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      icon={<PrecisionManufacturingIcon sx={{ fontSize: 16 }} />}
                      label="Установка на оборудование (ТОиР)"
                      clickable
                      color={itemWriteOffType === 'EQUIPMENT' ? 'primary' : 'default'}
                      variant={itemWriteOffType === 'EQUIPMENT' ? 'filled' : 'outlined'}
                      onClick={() => onSetItemWriteOffType('EQUIPMENT')}
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    />
                    <Chip
                      label="Брак / Дефект"
                      clickable
                      color={itemWriteOffType === 'DEFECT' ? 'error' : 'default'}
                      variant={itemWriteOffType === 'DEFECT' ? 'filled' : 'outlined'}
                      onClick={() => onSetItemWriteOffType('DEFECT')}
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    />
                    <Chip
                      label="Неликвид / Истек срок"
                      clickable
                      color={itemWriteOffType === 'SCRAP' ? 'warning' : 'default'}
                      variant={itemWriteOffType === 'SCRAP' ? 'filled' : 'outlined'}
                      onClick={() => onSetItemWriteOffType('SCRAP')}
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    />
                    <Chip
                      label="Утилизация / Износ"
                      clickable
                      color={itemWriteOffType === 'OTHER' ? 'default' : 'default'}
                      variant={itemWriteOffType === 'OTHER' ? 'filled' : 'outlined'}
                      onClick={() => onSetItemWriteOffType('OTHER')}
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    />
                  </Stack>
                </Box>

                {itemWriteOffType === 'EQUIPMENT' && (
                  <Autocomplete
                    size="small"
                    fullWidth
                    options={equipmentList}
                    value={selectedItemEquipment}
                    onChange={(_, val) => {
                      onSetSelectedItemEquipment(val);
                      onSetItemEquipmentId(val ? val.id : '');
                    }}
                    getOptionLabel={(option) => `[${option.inventoryNumber || '—'}] ${option.name}${option.model ? ` (${option.model})` : ''}`}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Целевое оборудование (из реестра EPS)"
                        placeholder="Поиск оборудования по инв. №, наименованию или модели..."
                        helperText="Укажите единицу оборудования, на которую монтируется деталь, или оставьте пустым для общего списания"
                        sx={{ bgcolor: 'background.paper' }}
                      />
                    )}
                  />
                )}
              </Stack>
            </Grid>
          )}

          <Grid
            item
            xs={12}
            sm={operationType === 'RECEIPT' && flatWarehouseCells.length > 0 ? 5 : 7.5}
            md={operationType === 'RECEIPT' && flatWarehouseCells.length > 0 ? 5 : 8}
          >
            <Autocomplete
              size="small"
              options={nomenclatures}
              getOptionLabel={(option) => `${option.name} (${option.article || option.unit})`}
              value={selectedNomenclature}
              inputValue={searchInputValue}
              onInputChange={(_, newInputValue) => onSetSearchInputValue(newInputValue)}
              onChange={(_, val) => {
                if (val && val.isNewAction) {
                  onOpenCreateNomDialog(searchInputValue);
                } else {
                  onSetSelectedNomenclature(val);
                  if (val && isOutflow) {
                    const av = getAvailableStock(val.id);
                    if (av > 0) {
                      onSetItemQty('1');
                    }
                  }
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Поиск номенклатуры..."
                  placeholder="Название или артикул..."
                />
              )}
            />
          </Grid>

          <Grid
            item
            xs={6}
            sm={operationType === 'RECEIPT' && flatWarehouseCells.length > 0 ? 2 : 2.25}
            md={2}
          >
            <TextField
              size="small"
              fullWidth
              type="number"
              label={`Кол-во (${selectedNomenclature?.unit || 'ед'})`}
              value={itemQty}
              onChange={(e) => onSetItemQty(e.target.value)}
              inputProps={{ min: 0.01, step: 'any' }}
            />
          </Grid>

          {operationType === 'RECEIPT' && flatWarehouseCells.length > 0 && (
            <Grid item xs={6} sm={2.75} md={3}>
              <TextField
                select
                size="small"
                fullWidth
                label="Целевая ячейка"
                value={itemCellId}
                onChange={(e) => onSetItemCellId(e.target.value)}
                helperText="Адрес хранения (необязательно)"
              >
                <MenuItem value="">
                  <em>— Без ячейки —</em>
                </MenuItem>
                {warehouseZones.map((zone) => [
                  <MenuItem key={`add-head-${zone.id}`} disabled sx={{ fontWeight: 700, bgcolor: 'grey.100', fontSize: '0.75rem' }}>
                    {zone.name} ({zone.code})
                  </MenuItem>,
                  ...zone.cells.map((cell) => (
                    <MenuItem key={cell.id} value={cell.id} sx={{ pl: 3, fontSize: '0.8125rem' }}>
                      {cell.code} {cell.name ? `— ${cell.name}` : ''}
                    </MenuItem>
                  )),
                ])}
              </TextField>
            </Grid>
          )}

          <Grid
            item
            xs={operationType === 'RECEIPT' && flatWarehouseCells.length > 0 ? 12 : 6}
            sm={operationType === 'RECEIPT' && flatWarehouseCells.length > 0 ? 2.25 : 2.25}
            md={operationType === 'RECEIPT' && flatWarehouseCells.length > 0 ? 2 : 2}
          >
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddItem}
              disabled={!selectedNomenclature}
              sx={{ height: 40, borderRadius: '8px', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Добавить
            </Button>
          </Grid>
        </Grid>

        {/* Banner when user typed a name that does not exist (ONLY for RECEIPT) */}
        {operationType === 'RECEIPT' &&
          searchInputValue.trim() !== '' &&
          !nomenclatures.some(
            (n) =>
              n.name.toLowerCase().includes(searchInputValue.toLowerCase()) ||
              (n.article && n.article.toLowerCase().includes(searchInputValue.toLowerCase()))
          ) && (
            <Alert
              severity="info"
              action={
                <Button
                  color="primary"
                  size="small"
                  variant="contained"
                  onClick={() => onOpenCreateNomDialog(searchInputValue)}
                  sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'none' }}
                >
                  Создать и заполнить данные
                </Button>
              }
              sx={{ mt: 2, borderRadius: '8px', alignItems: 'center' }}
            >
              Позиции <b>«{searchInputValue}»</b> нет в справочнике ТМЦ. Создать её автоматически при приходе?
            </Alert>
          )}
      </Paper>

      {/* List of Added Line Items */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
          Позиции в документе ({lineItems.length}):
        </Typography>

        <WizardItemsTable
          operationType={operationType}
          lineItems={lineItems}
          isOutflow={isOutflow}
          warehouseZones={warehouseZones}
          flatWarehouseCells={flatWarehouseCells}
          getWarehouseStock={getWarehouseStock}
          onUpdateItemQuantity={onUpdateItemQuantity}
          onUpdateItemCell={onUpdateItemCell}
          onRemoveItem={onRemoveItem}
        />
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
        <Button onClick={onBack} sx={{ fontWeight: 600 }}>
          ← Назад к типу операции
        </Button>
        <Button
          variant="contained"
          onClick={onNext}
          disabled={lineItems.length === 0}
          sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}
        >
          Далее: Проведение операции →
        </Button>
      </Box>
    </Stack>
  );
}
