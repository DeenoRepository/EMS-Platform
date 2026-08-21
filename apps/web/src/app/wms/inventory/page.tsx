'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Stack,
  IconButton,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, INVENTORY_STATUS_MAP, formatDateTime } from '@ems/shared';
import {
  StatCard,
  DataTableWrapper,
  EmptyState,
  StatusBadge,
  FormDialog,
  FilterToolbar,
  SearchInput,
  type TableColumnOption,
} from '@/components/ui';
import { InventoryCountSheetDialog } from '@/components/wms';
import { TableSortLabel } from '@mui/material';

const INVENTORY_COLUMNS: TableColumnOption[] = [
  { id: 'code', label: 'Номер / Акт', defaultVisible: true, required: true },
  { id: 'warehouse', label: 'Склад', defaultVisible: true },
  { id: 'status', label: 'Статус', defaultVisible: true },
  { id: 'count', label: 'Позиций в акте', defaultVisible: true },
  { id: 'date', label: 'Дата создания', defaultVisible: true },
  { id: 'author', label: 'Ответственный', defaultVisible: true },
  { id: 'actions', label: 'Действия', defaultVisible: true, required: true },
];

interface InventoryItemSummary {
  id: string;
  warehouseId: string;
  status: string;
  date: string;
  comment?: string | null;
  closedAt?: string | null;
  createdAt: string;
  warehouse: { name: string; code: string };
  createdBy: { displayName: string };
  _count: { items: number };
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  responsibleUserId?: string | null;
  responsibleUser?: { id: string; displayName: string } | null;
}

export default function WmsInventoryListPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();

  const [inventories, setInventories] = useState<InventoryItemSummary[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    INVENTORY_COLUMNS.map((c) => c.id)
  );
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Create Inventory Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Count Sheet Modal
  const [isCountSheetOpen, setIsCountSheetOpen] = useState(false);
  const [selectedSheetInventory, setSelectedSheetInventory] = useState<any | null>(null);

  const fetchInventories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/wms/inventories');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setInventories(json.data);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки инвентаризаций:', err);
      enqueueSnackbar('Ошибка загрузки актов инвентаризации', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchInventories();
    async function loadWarehouses() {
      try {
        const res = await fetch('/api/wms/warehouses');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setWarehouses(json.data);
            const myWh = json.data.find((w: any) => w.responsibleUserId === user?.userId) || json.data[0];
            if (myWh) {
              setSelectedWarehouseId(myWh.id);
            }
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки складов:', err);
      }
    }
    loadWarehouses();
  }, [fetchInventories, user?.userId]);

  const handleCreateInventory = async () => {
    if (!selectedWarehouseId) {
      enqueueSnackbar('Выберите склад для проведения инвентаризации', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wms/inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          comment: comment.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Акт инвентаризации создан', { variant: 'success' });
        setIsModalOpen(false);
        router.push(`/wms/inventory/${json.data.id}`);
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания акта', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Ошибка сети при создании инвентаризации', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedWarehouse('');
    setSelectedStatus('');
  };

  const activeFilterCount =
    (search ? 1 : 0) + (selectedWarehouse ? 1 : 0) + (selectedStatus ? 1 : 0);

  const filteredInventories = useMemo(() => {
    return inventories.filter((inv) => {
      if (selectedWarehouse && inv.warehouseId !== selectedWarehouse) return false;
      if (selectedStatus && inv.status !== selectedStatus) return false;
      if (search) {
        const query = search.toLowerCase();
        const codeMatch = `INV-${inv.id.slice(-6)}`.toLowerCase().includes(query);
        const warehouseMatch = inv.warehouse.name.toLowerCase().includes(query) || inv.warehouse.code.toLowerCase().includes(query);
        const authorMatch = inv.createdBy.displayName.toLowerCase().includes(query);
        if (!codeMatch && !warehouseMatch && !authorMatch) return false;
      }
      return true;
    });
  }, [inventories, selectedWarehouse, selectedStatus, search]);

  const sortedInventories = useMemo(() => {
    if (!sortField) return filteredInventories;
    return [...filteredInventories].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (sortField) {
        case 'code':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'warehouse':
          aVal = a.warehouse.name;
          bVal = b.warehouse.name;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'count':
          aVal = a._count.items;
          bVal = b._count.items;
          break;
        case 'date':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'author':
          aVal = a.createdBy.displayName;
          bVal = b.createdBy.displayName;
          break;
        default:
          aVal = (a as unknown as Record<string, unknown>)[sortField] ?? '';
          bVal = (b as unknown as Record<string, unknown>)[sortField] ?? '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [filteredInventories, sortField, sortDirection]);

  const totalInventories = inventories.length;
  const inProgressCount = inventories.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'DRAFT').length;
  const completedCount = inventories.filter((i) => i.status === 'COMPLETED').length;

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Инвентаризация складов"
        subtitle="Сверка фактического наличия ТМЦ с учетными остатками и автоматическая корректировка"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Инвентаризация' },
        ]}
        actions={
          hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedWarehouseId(warehouses[0]?.id || '');
                setComment('');
                setIsModalOpen(true);
              }}
              sx={{
                height: 36,
                px: 2,
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '8px',
                textTransform: 'none',
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
              }}
            >
              Новая инвентаризация
            </Button>
          )
        }
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Всего актов"
            value={totalInventories}
            subtitle="За все периоды учета"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="В процессе сверки"
            value={inProgressCount}
            subtitle="Открытые акты инвентаризации"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Завершенные акты"
            value={completedCount}
            subtitle="Успешно сверенные и закрытые"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {/* Main Inventory Acts Registry Table */}
      <DataTableWrapper
        loading={isLoading}
        total={sortedInventories.length}
        columns={INVENTORY_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        stickyHeader
        empty={sortedInventories.length === 0 && !isLoading}
        emptyState={
          <EmptyState
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
            title="Акты инвентаризации не найдены"
            description={
              activeFilterCount > 0
                ? 'По выбранным критериям акты не найдены. Попробуйте сбросить фильтры.'
                : 'Вы можете инициировать сверку фактических складских остатков по выбранному складу с автоматическим расчетом расхождений.'
            }
            actionText={
              activeFilterCount > 0
                ? 'Сбросить фильтры'
                : hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE)
                ? 'Создать акт инвентаризации'
                : undefined
            }
            onAction={
              activeFilterCount > 0
                ? handleResetFilters
                : hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE)
                ? () => {
                    setSelectedWarehouseId(warehouses[0]?.id || '');
                    setComment('');
                    setIsModalOpen(true);
                  }
                : undefined
            }
          />
        }
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 240 } }}>
              <SearchInput
                value={search}
                placeholder="Поиск по номеру, складу, автору..."
                onSearch={setSearch}
              />
            </Box>

            <TextField
              select
              size="small"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              SelectProps={{
                displayEmpty: true,
              }}
              sx={{
                minWidth: 160,
                backgroundColor: '#ffffff',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  height: 36,
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#cbd5e1' },
                },
              }}
            >
              <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все склады</MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id} sx={{ fontSize: '0.8125rem' }}>
                  {w.name} ({w.code})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              SelectProps={{
                displayEmpty: true,
              }}
              sx={{
                minWidth: 160,
                backgroundColor: '#ffffff',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  height: 36,
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#cbd5e1' },
                },
              }}
            >
              <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все статусы</MenuItem>
              <MenuItem value="IN_PROGRESS" sx={{ fontSize: '0.8125rem' }}>В процессе</MenuItem>
              <MenuItem value="COMPLETED" sx={{ fontSize: '0.8125rem' }}>Завершена</MenuItem>
            </TextField>
          </FilterToolbar>
        }
      >
        <Table size="small" aria-label="Реестр актов инвентаризации">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#ffffff' }}>
              {visibleColumns.includes('code') && (
                <TableCell sx={{ fontWeight: 700, width: 140, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'code'}
                    direction={sortField === 'code' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('code')}
                  >
                    НОМЕР / АКТ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('warehouse') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'warehouse'}
                    direction={sortField === 'warehouse' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('warehouse')}
                  >
                    СКЛАД
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('status') && (
                <TableCell sx={{ fontWeight: 700, width: 130, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    СТАТУС
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('count') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'count'}
                    direction={sortField === 'count' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('count')}
                  >
                    ПОЗИЦИЙ В АКТЕ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('date') && (
                <TableCell sx={{ fontWeight: 700, width: 160, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'date'}
                    direction={sortField === 'date' ? sortDirection : 'desc'}
                    onClick={() => handleRequestSort('date')}
                  >
                    ДАТА СОЗДАНИЯ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('author') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  <TableSortLabel
                    active={sortField === 'author'}
                    direction={sortField === 'author' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('author')}
                  >
                    ОТВЕТСТВЕННЫЙ
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('actions') && (
                <TableCell align="right" sx={{ fontWeight: 700, width: 140, fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
                  ДЕЙСТВИЯ
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedInventories.map((inv) => (
              <TableRow
                key={inv.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => router.push(`/wms/inventory/${inv.id}`)}
              >
                {visibleColumns.includes('code') && (
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8125rem', color: '#0284c7' }}>
                    INV-{inv.id.slice(-6).toUpperCase()}
                  </TableCell>
                )}

                {visibleColumns.includes('warehouse') && (
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', color: '#0f172a' }}>
                      {inv.warehouse.name}
                    </Typography>
                    <Chip
                      label={inv.warehouse.code}
                      size="small"
                      sx={{
                        mt: 0.2,
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        height: 20,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                      }}
                    />
                  </TableCell>
                )}

                {visibleColumns.includes('status') && (
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                )}

                {visibleColumns.includes('count') && (
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', color: '#334155' }}>
                      {inv._count.items} поз.
                    </Typography>
                  </TableCell>
                )}

                {visibleColumns.includes('date') && (
                  <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: '#64748b' }}>
                    {formatDateTime(inv.createdAt)}
                  </TableCell>
                )}

                {visibleColumns.includes('author') && (
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#334155' }}>
                    {inv.createdBy.displayName}
                  </TableCell>
                )}

                {visibleColumns.includes('actions') && (
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FactCheckOutlinedIcon sx={{ fontSize: '14px !important', color: '#0284c7' }} />}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch(`/api/wms/inventories/${inv.id}`);
                            if (res.ok) {
                              const json = await res.json();
                              if (json.success && json.data) {
                                setSelectedSheetInventory(json.data);
                                setIsCountSheetOpen(true);
                              }
                            } else {
                              enqueueSnackbar('Не удалось загрузить данные бланка', { variant: 'error' });
                            }
                          } catch {
                            enqueueSnackbar('Ошибка сети при открытии бланка', { variant: 'error' });
                          }
                        }}
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          py: 0.3,
                          px: 1,
                          borderColor: '#bae6fd',
                          color: '#0284c7',
                          backgroundColor: '#f0f9ff',
                          '&:hover': {
                            backgroundColor: '#e0f2fe',
                            borderColor: '#7dd3fc',
                          },
                        }}
                      >
                        Бланк
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                        onClick={() => router.push(`/wms/inventory/${inv.id}`)}
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          py: 0.3,
                          px: 1.25,
                          borderColor: '#e2e8f0',
                          color: '#334155',
                        }}
                      >
                        {inv.status === 'COMPLETED' ? 'Просмотр' : 'Сверка'}
                      </Button>
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Модальное окно запуска инвентаризации */}
      <FormDialog
        open={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Создание акта инвентаризации"
        icon={<FactCheckOutlinedIcon color="primary" />}
        maxWidth="sm"
        loading={isSubmitting}
        submitLabel={isSubmitting ? 'Создание...' : 'Начать инвентаризацию'}
        onSubmit={handleCreateInventory}
        submitDisabled={!selectedWarehouseId || isSubmitting}
      >
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            При создании акта система зафиксирует текущие учетные остатки по всем позициям выбранного склада.
          </Typography>

          <TextField
            select
            fullWidth
            required
            label="Склад для инвентаризации"
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">
              <em>— Выберите склад для инвентаризации —</em>
            </MenuItem>
            {warehouses.map((w) => {
              const isMine = w.responsibleUserId === user?.userId;

              return (
                <MenuItem key={w.id} value={w.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>{w.name} ({w.code})</span>
                    {isMine ? (
                      <StatusBadge status="WAREHOUSE" label="Мой склад" size="small" />
                    ) : w.responsibleUser ? (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        МОЛ: {w.responsibleUser.displayName}
                      </Typography>
                    ) : null}
                  </Box>
                </MenuItem>
              );
            })}
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Основание / Примечание"
            placeholder="Плановая квартальная инвентаризация, приказ №..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Stack>
      </FormDialog>

      {/* Бланк инвентаризационной описи ТМЦ */}
      {selectedSheetInventory && (
        <InventoryCountSheetDialog
          open={isCountSheetOpen}
          onClose={() => {
            setIsCountSheetOpen(false);
            setSelectedSheetInventory(null);
          }}
          inventory={selectedSheetInventory}
        />
      )}
    </Box>
  );
}
