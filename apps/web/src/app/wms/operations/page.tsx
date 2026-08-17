'use client';

import React, { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton,
  Stack,
  Autocomplete,
  Tooltip,
  Divider,
  Alert,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import CreateNomenclatureDialog from '@/components/wms/CreateNomenclatureDialog';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, OPERATION_TYPE_MAP, formatDateTime } from '@ems/shared';
import {
  StatCard,
  FilterToolbar,
  DataTableWrapper,
  EmptyState,
  StatusBadge,
} from '@/components/ui';

interface StockOperation {
  id: string;
  type: string;
  date: string;
  counterparty?: string | null;
  document?: string | null;
  comment?: string | null;
  warehouse: { id: string; name: string; code: string };
  createdBy: { displayName: string; ldapLogin: string };
  items: Array<{
    id: string;
    quantity: number;
    nomenclature: { id: string; name: string; article?: string | null; unit: string };
    equipment?: { id: string; name: string; inventoryNumber: string } | null;
  }>;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface NomenclatureOption {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  totalStock?: number;
}

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber?: string | null;
}

interface FormRow {
  nomenclature: NomenclatureOption | null;
  quantity: number | string;
  equipment: EquipmentOption | null;
}

function WmsOperationsContent() {
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuth();

  const [operations, setOperations] = useState<StockOperation[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureOption[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Warehouse stock map: nomenclatureId -> quantity in selected warehouse
  const [warehouseStockMap, setWarehouseStockMap] = useState<Record<string, number>>({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('action') || '');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Create Operation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [opType, setOpType] = useState<'RECEIPT' | 'ISSUE' | 'TRANSFER'>(
    (searchParams.get('action') as any) || 'RECEIPT'
  );
  const [opWarehouseId, setOpWarehouseId] = useState('');
  const [opTargetWarehouseId, setOpTargetWarehouseId] = useState('');
  const [opCounterparty, setOpCounterparty] = useState('');
  const [opDocument, setOpDocument] = useState('');
  const [opComment, setOpComment] = useState('');
  const [formRows, setFormRows] = useState<FormRow[]>([
    { nomenclature: null, quantity: 1, equipment: null },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fast Create Nomenclature inside Operation Modal
  const [isQuickNomOpen, setIsQuickNomOpen] = useState(false);
  const [quickNomRowIndex, setQuickNomRowIndex] = useState<number | null>(null);

  // Load initial dictionaries ONCE on mount
  useEffect(() => {
    async function loadDictionaries() {
      try {
        const [wRes, nRes, eRes] = await Promise.all([
          fetch('/api/wms/warehouses'),
          fetch('/api/wms/nomenclature?limit=500'),
          fetch('/api/eps/equipment?pageSize=200'),
        ]);

        if (wRes.ok) {
          const wJson = await wRes.json();
          if (wJson.success) {
            setWarehouses(wJson.data);
            if (wJson.data.length > 0) {
              setOpWarehouseId((prev) => prev || wJson.data[0].id);
            }
          }
        }

        if (nRes.ok) {
          const nJson = await nRes.json();
          if (nJson.success) setNomenclatures(nJson.data);
        }

        if (eRes.ok) {
          const eJson = await eRes.json();
          if (eJson.success && eJson.data.items) {
            setEquipmentList(
              eJson.data.items.map((eq: any) => ({
                id: eq.id,
                name: eq.name,
                inventoryNumber: eq.inventoryNumber,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки справочников:', err);
      }
    }
    loadDictionaries();
  }, []);

  // Fetch stock quantities for the active operation warehouse (for ISSUE / TRANSFER validation)
  useEffect(() => {
    if (!opWarehouseId || !isCreateModalOpen) return;

    async function loadWarehouseStock() {
      setIsLoadingStock(true);
      try {
        const res = await fetch(`/api/wms/stock?warehouseId=${opWarehouseId}&pageSize=500`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data.items) {
            const stockMap: Record<string, number> = {};
            json.data.items.forEach((item: any) => {
              stockMap[item.nomenclatureId] = Number(item.quantity);
            });
            setWarehouseStockMap(stockMap);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки остатков склада для операции:', err);
      } finally {
        setIsLoadingStock(false);
      }
    }
    loadWarehouseStock();
  }, [opWarehouseId, isCreateModalOpen]);

  // Open modal if action query parameter passed
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'RECEIPT' || action === 'ISSUE' || action === 'TRANSFER') {
      setOpType(action);
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const fetchOperations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse);
      if (selectedType) params.set('type', selectedType);
      params.set('page', String(page + 1));
      params.set('pageSize', String(rowsPerPage));

      const res = await fetch(`/api/wms/operations?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOperations(json.data.items);
          setTotalCount(json.data.total);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки журнала операций:', err);
      enqueueSnackbar('Ошибка загрузки журнала операций', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouse, selectedType, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const handleOpenCreate = (type: 'RECEIPT' | 'ISSUE' | 'TRANSFER') => {
    setOpType(type);
    setFormRows([{ nomenclature: null, quantity: 1, equipment: null }]);
    setOpCounterparty('');
    setOpDocument('');
    setOpComment('');
    if (warehouses.length > 0 && !opWarehouseId) {
      setOpWarehouseId(warehouses[0].id);
    }
    setIsCreateModalOpen(true);
  };

  const handleAddRow = () => {
    setFormRows((prev) => [...prev, { nomenclature: null, quantity: 1, equipment: null }]);
  };

  const handleRemoveRow = (idx: number) => {
    setFormRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: keyof FormRow, val: any) => {
    setFormRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!opWarehouseId) {
      enqueueSnackbar('Выберите склад для операции', { variant: 'warning' });
      return;
    }

    if (opType === 'TRANSFER' && (!opTargetWarehouseId || opTargetWarehouseId === opWarehouseId)) {
      enqueueSnackbar('Выберите другой склад-получатель для перемещения', { variant: 'warning' });
      return;
    }

    // Validate rows
    const validItems = [];
    for (let i = 0; i < formRows.length; i++) {
      const row = formRows[i];
      if (!row.nomenclature) {
        enqueueSnackbar(`В строке #${i + 1} не выбрана номенклатура`, { variant: 'warning' });
        return;
      }
      const qty = Number(row.quantity);
      if (isNaN(qty) || qty <= 0) {
        enqueueSnackbar(`В строке #${i + 1} указано некорректное количество`, { variant: 'warning' });
        return;
      }

      // Check available quantity for ISSUE & TRANSFER
      if (opType !== 'RECEIPT') {
        const available = warehouseStockMap[row.nomenclature.id] || 0;
        if (qty > available) {
          enqueueSnackbar(
            `В строке #${i + 1} (${row.nomenclature.name}): запрошено ${qty} ${row.nomenclature.unit}, но на складе доступно всего ${available} ${row.nomenclature.unit}!`,
            { variant: 'error' }
          );
          return;
        }
      }

      validItems.push({
        nomenclatureId: row.nomenclature.id,
        quantity: qty,
        equipmentId: row.equipment ? row.equipment.id : undefined,
      });
    }

    if (validItems.length === 0) {
      enqueueSnackbar('Добавьте хотя бы одну позицию ТМЦ', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wms/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: opType,
          warehouseId: opWarehouseId,
          targetWarehouseId: opType === 'TRANSFER' ? opTargetWarehouseId : undefined,
          counterparty: opCounterparty || undefined,
          document: opDocument || undefined,
          comment: opComment || undefined,
          items: validItems,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Складская операция успешно проведена', { variant: 'success' });
        setIsCreateModalOpen(false);
        fetchOperations();
      } else {
        enqueueSnackbar(json.error || 'Ошибка проведения операции', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при проведении операции', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNomenclatureCreated = (newItem: { id: string; name: string; article?: string | null; unit: string }) => {
    setNomenclatures((prev) => [newItem, ...prev]);
    if (quickNomRowIndex !== null && quickNomRowIndex < formRows.length) {
      handleRowChange(quickNomRowIndex, 'nomenclature', newItem);
    }
    setQuickNomRowIndex(null);
  };

  const getTypeChip = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return <Chip icon={<MoveToInboxIcon />} label="Приход" size="small" color="success" sx={{ fontWeight: 700 }} />;
      case 'ISSUE':
        return <Chip icon={<OutboxIcon />} label="Списание" size="small" color="warning" sx={{ fontWeight: 700 }} />;
      case 'TRANSFER':
        return <Chip icon={<SwapHorizIcon />} label="Перемещение" size="small" color="info" sx={{ fontWeight: 700 }} />;
      case 'ADJUSTMENT':
        return <Chip icon={<TuneIcon />} label="Корректировка" size="small" color="default" sx={{ fontWeight: 700 }} />;
      default:
        return <Chip label={type} size="small" />;
    }
  };

  const handleKpiFilter = (type: string) => {
    if (selectedType === type) {
      setSelectedType('');
    } else {
      setSelectedType(type);
    }
    setPage(0);
  };

  const handleResetFilters = () => {
    setSelectedWarehouse('');
    setSelectedType('');
    setPage(0);
  };

  const activeFilterCount = (selectedWarehouse ? 1 : 0) + (selectedType ? 1 : 0);

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto', pb: 4 }}>
      <PageHeader
        title="Складские операции и журнал перемещений"
        subtitle="Регистрация прихода ТМЦ от поставщиков, списания на оборудование и межскладских перемещений"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Операции' },
        ]}
        actions={
          hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                color="success"
                startIcon={<MoveToInboxIcon />}
                onClick={() => handleOpenCreate('RECEIPT')}
                aria-label="Оформить приход ТМЦ"
              >
                Приход
              </Button>
              <Button
                variant="contained"
                color="warning"
                startIcon={<OutboxIcon />}
                onClick={() => handleOpenCreate('ISSUE')}
                aria-label="Оформить списание на оборудование"
              >
                Списание
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<SwapHorizIcon />}
                onClick={() => handleOpenCreate('TRANSFER')}
                aria-label="Оформить перемещение"
              >
                Перемещение
              </Button>
            </Stack>
          )
        }
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего операций"
            value={totalCount}
            subtitle="В журнале движения ТМЦ"
            icon={<SwapHorizIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            active={selectedType === ''}
            onClick={() => handleKpiFilter('')}
            loading={isLoading && totalCount === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Поступления (Приход)"
            value={operations.filter((o) => o.type === 'RECEIPT').length}
            subtitle="От поставщиков"
            icon={<MoveToInboxIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            active={selectedType === 'RECEIPT'}
            onClick={() => handleKpiFilter('RECEIPT')}
            loading={isLoading && totalCount === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Списания на ТО"
            value={operations.filter((o) => o.type === 'ISSUE').length}
            subtitle="Установка в оборудование"
            icon={<OutboxIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
            active={selectedType === 'ISSUE'}
            onClick={() => handleKpiFilter('ISSUE')}
            loading={isLoading && totalCount === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Перемещения"
            value={operations.filter((o) => o.type === 'TRANSFER').length}
            subtitle="Межскладские трансферы"
            icon={<SwapHorizIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(124, 58, 237, 0.08)"
            iconColor="#7c3aed"
            accentColor="#7c3aed"
            active={selectedType === 'TRANSFER'}
            onClick={() => handleKpiFilter('TRANSFER')}
            loading={isLoading && totalCount === 0}
          />
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
      >
        <TextField
          select
          size="small"
          label="Склад"
          value={selectedWarehouse}
          onChange={(e) => {
            setSelectedWarehouse(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Все склады</MenuItem>
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id}>
              {w.name} ({w.code})
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Тип операции"
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Все типы операций</MenuItem>
          <MenuItem value="RECEIPT">Приход (поступление от поставщика)</MenuItem>
          <MenuItem value="ISSUE">Списание (установка на оборудование)</MenuItem>
          <MenuItem value="TRANSFER">Перемещение между складами</MenuItem>
          <MenuItem value="ADJUSTMENT">Корректировка инвентаризации</MenuItem>
        </TextField>
      </FilterToolbar>

      {/* Main Operations Registry Table */}
      {operations.length === 0 && !isLoading ? (
        <EmptyState
          paper
          icon={<SwapHorizIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="Складские операции не найдены"
          description={
            activeFilterCount > 0
              ? 'По выбранным критериям фильтрации операции не найдены. Попробуйте сбросить фильтры.'
              : 'В журнале пока нет зарегистрированных операций движения ТМЦ.'
          }
          actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : undefined}
          onAction={activeFilterCount > 0 ? handleResetFilters : undefined}
        />
      ) : (
        <DataTableWrapper
          loading={isLoading}
          page={page}
          pageSize={rowsPerPage}
          total={totalCount}
          onPageChange={(_, newPage) => setPage(newPage)}
          onPageSizeChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          stickyHeader
        >
          <Table size="small" aria-label="Журнал складских операций">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Дата / Время</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130 }}>Тип</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Склад</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Позиции и количество</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Оборудование / Получатель</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Документ / Основание</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Исполнитель</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.map((op) => (
                <TableRow key={op.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                    {formatDateTime(op.date)}
                  </TableCell>
                  <TableCell>{getTypeChip(op.type)}</TableCell>
                  <TableCell>
                    <Chip label={op.warehouse.code} size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: '4px', height: 20 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {op.warehouse.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {op.items.map((it) => (
                        <Typography key={it.id} variant="body2" sx={{ fontSize: '0.8125rem' }}>
                          <b>{it.nomenclature.name}</b>: {it.quantity} {it.nomenclature.unit}
                        </Typography>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {op.items.some((i) => i.equipment) ? (
                      <Stack spacing={0.5}>
                        {op.items
                          .filter((i) => i.equipment)
                          .map((i) => (
                            <Chip
                              key={i.id}
                              label={`${i.equipment?.name} (${i.equipment?.inventoryNumber})`}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ borderRadius: '4px', height: 22 }}
                            />
                          ))}
                      </Stack>
                    ) : op.counterparty ? (
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{op.counterparty}</Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {op.document ? (
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                        {op.document}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                    {op.comment && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {op.comment}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                      {op.createdBy?.displayName}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {/* Модальное окно оформления складской операции */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => !isSubmitting && setIsCreateModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {opType === 'RECEIPT' && 'Оформление прихода ТМЦ (поступление на склад)'}
          {opType === 'ISSUE' && 'Оформление списания ТМЦ (установка на оборудование)'}
          {opType === 'TRANSFER' && 'Межскладское перемещение ТМЦ'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Склад и основные реквизиты */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={opType === 'TRANSFER' ? 6 : 12}>
                <TextField
                  select
                  fullWidth
                  required
                  label={opType === 'TRANSFER' ? 'Склад-отправитель' : 'Склад'}
                  value={opWarehouseId}
                  onChange={(e) => setOpWarehouseId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {opType === 'TRANSFER' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Склад-получатель"
                    value={opTargetWarehouseId}
                    onChange={(e) => setOpTargetWarehouseId(e.target.value)}
                  >
                    {warehouses
                      .filter((w) => w.id !== opWarehouseId)
                      .map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid>
              )}

              {opType === 'RECEIPT' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Контрагент / Поставщик"
                    placeholder="ООО Снабкомплект..."
                    value={opCounterparty}
                    onChange={(e) => setOpCounterparty(e.target.value)}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={opType === 'RECEIPT' ? 6 : 12}>
                <TextField
                  fullWidth
                  label="Номер накладной / Документ-основание"
                  placeholder="ТТН-0492 / Служебная записка..."
                  value={opDocument}
                  onChange={(e) => setOpDocument(e.target.value)}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* Строки спецификации ТМЦ */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Спецификация позиций ТМЦ
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddRow}>
                  Добавить строку
                </Button>
              </Box>

              <Stack spacing={2}>
                {formRows.map((row, idx) => {
                  const currentStock = row.nomenclature ? warehouseStockMap[row.nomenclature.id] ?? 0 : null;
                  const isExceeded = opType !== 'RECEIPT' && currentStock !== null && Number(row.quantity) > currentStock;

                  return (
                    <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={opType === 'ISSUE' ? 5 : 7}>
                          <Autocomplete
                            options={nomenclatures}
                            getOptionLabel={(opt) => `${opt.name}${opt.article ? ` (${opt.article})` : ''}`}
                            value={row.nomenclature}
                            onChange={(_, newVal) => handleRowChange(idx, 'nomenclature', newVal)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                required
                                label={`Позиция #${idx + 1}`}
                                placeholder="Выберите номенклатуру..."
                              />
                            )}
                          />
                          {row.nomenclature && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Ед. изм.: <b>{row.nomenclature.unit}</b>
                              </Typography>
                              {opType !== 'RECEIPT' && (
                                <Chip
                                  label={`На складе: ${currentStock} ${row.nomenclature.unit}`}
                                  size="small"
                                  color={isExceeded ? 'error' : 'default'}
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                              )}
                            </Box>
                          )}
                        </Grid>

                        <Grid item xs={12} sm={2.5}>
                          <TextField
                            size="small"
                            type="number"
                            required
                            label="Количество"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                            error={isExceeded}
                            helperText={isExceeded ? 'Превышает остаток' : undefined}
                            inputProps={{ min: 0.001, step: 1 }}
                          />
                        </Grid>

                        {opType === 'ISSUE' && (
                          <Grid item xs={12} sm={3.5}>
                            <Autocomplete
                              options={equipmentList}
                              getOptionLabel={(eq) => `${eq.name} (${eq.inventoryNumber || 'б/н'})`}
                              value={row.equipment}
                              onChange={(_, newVal) => handleRowChange(idx, 'equipment', newVal)}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  size="small"
                                  label="Оборудование"
                                  placeholder="Узел / Станок"
                                />
                              )}
                            />
                          </Grid>
                        )}

                        <Grid item xs={12} sm={1} sx={{ textAlign: 'right' }}>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={formRows.length === 1}
                            onClick={() => handleRemoveRow(idx)}
                            aria-label={`Удалить строку #${idx + 1}`}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  );
                })}
              </Stack>

              <Button
                size="small"
                variant="text"
                sx={{ mt: 1.5 }}
                onClick={() => {
                  setQuickNomRowIndex(formRows.length - 1);
                  setIsQuickNomOpen(true);
                }}
              >
                + Создать новую номенклатуру, если её нет в списке
              </Button>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Комментарий к операции"
              placeholder="Примечание, причина списания или особенности..."
              value={opComment}
              onChange={(e) => setOpComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Проведение...' : 'Провести операцию'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Быстрое создание номенклатуры */}
      <CreateNomenclatureDialog
        open={isQuickNomOpen}
        onClose={() => setIsQuickNomOpen(false)}
        onCreated={handleNomenclatureCreated}
      />
    </Box>
  );
}

export default function WmsOperationsPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress />
        </Box>
      }
    >
      <WmsOperationsContent />
    </Suspense>
  );
}
