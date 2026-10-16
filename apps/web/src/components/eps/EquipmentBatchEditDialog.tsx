'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Autocomplete,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import PreviewIcon from '@mui/icons-material/Visibility';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useSnackbar } from 'notistack';
import { ConfirmDialog } from '@/components/ui';
import { BATCH_EDIT_COLUMNS, BatchColumnConfig } from '@/lib/eps-batch-edit';
import { ResponsibleUserSelect } from './ResponsibleUserSelect';

export interface EquipmentBatchEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedIds?: string[];
  filterParams?: Record<string, string>;
  totalCount?: number;
}

interface DistinctValueItem {
  value: string;
  count: number;
}

interface PreviewItem {
  id: string;
  name: string;
  inventoryNumber?: string | null;
  oldValue: string;
  newValue: string;
}

export function EquipmentBatchEditDialog({
  open,
  onClose,
  onSuccess,
  selectedIds = [],
  filterParams = {},
  totalCount = 0,
}: EquipmentBatchEditDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [field, setField] = useState<string>('manufacturer');
  const [matchMode, setMatchMode] = useState<'EXACT' | 'CONTAINS'>('EXACT');
  const [findValue, setFindValue] = useState<string>('');
  const [replaceValue, setReplaceValue] = useState<string>('');
  const [scope, setScope] = useState<'ALL' | 'FILTERED' | 'SELECTED'>(
    selectedIds.length > 0 ? 'SELECTED' : 'ALL'
  );

  const [distinctValues, setDistinctValues] = useState<DistinctValueItem[]>([]);
  const [loadingValues, setLoadingValues] = useState<boolean>(false);

  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [matchedCount, setMatchedCount] = useState<number | null>(null);
  const [sampleItems, setSampleItems] = useState<PreviewItem[]>([]);

  const [applying, setApplying] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const previewRequestRef = useRef(0);

  const activeColumn = BATCH_EDIT_COLUMNS.find((c) => c.id === field);

  const loadDistinctValues = useCallback(async (fieldId: string) => {
    setLoadingValues(true);
    try {
      const res = await fetch(`/api/eps/equipment/batch-edit?field=${encodeURIComponent(fieldId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.values)) {
        setDistinctValues(data.values);
      } else {
        setDistinctValues([]);
      }
    } catch {
      setDistinctValues([]);
    } finally {
      setLoadingValues(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadDistinctValues(field);
    }
  }, [open, field, loadDistinctValues]);

  useEffect(() => {
    if (open) {
      setScope(selectedIds.length > 0 ? 'SELECTED' : 'ALL');
      setMatchedCount(null);
      setSampleItems([]);
      setPreviewKey(null);
    }
  }, [open, selectedIds.length]);

  const handleFieldChange = (newField: string) => {
    setField(newField);
    setFindValue('');
    setReplaceValue('');
    setMatchedCount(null);
    setSampleItems([]);
    setPreviewKey(null);
  };

  const currentPreviewKey = JSON.stringify({
    field,
    matchMode,
    findValue: findValue.trim(),
    replaceValue: replaceValue.trim(),
    scope,
    selectedIds: [...selectedIds].sort(),
    filterParams,
  });

  useEffect(() => {
    setPreviewKey(null);
    setMatchedCount(null);
    setSampleItems([]);
  }, [currentPreviewKey]);

  const handleFetchPreview = async () => {
    if (!findValue.trim()) {
      enqueueSnackbar('Укажите значение для поиска', { variant: 'warning' });
      return;
    }
    setLoadingPreview(true);
    const requestId = ++previewRequestRef.current;
    const requestKey = currentPreviewKey;
    try {
      const res = await fetch('/api/eps/equipment/batch-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          field,
          matchMode,
          findValue: findValue.trim(),
          replaceValue: replaceValue.trim(),
          scope,
          selectedIds,
          filterParams,
        }),
      });
      const data = await res.json();
      if (requestId !== previewRequestRef.current) return;
      if (data.success) {
        setMatchedCount(data.matchedCount);
        setSampleItems(data.sampleItems || []);
        setPreviewKey(requestKey);
      } else {
        enqueueSnackbar(data.error || 'Ошибка предпросмотра', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при выполнении предпросмотра', { variant: 'error' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApplyChanges = async () => {
    if (scope === 'SELECTED' && selectedIds.length === 0) {
      enqueueSnackbar('Выберите хотя бы одну позицию оборудования', { variant: 'warning' });
      return;
    }
    if (previewKey !== currentPreviewKey || matchedCount === null) {
      enqueueSnackbar('Сначала обновите предпросмотр для текущих параметров', { variant: 'warning' });
      return;
    }
    setApplying(true);
    try {
      const res = await fetch('/api/eps/equipment/batch-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          field,
          matchMode,
          findValue: findValue.trim(),
          replaceValue: replaceValue.trim(),
          scope,
          selectedIds,
          filterParams,
        }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar(data.message || 'Массовое редактирование выполнено', { variant: 'success' });
        setConfirmOpen(false);
        onClose();
        onSuccess();
      } else {
        enqueueSnackbar(data.error || 'Ошибка при сохранении изменений', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при сохранении изменений', { variant: 'error' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '14px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.15)',
            maxHeight: 'calc(100vh - 96px)',
            m: { xs: 2, sm: 3, md: 4 },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FindReplaceIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Массовое редактирование позиций оборудования
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: '24px !important', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* 1. Выбор колонки */}
          <FormControl fullWidth size="small">
            <InputLabel id="batch-field-select-label">Колонка для редактирования</InputLabel>
            <Select
              labelId="batch-field-select-label"
              value={field}
              label="Колонка для редактирования"
              onChange={(e) => handleFieldChange(e.target.value)}
            >
              {BATCH_EDIT_COLUMNS.map((col: BatchColumnConfig) => (
                <MenuItem key={col.id} value={col.id}>
                  {col.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 2. Поиск одинаковых строк в колонке */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Найти одинаковые строки в выбранной колонке
            </Typography>
            <Autocomplete
              freeSolo
              options={distinctValues.map((d) => d.value)}
              value={findValue}
              onInputChange={(_e, val) => setFindValue(val)}
              loading={loadingValues}
              renderOption={(props, option) => {
                const count = distinctValues.find((d) => d.value === option)?.count || 0;
                return (
                  <Box
                    component="li"
                    {...props}
                    sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', py: 0.5 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option}
                    </Typography>
                    <Chip
                      label={`${count} шт.`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Значение для поиска (строка)"
                  placeholder="Выберите из существующих или введите строку"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingValues ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
              <RadioGroup
                row
                value={matchMode}
                onChange={(e) => setMatchMode(e.target.value as 'EXACT' | 'CONTAINS')}
              >
                <FormControlLabel
                  value="EXACT"
                  control={<Radio size="small" />}
                  label="Точное совпадение строки"
                />
                <FormControlLabel
                  value="CONTAINS"
                  control={<Radio size="small" />}
                  label="Частичное совпадение (подстрока)"
                />
              </RadioGroup>
            </Box>
          </Box>

          <Divider />

          {/* 3. Новое значение */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Заменить на новое значение
            </Typography>
            {activeColumn?.valueType === 'status' || activeColumn?.valueType === 'select' ? (
              <FormControl fullWidth size="small">
                <InputLabel id="batch-replace-select-label">Новое значение</InputLabel>
                <Select
                  labelId="batch-replace-select-label"
                  value={replaceValue}
                  label="Новое значение"
                  onChange={(e) => setReplaceValue(e.target.value)}
                >
                  {activeColumn.options?.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : field === 'responsible_person_name' ? (
              <ResponsibleUserSelect
                label="Новый ответственный сотрудник (МОЛ)"
                value={replaceValue}
                onChange={(name) => setReplaceValue(name)}
                placeholder="Выберите сотрудника из списка аккаунтов или введите ФИО"
              />
            ) : (
              <TextField
                size="small"
                fullWidth
                label="Новое значение"
                value={replaceValue}
                onChange={(e) => setReplaceValue(e.target.value)}
                placeholder="Введите новое значение для позиций"
              />
            )}
          </Box>

          <Divider />

          {/* 4. Область применения */}
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontSize: '0.8125rem', fontWeight: 600, mb: 0.5 }}>
              Область применения замены
            </FormLabel>
            <RadioGroup
              row
              value={scope}
              onChange={(e) => setScope(e.target.value as 'ALL' | 'FILTERED' | 'SELECTED')}
            >
              <FormControlLabel
                value="ALL"
                control={<Radio size="small" />}
                label={`Во всем реестре (${totalCount || 'все'} поз.)`}
              />
              <FormControlLabel
                value="FILTERED"
                control={<Radio size="small" />}
                label="С учетом активных фильтров"
              />
              <FormControlLabel
                value="SELECTED"
                disabled={selectedIds.length === 0}
                control={<Radio size="small" />}
                label={`Только среди выбранных (${selectedIds.length} поз.)`}
              />
            </RadioGroup>
          </FormControl>

          {/* 5. Предпросмотр результатов */}
          {matchedCount !== null && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {matchedCount > 0 ? (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Найдено совпадений: <strong>{matchedCount}</strong> позиций оборудования.
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Совпадающих позиций не найдено. Проверьте условия поиска.
                </Alert>
              )}

              {sampleItems.length > 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell component="th" scope="col" sx={{ fontWeight: 600 }}>Инв. №</TableCell>
                        <TableCell component="th" scope="col" sx={{ fontWeight: 600 }}>Оборудование</TableCell>
                        <TableCell component="th" scope="col" sx={{ fontWeight: 600 }}>Текущее значение</TableCell>
                        <TableCell component="th" scope="col" sx={{ fontWeight: 600 }}>Новое значение</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sampleItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                            {item.inventoryNumber || '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem' }}>{item.name}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                            {item.oldValue || '—'}
                          </TableCell>
                          <TableCell sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.8125rem' }}>
                            {item.newValue || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.75, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Button onClick={onClose} color="inherit" size="small">
            Отмена
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={loadingPreview ? <CircularProgress size={16} /> : <PreviewIcon />}
            onClick={handleFetchPreview}
            disabled={loadingPreview || !findValue.trim()}
          >
            Предпросмотр совпадений
          </Button>

          <Button
            variant="contained"
            size="small"
            color="primary"
            startIcon={<DoneAllIcon />}
            disabled={matchedCount === 0 || previewKey !== currentPreviewKey || !findValue.trim() || applying}
            onClick={() => setConfirmOpen(true)}
          >
            Применить замену
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Подтверждение массового редактирования"
        subtitle={`Колонка: ${activeColumn?.label || field}`}
        message={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              Будет выполнена замена значения в колонке{' '}
              <strong>«{activeColumn?.label || field}»</strong> для{' '}
              <strong>{matchedCount ?? 'всех найденных'}</strong> позиций оборудования.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Искомое значение: <strong>«{findValue}»</strong> &rarr; Новое значение:{' '}
              <strong>«{replaceValue}»</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Операция будет зафиксирована в журнале системного аудита.
            </Typography>
          </Box>
        }
        confirmText="Применить замену"
        cancelText="Отмена"
        variant="primary"
        loading={applying}
        onConfirm={handleApplyChanges}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
