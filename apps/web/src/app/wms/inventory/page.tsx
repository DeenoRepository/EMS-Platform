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
  type TableColumnOption,
} from '@/components/ui';
import { InventoryCountSheetDialog } from '@/components/wms';
import { TableSortLabel } from '@mui/material';
import WmsInventoryFilters from '@/components/wms/WmsInventoryFilters';
import { countActiveInventoryFilters } from './filter-state';
import { filterInventories, type InventoryItemSummary } from './inventory-filter';
import { sortInventories } from './inventory-sort';
import { getInventoryStats } from './inventory-stats';

const INVENTORY_COLUMNS: TableColumnOption[] = [
  { id: 'code', label: 'Номер / Акт', defaultVisible: true, required: true },
  { id: 'warehouse', label: 'Склад', defaultVisible: true },
  { id: 'status', label: 'Статус', defaultVisible: true },
  { id: 'count', label: 'Позиций в акте', defaultVisible: true },
  { id: 'date', label: 'Дата создания', defaultVisible: true },
  { id: 'author', label: 'Ответственный', defaultVisible: true },
  { id: 'actions', label: 'Действия', defaultVisible: true, required: true },
];

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
    } catch {
      enqueueSnackbar('Ошибка загрузки актов инвентаризации', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [enqueueSnackbar]);

  const canAccessInventory =
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE) ||
    hasPermission(PERMISSIONS.WMS_STOCK_VIEW);

  useEffect(() => {
    if (canAccessInventory) {
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
    }
  }, [canAccessInventory, fetchInventories, user?.userId]);

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

  const openCreateInventoryModal = useCallback(() => {
    setSelectedWarehouseId(warehouses[0]?.id || '');
    setComment('');
    setIsModalOpen(true);
  }, [warehouses]);

  const activeFilterCount = countActiveInventoryFilters(search, selectedWarehouse, selectedStatus);

  const filteredInventories = useMemo(
    () => filterInventories(inventories, selectedWarehouse, selectedStatus, search),
    [inventories, selectedWarehouse, selectedStatus, search]
  );

  const sortedInventories = useMemo(
    () => sortInventories(filteredInventories, sortField, sortDirection),
    [filteredInventories, sortField, sortDirection]
  );

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const paginatedInventories = useMemo(() => {
    return sortedInventories.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [sortedInventories, page, rowsPerPage]);

  const { totalInventories, inProgressCount, completedCount } = getInventoryStats(inventories);

  if (!canAccessInventory) {
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
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет полномочий для доступа к разделу инвентаризации (требуется право wms.inventory.manage или wms.stock.view)."
          icon={<FactCheckOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

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
              onClick={openCreateInventoryModal}
              sx={{
                height: 36,
                px: 2,
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '8px',
                textTransform: 'none',
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
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
            iconColor="primary.main"
            accentColor="primary.main"
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
            iconColor="warning.main"
            accentColor="warning.main"
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
            iconColor="success.main"
            accentColor="success.main"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {/* Main Inventory Acts Registry Table */}
      <DataTableWrapper
        loading={isLoading}
        page={page}
        pageSize={rowsPerPage}
        total={sortedInventories.length}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        pageSizeOptions={[15, 25, 50, 100]}
        storageKey="wms_inventory_table"
        columns={INVENTORY_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        stickyHeader
        empty={sortedInventories.length === 0 && !isLoading}
        emptyState={
          <EmptyState
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
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
                ? openCreateInventoryModal
                : undefined
            }
          />
        }
        toolbar={
          <WmsInventoryFilters
            activeFilterCount={activeFilterCount}
            search={search}
            selectedWarehouse={selectedWarehouse}
            selectedStatus={selectedStatus}
            warehouses={warehouses}
            onSearchChange={setSearch}
            onWarehouseChange={setSelectedWarehouse}
            onStatusChange={setSelectedStatus}
            onResetFilters={handleResetFilters}
          />
        }
      >
        <Table size="small" aria-label="Реестр актов инвентаризации">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              {visibleColumns.includes('code') && (
                <TableCell sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={sortField === 'code'}
                    direction={sortField === 'code' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('code')}
                  >
                    Номер / Акт
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('warehouse') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'warehouse'}
                    direction={sortField === 'warehouse' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('warehouse')}
                  >
                    Склад проведения
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('status') && (
                <TableCell sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    Статус
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('count') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'count'}
                    direction={sortField === 'count' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('count')}
                  >
                    Позиций в акте
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('date') && (
                <TableCell sx={{ minWidth: 150 }}>
                  <TableSortLabel
                    active={sortField === 'date'}
                    direction={sortField === 'date' ? sortDirection : 'desc'}
                    onClick={() => handleRequestSort('date')}
                  >
                    Дата создания
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('author') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'author'}
                    direction={sortField === 'author' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('author')}
                  >
                    Ответственный
                  </TableSortLabel>
                </TableCell>
              )}

              {visibleColumns.includes('actions') && (
                <TableCell align="right" sx={{ minWidth: 120 }}>
                  Действия
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedInventories.map((inv) => (
              <TableRow
                key={inv.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => router.push(`/wms/inventory/${inv.id}`)}
              >
                {visibleColumns.includes('code') && (
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8125rem', color: 'primary.main' }}>
                    INV-{inv.id.slice(-6).toUpperCase()}
                  </TableCell>
                )}

                {visibleColumns.includes('warehouse') && (
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
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
                        backgroundColor: 'background.paper',
                        border: '1px solid divider',
                        color: 'text.secondary',
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
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {inv._count.items} поз.
                    </Typography>
                  </TableCell>
                )}

                {visibleColumns.includes('date') && (
                  <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'text.disabled' }}>
                    {formatDateTime(inv.createdAt)}
                  </TableCell>
                )}

                {visibleColumns.includes('author') && (
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'text.secondary' }}>
                    {inv.createdBy.displayName}
                  </TableCell>
                )}

                {visibleColumns.includes('actions') && (
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FactCheckOutlinedIcon sx={{ fontSize: '14px !important', color: 'primary.main' }} />}
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
                          borderColor: 'primary.light',
                          color: 'primary.main',
                          backgroundColor: 'info.light',
                          '&:hover': {
                            backgroundColor: 'info.light',
                            borderColor: 'primary.light',
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
                          borderColor: 'divider',
                          color: 'text.secondary',
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
