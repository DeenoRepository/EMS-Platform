'use client';

import React, { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { WmsOperationWizardDialog } from '@/components/wms';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';

import { PERMISSIONS, formatDateTime } from '@ems/shared';
import {
  StatCard,
  FilterToolbar,
  DataTableWrapper,
  EmptyState,
  StatusBadge,
  PageLoading,
  type TableColumnOption,
} from '@/components/ui';

const OPERATIONS_COLUMNS: TableColumnOption[] = [
  { id: 'date', label: 'Дата / Время', defaultVisible: true },
  { id: 'type', label: 'Тип операции', defaultVisible: true },
  { id: 'warehouse', label: 'Склад', defaultVisible: true },
  { id: 'items', label: 'Позиции и количество', defaultVisible: true, required: true },
  { id: 'recipient', label: 'Получатель / Назначение / Причина', defaultVisible: true },
  { id: 'comment', label: 'Примечание / Комментарий', defaultVisible: true },
  { id: 'executor', label: 'Исполнитель', defaultVisible: true },
];

export type OperationMode = 'RECEIPT' | 'ISSUE_EMPLOYEE' | 'ISSUE_WRITE_OFF' | 'TRANSFER';

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
  responsibleUserId?: string | null;
}

function WmsOperationsContent() {
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();

  const [operations, setOperations] = useState<StockOperation[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('action') || '');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Wizard Dialog State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<OperationMode>('RECEIPT');

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    OPERATIONS_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
  );

  // Load Warehouses for filter dropdown
  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await fetch('/api/wms/warehouses');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setWarehouses(json.data);
            const userWh = json.data.find((w: WarehouseOption) => w.responsibleUserId === user?.userId);
            if (userWh && !user?.roles?.includes('admin')) {
              setSelectedWarehouse(userWh.id);
            }
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки складов:', err);
      }
    }
    loadWarehouses();
  }, [user?.userId, user?.roles]);

  // Open Wizard if query parameter passed
  useEffect(() => {
    const action = searchParams.get('action') || searchParams.get('create');
    if (action) {
      if (action === 'RECEIPT') {
        setWizardType('RECEIPT');
        setIsWizardOpen(true);
      } else if (action === 'ISSUE' || action === 'ISSUE_EMPLOYEE') {
        setWizardType('ISSUE_EMPLOYEE');
        setIsWizardOpen(true);
      } else if (action === 'ISSUE_WRITE_OFF' || action === 'WRITE_OFF') {
        setWizardType('ISSUE_WRITE_OFF');
        setIsWizardOpen(true);
      } else if (action === 'TRANSFER') {
        setWizardType('TRANSFER');
        setIsWizardOpen(true);
      }
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

  const handleKpiFilter = (type: string) => {
    setSelectedType((prev) => (prev === type ? '' : type));
    setPage(0);
  };

  const handleResetFilters = () => {
    setSelectedWarehouse('');
    setSelectedType('');
    setPage(0);
  };

  const activeFilterCount = (selectedWarehouse ? 1 : 0) + (selectedType ? 1 : 0);

  const renderRecipientBadge = (op: StockOperation) => {
    if (op.type === 'RECEIPT') {
      return (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <MoveToInboxIcon sx={{ fontSize: 16, color: '#16a34a' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#15803d', fontWeight: 600 }}>
            {op.counterparty ? `Поставщик: ${op.counterparty}` : 'Приход ТМЦ на склад'}
          </Typography>
        </Stack>
      );
    }

    if (op.type === 'ISSUE_EMPLOYEE') {
      return (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <PersonIcon sx={{ fontSize: 16, color: '#1d4ed8' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#1d4ed8', fontWeight: 600 }}>
            {op.counterparty || 'Сотрудник в подотчет'}
          </Typography>
        </Stack>
      );
    }

    if (op.type === 'ISSUE_WRITE_OFF') {
      const firstItemWithEq = op.items.find((it) => it.equipment);
      if (firstItemWithEq && firstItemWithEq.equipment) {
        return (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <PrecisionManufacturingIcon sx={{ fontSize: 16, color: '#b45309' }} />
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#b45309', fontWeight: 600 }}>
              Станок: {firstItemWithEq.equipment.name} ({firstItemWithEq.equipment.inventoryNumber})
            </Typography>
          </Stack>
        );
      }
      return (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <DeleteSweepIcon sx={{ fontSize: 16, color: '#dc2626' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#b91c1c', fontWeight: 600 }}>
            {op.counterparty || 'Списание в неликвид/брак'}
          </Typography>
        </Stack>
      );
    }

    if (op.type === 'TRANSFER') {
      return (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <SwapHorizIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#6d28d9', fontWeight: 600 }}>
            {op.counterparty ? `Целевой склад: ${op.counterparty}` : 'Перемещение между складами'}
          </Typography>
        </Stack>
      );
    }

    return (
      <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#475569' }}>
        {op.counterparty || '—'}
      </Typography>
    );
  };

  const sortedOperations = useMemo(() => {
    return [...operations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [operations]);

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Журнал складских операций"
        subtitle="Реестр приходов, списаний, выдач сотрудникам и межскладских перемещений ТМЦ"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Складской учёт', href: '/wms' },
          { label: 'Операции' },
        ]}
        actions={
          hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
            <Button
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => {
                setWizardType('RECEIPT');
                setIsWizardOpen(true);
              }}
              aria-label="Оформить операцию через мастер"
              sx={{
                px: 2.5,
                py: 0.85,
                fontWeight: 700,
                borderRadius: '8px',
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
              }}
            >
              Мастер складских операций
            </Button>
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
            title="Выдачи и Списания"
            value={operations.filter((o) => o.type === 'ISSUE' || o.type === 'ISSUE_EMPLOYEE' || o.type === 'ISSUE_WRITE_OFF').length}
            subtitle="В подотчет и на станки"
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

      {/* Main Operations Registry Table */}
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
        columns={OPERATIONS_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
          >
            <TextField
              select
              size="small"
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setPage(0);
              }}
              sx={{
                minWidth: 200,
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
              <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>
                Все склады
              </MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id} sx={{ fontSize: '0.8125rem' }}>
                  {w.name} ({w.code})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(0);
              }}
              sx={{
                minWidth: 200,
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
              <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>
                Все типы операций
              </MenuItem>
              <MenuItem value="RECEIPT" sx={{ fontSize: '0.8125rem' }}>
                Поступление (Приход)
              </MenuItem>
              <MenuItem value="ISSUE_EMPLOYEE" sx={{ fontSize: '0.8125rem' }}>
                Выдача сотруднику
              </MenuItem>
              <MenuItem value="ISSUE_WRITE_OFF" sx={{ fontSize: '0.8125rem' }}>
                Списание на оборудование (ТОиР / брак)
              </MenuItem>
              <MenuItem value="TRANSFER" sx={{ fontSize: '0.8125rem' }}>
                Перемещение (Трансфер)
              </MenuItem>
            </TextField>
          </FilterToolbar>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              {visibleColumns.includes('date') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                  Дата / Время
                </TableCell>
              )}
              {visibleColumns.includes('type') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                  Тип операции
                </TableCell>
              )}
              {visibleColumns.includes('warehouse') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                  Склад
                </TableCell>
              )}
              {visibleColumns.includes('items') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                  Позиции ТМЦ и количество
                </TableCell>
              )}
              {visibleColumns.includes('recipient') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                  Назначение / Получатель / Станок
                </TableCell>
              )}
              {visibleColumns.includes('comment') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                  Примечание
                </TableCell>
              )}
              {visibleColumns.includes('executor') && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>
                  Исполнитель
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedOperations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} sx={{ py: 6 }}>
                  <EmptyState
                    icon={<SwapHorizIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
                    title="Операций не найдено"
                    description="В журнале пока нет записей о движении ТМЦ, соответствующих выбранным фильтрам."
                    actionText={hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) ? "Оформить операцию через мастер" : undefined}
                    actionIcon={<AutoAwesomeIcon />}
                    onAction={hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) ? () => {
                      setWizardType('RECEIPT');
                      setIsWizardOpen(true);
                    } : undefined}
                    minHeight={200}
                  />
                </TableCell>
              </TableRow>
            ) : (
              sortedOperations.map((op) => (
                <TableRow key={op.id} hover>
                  {visibleColumns.includes('date') && (
                    <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#475569' }}>
                      {formatDateTime(op.date)}
                    </TableCell>
                  )}

                  {visibleColumns.includes('type') && (
                    <TableCell>
                      <StatusBadge status={op.type} />
                    </TableCell>
                  )}

                  {visibleColumns.includes('warehouse') && (
                    <TableCell>
                      <Chip
                        label={op.warehouse.code}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          borderRadius: '4px',
                          fontSize: '0.6875rem',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          height: 20,
                        }}
                      />
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: '#64748b', fontSize: '0.75rem' }}>
                        {op.warehouse.name}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes('items') && (
                    <TableCell>
                      <Stack spacing={0.5}>
                        {op.items.map((it) => (
                          <Typography key={it.id} variant="body2" sx={{ fontSize: '0.8125rem', color: '#0f172a' }}>
                            <b>{it.nomenclature.name}</b>: {it.quantity} {it.nomenclature.unit}
                          </Typography>
                        ))}
                      </Stack>
                    </TableCell>
                  )}

                  {visibleColumns.includes('recipient') && (
                    <TableCell>
                      {renderRecipientBadge(op)}
                    </TableCell>
                  )}

                  {visibleColumns.includes('comment') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                        {op.comment || '—'}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes('executor') && (
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem', color: '#334155' }}>
                        {op.createdBy?.displayName}
                      </Typography>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Пошаговый мастер оформления складских операций */}
      <WmsOperationWizardDialog
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialType={wizardType}
        onSuccess={() => {
          fetchOperations();
        }}
      />
    </Box>
  );
}

export default function WmsOperationsPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка журнала складских операций..." />}>
      <WmsOperationsContent />
    </Suspense>
  );
}
