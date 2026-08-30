'use client';

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  Stack,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Alert,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { WmsOperationItemRow } from './WmsOperationItemRow';
import type {
  EquipmentOption,
  NomenclatureOption,
  OperationLineItem,
  OperationType,
  WarehouseOption,
} from './WmsOperationWizardDialog';
import type { OperationTypeOption } from './WmsOperationSetupStep';

export interface WmsOperationItemsStepProps {
  operationType: OperationType;
  currentOpMeta: OperationTypeOption;
  currentWarehouse: WarehouseOption | null;
  targetWarehouseId: string;
  warehouses: WarehouseOption[];
  recipientName: string;
  itemWriteOffType: 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER';
  equipmentList: EquipmentOption[];
  selectedItemEquipment: EquipmentOption | null;
  nomenclatures: NomenclatureOption[];
  selectedNomenclature: NomenclatureOption | null;
  searchInputValue: string;
  itemQty: string;
  lineItems: OperationLineItem[];
  isOutflow: boolean;
  getWarehouseStock: (nomenclatureId: string) => number;
  getAvailableStock: (nomenclatureId: string) => number;
  getCurrentOpBannerTitle: () => string;
  onItemWriteOffTypeChange: (type: 'EQUIPMENT' | 'DEFECT' | 'SCRAP' | 'OTHER') => void;
  onSelectedItemEquipmentChange: (equipment: EquipmentOption | null) => void;
  onSearchInputValueChange: (value: string) => void;
  onSelectedNomenclatureChange: (nomenclature: NomenclatureOption | null) => void;
  onOpenCreateNomenclatureDialog: (suggestedName?: string) => void;
  onItemQuantityChange: (quantity: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function WmsOperationItemsStep({
  operationType,
  currentOpMeta,
  currentWarehouse,
  targetWarehouseId,
  warehouses,
  recipientName,
  itemWriteOffType,
  equipmentList,
  selectedItemEquipment,
  nomenclatures,
  selectedNomenclature,
  searchInputValue,
  itemQty,
  lineItems,
  isOutflow,
  getWarehouseStock,
  getAvailableStock,
  getCurrentOpBannerTitle,
  onItemWriteOffTypeChange,
  onSelectedItemEquipmentChange,
  onSearchInputValueChange,
  onSelectedNomenclatureChange,
  onOpenCreateNomenclatureDialog,
  onItemQuantityChange,
  onAddItem,
  onRemoveItem,
  onBack,
  onNext,
}: WmsOperationItemsStepProps) {
  const targetWarehouseName = warehouses.find((warehouse) => warehouse.id === targetWarehouseId)?.name;

  return (
    <Stack spacing={2.5}>
            {/* Top Operation Context & Warehouse Info Banner */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: '10px',
                bgcolor: currentOpMeta.bgcolor,
                borderColor: currentOpMeta.color,
                borderWidth: '1.5px',
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        bgcolor: 'background.paper',
                        color: currentOpMeta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                    >
                      {currentOpMeta.icon}
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, display: 'block', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
                        Проводимая операция:
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9375rem' }}>
                        {getCurrentOpBannerTitle()}
                      </Typography>
                    </Box>
                  </Box>
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
                        → Склад назначения: {targetWarehouseName}
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
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', bgcolor: 'background.default', border: '1px solid divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Поиск и добавление позиций ТМЦ:
                </Typography>
                {operationType === 'RECEIPT' && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => onOpenCreateNomenclatureDialog('')}
                    sx={{ fontWeight: 600, textTransform: 'none', color: 'primary.main' }}
                  >
                    + Новая номенклатура
                  </Button>
                )}
              </Box>

              <Grid container spacing={1.5} alignItems="flex-start">
                {operationType === 'ISSUE_WRITE_OFF' && (
                  <Grid item xs={12}>
                    <Stack spacing={1.5} sx={{ mb: 1, p: 1.5, bgcolor: 'background.paper', borderRadius: '8px', border: '1px solid divider' }}>
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
                            onClick={() => onItemWriteOffTypeChange('EQUIPMENT')}
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          />
                          <Chip
                            label="Брак / Дефект"
                            clickable
                            color={itemWriteOffType === 'DEFECT' ? 'error' : 'default'}
                            variant={itemWriteOffType === 'DEFECT' ? 'filled' : 'outlined'}
                            onClick={() => onItemWriteOffTypeChange('DEFECT')}
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          />
                          <Chip
                            label="Неликвид / Истек срок"
                            clickable
                            color={itemWriteOffType === 'SCRAP' ? 'warning' : 'default'}
                            variant={itemWriteOffType === 'SCRAP' ? 'filled' : 'outlined'}
                            onClick={() => onItemWriteOffTypeChange('SCRAP')}
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          />
                          <Chip
                            label="Утилизация / Износ"
                            clickable
                            color={itemWriteOffType === 'OTHER' ? 'default' : 'default'}
                            variant={itemWriteOffType === 'OTHER' ? 'filled' : 'outlined'}
                            onClick={() => onItemWriteOffTypeChange('OTHER')}
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
                          onChange={(_, val) => onSelectedItemEquipmentChange(val)}
                          getOptionLabel={(option) => `[${option.inventoryNumber || '—'}] ${option.name}${option.model ? ` (${option.model})` : ''}`}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.id}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', py: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                                    {option.name}
                                  </Typography>
                                  <Chip
                                    label={option.inventoryNumber || 'Без инв. №'}
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.6875rem', fontWeight: 700, bgcolor: 'action.selected' }}
                                  />
                                </Box>
                                {(option.model || option.location) && (
                                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25 }}>
                                    {[option.model, option.location].filter(Boolean).join(' • ')}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}
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

                <Grid item xs={12} sm={7.5} md={8}>
                  <Autocomplete
                    size="small"
                    options={nomenclatures}
                    getOptionLabel={(option) => `${option.name} (${option.article || option.unit})`}
                    value={selectedNomenclature}
                    inputValue={searchInputValue}
                    onInputChange={(_, newInputValue) => onSearchInputValueChange(newInputValue)}
                    onChange={(_, val) => {
                      if (val && val.isNewAction) {
                        onOpenCreateNomenclatureDialog(searchInputValue);
                      } else {
                        onSelectedNomenclatureChange(val);
                        if (val && isOutflow) {
                          const av = getAvailableStock(val.id);
                          if (av > 0) {
                            onItemQuantityChange('1');
                          }
                        }
                      }
                    }}
                    slotProps={{
                      popper: {
                        placement: 'bottom-start',
                        sx: {
                          zIndex: 1400,
                          boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                          borderRadius: '10px',
                          '& .MuiAutocomplete-listbox': {
                            p: 1,
                            maxHeight: 320,
                          },
                        },
                      },
                    }}
                    renderOption={(props, option) => {
                      if (option.isNewAction) {
                        return (
                          <li {...props} key={option.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 1, color: 'primary.main', fontWeight: 600 }}>
                              <AddIcon fontSize="small" />
                              <Typography variant="body2">{option.name}</Typography>
                            </Box>
                          </li>
                        );
                      }
                      const stock = getWarehouseStock(option.id);
                      const isAvailable = stock > 0;
                      return (
                        <li {...props} key={option.id} style={{ ...props.style, padding: 0 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                              py: 1,
                              px: 1.5,
                              borderRadius: '6px',
                              gap: 2,
                            }}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: 'text.primary',
                                  lineHeight: 1.35,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {option.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
                                {option.article ? `Арт: ${option.article}` : 'Без артикула'} • {option.category?.name || 'Без категории'} • {option.unit}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={
                                isOutflow
                                  ? isAvailable
                                    ? `В наличии: ${stock} ${option.unit}`
                                    : `Нет на складе (0 ${option.unit})`
                                  : `Остаток: ${stock} ${option.unit}`
                              }
                              color={isOutflow ? (isAvailable ? 'success' : 'error') : 'default'}
                              variant={isOutflow && !isAvailable ? 'filled' : 'outlined'}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.725rem',
                                height: 24,
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                              }}
                            />
                          </Box>
                        </li>
                      );
                    }}
                    filterOptions={(options, params) => {
                      const filterVal = params.inputValue.toLowerCase().trim();
                      const filtered = options.filter(
                        (o) =>
                          o.name.toLowerCase().includes(filterVal) ||
                          (o.article && o.article.toLowerCase().includes(filterVal))
                      );

                      if (
                        operationType === 'RECEIPT' &&
                        filterVal !== '' &&
                        !options.some((o) => o.name.toLowerCase() === filterVal || (o.article && o.article.toLowerCase() === filterVal))
                      ) {
                        filtered.push({
                          id: '__NEW__',
                          name: `+ Создать новую позицию «${params.inputValue}»`,
                          unit: 'шт',
                          isNewAction: true,
                        });
                      }

                      return filtered;
                    }}
                    noOptionsText={
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: operationType === 'RECEIPT' ? 1 : 0 }}>
                          Позиция не найдена в справочнике ТМЦ
                        </Typography>
                        {operationType === 'RECEIPT' && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => onOpenCreateNomenclatureDialog(searchInputValue)}
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          >
                            Создать «{searchInputValue}»
                          </Button>
                        )}
                      </Box>
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Поиск номенклатуры..."
                        placeholder="Название или артикул..."
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={6} sm={2.25} md={2}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    label={`Кол-во (${selectedNomenclature?.unit || 'ед'})`}
                    value={itemQty}
                    onChange={(e) => onItemQuantityChange(e.target.value)}
                    error={Boolean(selectedNomenclature && isOutflow && (parseFloat(itemQty) > getAvailableStock(selectedNomenclature.id) || getAvailableStock(selectedNomenclature.id) <= 0))}
                    helperText={
                      selectedNomenclature && isOutflow
                        ? getAvailableStock(selectedNomenclature.id) <= 0
                          ? `0 ${selectedNomenclature.unit}`
                          : parseFloat(itemQty) > getAvailableStock(selectedNomenclature.id)
                          ? `Превышает (${getAvailableStock(selectedNomenclature.id)})`
                          : `Доступно: ${getAvailableStock(selectedNomenclature.id)}`
                        : undefined
                    }
                    inputProps={{ min: 0.01, step: 'any' }}
                    InputProps={{
                      endAdornment: isOutflow && selectedNomenclature && getAvailableStock(selectedNomenclature.id) > 0 ? (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => onItemQuantityChange(String(getAvailableStock(selectedNomenclature.id)))}
                            sx={{ minWidth: 'auto', p: '2px 4px', fontSize: '0.7rem', fontWeight: 700, color: 'primary.main' }}
                          >
                            Макс
                          </Button>
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />
                </Grid>

                <Grid item xs={6} sm={2.25} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddItem}
                    disabled={
                      !selectedNomenclature ||
                      (isOutflow && (getAvailableStock(selectedNomenclature.id) <= 0 || parseFloat(itemQty) > getAvailableStock(selectedNomenclature.id) || isNaN(parseFloat(itemQty)) || parseFloat(itemQty) <= 0))
                    }
                    sx={{ height: 40, borderRadius: '8px', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    Добавить
                  </Button>
                </Grid>
              </Grid>

              {/* Banner when user typed a name that does not exist (ONLY for RECEIPT) */}
              {operationType === 'RECEIPT' && searchInputValue.trim() !== '' && !nomenclatures.some((n) => n.name.toLowerCase().includes(searchInputValue.toLowerCase()) || (n.article && n.article.toLowerCase().includes(searchInputValue.toLowerCase()))) && (
                <Alert
                  severity="info"
                  action={
                    <Button
                      color="primary"
                      size="small"
                      variant="contained"
                      onClick={() => onOpenCreateNomenclatureDialog(searchInputValue)}
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
                Позиции в операции ({lineItems.length}):
              </Typography>

              {lineItems.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: '8px' }}>
                  В операцию еще не добавлено ни одной позиции. Воспользуйтесь поиском выше.
                </Alert>
              ) : (
                <Paper elevation={0} sx={{ border: '1px solid divider', borderRadius: '8px', overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Номенклатура</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Артикул</TableCell>
                        {operationType === 'ISSUE_WRITE_OFF' && (
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Назначение / Оборудование</TableCell>
                        )}
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Остаток на складе</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Количество в операции</TableCell>
                        <TableCell align="center" sx={{ width: 50 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((item, idx) => (
                        <WmsOperationItemRow
                          key={idx}
                          item={item}
                          operationType={operationType}
                          rawStock={getWarehouseStock(item.nomenclatureId)}
                          isOutflow={isOutflow}
                          onRemove={() => onRemoveItem(idx)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => onBack()} sx={{ fontWeight: 600 }}>
                ← Назад
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
