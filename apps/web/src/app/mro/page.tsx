'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Grid,
  MenuItem,
  TextField,
  Button,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventIcon from '@mui/icons-material/Event';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import {
  StatCard,
  SearchInput,
  FilterToolbar,
  DataTableWrapper,
  PageLoading,
  ModuleMaintenanceState,
  type TableColumnOption,
} from '@/components/ui';
import { MroExecutionWizardDialog } from '@/components/mro';
import { PERMISSIONS, PlatformMaintenanceStatus } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import MroSchedulesTable, { MaintenanceScheduleRow } from '@/components/mro/MroSchedulesTable';
import { compareMaintenanceSchedules } from './schedule-sort';
import { getMaintenanceScheduleStats } from './schedule-stats';

const MRO_COLUMNS: TableColumnOption[] = [
  { id: 'scheduledDate', label: 'Плановый срок проведения', defaultVisible: true },
  { id: 'equipment', label: 'Технологическая единица оборудования', defaultVisible: true },
  { id: 'plan', label: 'План регламентного обслуживания', defaultVisible: true },
  { id: 'periodicity', label: 'Периодичность регламента', defaultVisible: true },
  { id: 'status', label: 'Статус исполнения наряда', defaultVisible: true },
  { id: 'location', label: 'Место установки оборудования', defaultVisible: false },
  { id: 'completedBy', label: 'Ответственный исполнитель / Бригадир', defaultVisible: true },
  { id: 'actions', label: 'Операции', defaultVisible: true, required: true },
];

function MroPageContent() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [schedules, setSchedules] = useState<MaintenanceScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [periodicityFilter, setPeriodicityFilter] = useState('');

  // Execution Wizard State
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [isExecutionWizardOpen, setIsExecutionWizardOpen] = useState(false);

  // Sorting & Columns
  const [sortField, setSortField] = useState<string>('scheduledDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    MRO_COLUMNS.filter((c) => c.defaultVisible !== false).map((c) => c.id)
  );

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [maintStatus, setMaintStatus] = useState<PlatformMaintenanceStatus | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const [res, maintRes] = await Promise.all([
        fetch(`/api/mro/schedules?${params.toString()}`),
        fetch('/api/system/maintenance'),
      ]);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSchedules(json.data);
        } else {
          setSchedules([]);
        }
      }
      if (maintRes.ok) {
        const maintJson = await maintRes.json();
        if (maintJson.success && maintJson.data) {
          setMaintStatus(maintJson.data);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке графиков ТО', { variant: 'error' });
      setSchedules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, enqueueSnackbar]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  const stats = useMemo(() => getMaintenanceScheduleStats(schedules, new Date()), [schedules]);

  const sortedSchedules = useMemo(() => {
    const now = new Date();
    const list = schedules.filter((sch) => {
      if (search) {
        const q = search.toLowerCase();
        const eqName = sch.equipment?.name?.toLowerCase() || '';
        const eqInv = sch.equipment?.inventoryNumber?.toLowerCase() || '';
        const planName = sch.plan?.name?.toLowerCase() || '';
        if (!eqName.includes(q) && !eqInv.includes(q) && !planName.includes(q)) {
          return false;
        }
      }
      if (periodicityFilter && sch.plan?.frequency !== periodicityFilter) {
        return false;
      }
      if (statusFilter) {
        if (statusFilter === 'OVERDUE') {
          const isOverdue =
            sch.status === 'MISSED' || (sch.status === 'PLANNED' && new Date(sch.scheduledDate) < now);
          if (!isOverdue) return false;
        } else if (sch.status !== statusFilter) {
          return false;
        }
      }
      return true;
    });

    list.sort((a, b) => compareMaintenanceSchedules(a, b, sortField, sortDirection));

    return list;
  }, [schedules, search, periodicityFilter, statusFilter, sortField, sortDirection]);

  const paginatedSchedules = useMemo(() => {
    return sortedSchedules.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [sortedSchedules, page, rowsPerPage]);

  const activeFilterCount = (search ? 1 : 0) + (statusFilter ? 1 : 0) + (periodicityFilter ? 1 : 0);

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const handleExecuteMro = (schedule: MaintenanceScheduleRow) => {
    setSelectedSchedule({
      id: schedule.id,
      scheduledDate: schedule.scheduledDate,
      equipment: schedule.equipment,
      plan: schedule.plan,
    });
    setIsExecutionWizardOpen(true);
  };

  const canExecute = hasPermission(PERMISSIONS.MRO_EXECUTION_COMPLETE);
  const canManage = hasPermission(PERMISSIONS.MRO_SCHEDULE_MANAGE);

  return (
    <Box sx={{ pb: 4 }}>
      {maintStatus?.modules?.mro?.enabled && (
        <ModuleMaintenanceState
          moduleName="MRO (ТОиР)"
          message={maintStatus.modules.mro.message}
        />
      )}

      <PageHeader
        title="График ППР и наряды на ТО"
        subtitle="Планирование, маршрутизация и подтверждение проведения планово-предупредительных ремонтов"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'ТОиР', href: '/mro' }, { label: 'График ППР' }]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Обновить
            </Button>
            {canManage && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => router.push('/mro/schedules/new')}
                sx={{ fontWeight: 700 }}
              >
                Создать наряд
              </Button>
            )}
          </Box>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Просрочено ТО"
            value={stats.overdue}
            subtitle="Требуют срочного ТО"
            icon={<WarningAmberIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="error.main"
            accentColor="error.main"
            loading={loading}
            active={statusFilter === 'OVERDUE'}
            onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? '' : 'OVERDUE')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Запланировано"
            value={stats.planned}
            subtitle="Ожидают выполнения"
            icon={<CalendarMonthIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="primary.main"
            accentColor="primary.main"
            loading={loading}
            active={statusFilter === 'PLANNED'}
            onClick={() => setStatusFilter(statusFilter === 'PLANNED' ? '' : 'PLANNED')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Выполнено в срок"
            value={stats.completed}
            subtitle="Успешно завершено"
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="success.main"
            accentColor="success.main"
            loading={loading}
            active={statusFilter === 'COMPLETED'}
            onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? '' : 'COMPLETED')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего регламентов"
            value={stats.total}
            subtitle="За все периоды"
            icon={<EventIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(100, 116, 139, 0.08)"
            iconColor="text.secondary"
            loading={loading}
            active={statusFilter === '' && periodicityFilter === '' && !search}
            onClick={() => {
              setStatusFilter('');
              setPeriodicityFilter('');
              setSearch('');
            }}
          />
        </Grid>
      </Grid>

      <DataTableWrapper
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={() => {
              setSearch('');
              setStatusFilter('');
              setPeriodicityFilter('');
            }}
          >
            <Box sx={{ minWidth: 260 }}>
              <SearchInput
                placeholder="Поиск по оборудованию, регламенту..."
                value={search}
                onSearch={setSearch}
              />
            </Box>
            <TextField
              select
              size="small"
              label="Статус регламента"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Все статусы</MenuItem>
              <MenuItem value="PLANNED">Запланировано</MenuItem>
              <MenuItem value="OVERDUE">Просрочено</MenuItem>
              <MenuItem value="IN_PROGRESS">В работе</MenuItem>
              <MenuItem value="COMPLETED">Выполнено</MenuItem>
              <MenuItem value="CANCELLED">Отменено</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Периодичность"
              value={periodicityFilter}
              onChange={(e) => setPeriodicityFilter(e.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">Любая периодичность</MenuItem>
              <MenuItem value="Ежедневно">Ежедневно</MenuItem>
              <MenuItem value="Еженедельно">Еженедельно</MenuItem>
              <MenuItem value="Ежемесячно">Ежемесячно</MenuItem>
              <MenuItem value="Ежеквартально">Ежеквартально</MenuItem>
              <MenuItem value="1 раз в полгода">1 раз в полгода</MenuItem>
              <MenuItem value="1 раз в год">1 раз в год</MenuItem>
            </TextField>
          </FilterToolbar>
        }
        total={sortedSchedules.length}
        page={page}
        pageSize={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        columns={MRO_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        loading={loading}
      >
        <MroSchedulesTable
          schedules={paginatedSchedules}
          visibleColumns={visibleColumns}
          sortField={sortField}
          sortDirection={sortDirection}
          canExecute={canExecute}
          onRequestSort={handleRequestSort}
          onExecute={handleExecuteMro}
        />
      </DataTableWrapper>

      {/* Execution Wizard Dialog */}
      {selectedSchedule && (
        <MroExecutionWizardDialog
          open={isExecutionWizardOpen}
          schedule={selectedSchedule}
          onClose={() => {
            setIsExecutionWizardOpen(false);
            setSelectedSchedule(null);
          }}
          onSuccess={() => {
            setIsExecutionWizardOpen(false);
            setSelectedSchedule(null);
            fetchSchedules();
          }}
        />
      )}
    </Box>
  );
}

export default function MroPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка графиков ТОиР..." />}>
      <MroPageContent />
    </Suspense>
  );
}
