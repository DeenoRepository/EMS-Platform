'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
} from '@mui/material';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import PageHeader from '@/components/layout/PageHeader';
import { useSearchParams } from 'next/navigation';
import {
  AUDIT_ACTION_MAP,
  PERMISSIONS,
} from '@ems/shared';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';

import {
  StatCard,
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  PageLoading,
  DatePickerField,
  type TableColumnOption,
} from '@/components/ui';
import AuditDiffModal, { AuditLogItem } from '@/components/eps/history/AuditDiffModal';
import AuditLogTableView from '@/components/eps/history/AuditLogTableView';
import { sortHistoryItems } from './history-sort';

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string | null;
}

const HISTORY_COLUMNS: TableColumnOption[] = [
  { id: 'createdAt', label: 'Дата и время', defaultVisible: true },
  { id: 'user', label: 'Пользователь', defaultVisible: true },
  { id: 'action', label: 'Действие', defaultVisible: true },
  { id: 'entityType', label: 'Сущность', defaultVisible: true },
  { id: 'equipment', label: 'Оборудование', defaultVisible: true },
  { id: 'changes', label: 'Детализация изменений', defaultVisible: true },
];

function HistoryListContent() {
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();

  const canAccessHistory = user?.roles?.includes('admin') || hasPermission(PERMISSIONS.EPS_HISTORY_VIEW);

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filters
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [actionFilter, setActionFilter] = useState(searchParams?.get('action') || '');
  const [equipmentFilter, setEquipmentFilter] = useState(searchParams?.get('equipmentId') || '');
  const [startDate, setStartDate] = useState(searchParams?.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams?.get('endDate') || '');
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);

  // Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    HISTORY_COLUMNS.map((c) => c.id)
  );

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const loadEquipment = useCallback(async () => {
    try {
      const res = await fetch('/api/eps/equipment?pageSize=1000');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const list = json.data?.items || json.data || [];
          setEquipmentList(list);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      if (equipmentFilter) params.set('equipmentId', equipmentFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/eps/history?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items || []);
          setTotal(json.data.total || 0);
        }
      } else {
        enqueueSnackbar('Ошибка при загрузке истории аудита', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при загрузке истории аудита', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, actionFilter, equipmentFilter, startDate, endDate, enqueueSnackbar]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const sortedItems = useMemo(
    () => sortHistoryItems(items, sortField, sortDirection),
    [items, sortField, sortDirection]
  );

  const stats = useMemo(() => {
    const creates = items.filter((i) => i.action === 'CREATE').length;
    const updates = items.filter((i) => i.action === 'UPDATE').length;
    const deletes = items.filter((i) => i.action === 'DELETE').length;
    return {
      total,
      creates,
      updates,
      deletes,
    };
  }, [items, total]);

  const activeFilterCount =
    (search ? 1 : 0) +
    (actionFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('');
    setEquipmentFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  if (!canAccessHistory) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="История изменений и аудит"
          subtitle="Журнал фиксации изменений карточек, паспортов, документов и параметров оборудования"
          breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Оборудование', href: '/eps' }, { label: 'Аудит' }]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вас нет прав для просмотра журнала аудита оборудования."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="История изменений и аудит"
        subtitle="Журнал фиксации изменений карточек, паспортов, документов и параметров оборудования"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Оборудование', href: '/eps' }, { label: 'Аудит' }]}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего событий"
            value={stats.total}
            subtitle="Зафиксировано в журнале"
            icon={<TimelineIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="primary.main"
            accentColor="primary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Создание объектов"
            value={stats.creates}
            subtitle="Регистрация и добавление"
            icon={<AddCircleOutlineIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="success.main"
            accentColor="success.main"
            loading={loading}
            active={actionFilter === 'CREATE'}
            onClick={() => {
              setActionFilter(actionFilter === 'CREATE' ? '' : 'CREATE');
              setPage(1);
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Корректировка"
            value={stats.updates}
            subtitle="Редактирование параметров"
            icon={<EditNoteIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="warning.main"
            accentColor="warning.main"
            loading={loading}
            active={actionFilter === 'UPDATE'}
            onClick={() => {
              setActionFilter(actionFilter === 'UPDATE' ? '' : 'UPDATE');
              setPage(1);
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Удаление / списание"
            value={stats.deletes}
            subtitle="Исключение из системы"
            icon={<DeleteForeverOutlinedIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="error.main"
            accentColor="error.main"
            loading={loading}
            active={actionFilter === 'DELETE'}
            onClick={() => {
              setActionFilter(actionFilter === 'DELETE' ? '' : 'DELETE');
              setPage(1);
            }}
          />
        </Grid>
      </Grid>

      <DataTableWrapper
        loading={loading}
        total={total}
        page={page - 1}
        pageSize={pageSize}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        storageKey="eps_history_table"
        columns={HISTORY_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        stickyHeader
        empty={items.length === 0 && !loading}
        emptyState={
          <EmptyState
            icon={<HistoryOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
            title="События аудита не найдены"
            description={
              activeFilterCount > 0
                ? 'По выбранным параметрам фильтрации события аудита не найдены. Попробуйте сбросить фильтры.'
                : 'В журнале аудита пока нет зафиксированных событий.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : undefined}
            onAction={activeFilterCount > 0 ? handleResetFilters : undefined}
          />
        }
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по событиям, пользователю, объекту..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>
            <TextField
              select
              size="small"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Все действия</MenuItem>
              {Object.entries(AUDIT_ACTION_MAP).map(([key, info]) => (
                <MenuItem key={key} value={key}>
                  {info.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              value={equipmentFilter}
              onChange={(e) => {
                setEquipmentFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Все оборудование</MenuItem>
              {equipmentList.map((eq) => (
                <MenuItem key={eq.id} value={eq.id}>
                  {eq.inventoryNumber ? `[${eq.inventoryNumber}] ` : ''}{eq.name}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ width: 140 }}>
              <DatePickerField
                size="small"
                label="С даты"
                value={startDate}
                onChange={(val) => {
                  setStartDate(val || '');
                  setPage(1);
                }}
              />
            </Box>

            <Box sx={{ width: 140 }}>
              <DatePickerField
                size="small"
                label="По дату"
                value={endDate}
                onChange={(val) => {
                  setEndDate(val || '');
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <AuditLogTableView
          items={sortedItems}
          visibleColumns={visibleColumns}
          sortField={sortField}
          sortDirection={sortDirection}
          onRequestSort={handleRequestSort}
          onOpenDiff={(log) => setSelectedLog(log)}
        />
      </DataTableWrapper>

      <AuditDiffModal
        open={Boolean(selectedLog)}
        selectedLog={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </Box>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка журнала аудита..." />}>
      <HistoryListContent />
    </Suspense>
  );
}
