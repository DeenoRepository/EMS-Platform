'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Stack,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventIcon from '@mui/icons-material/Event';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import {
  StatCard,
  StatusBadge,
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  PageLoading,
  type TableColumnOption,
} from '@/components/ui';
import { MroExecutionWizardDialog } from '@/components/mro';
import { formatDateTime, formatDate, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';

interface MaintenanceScheduleItem {
  id: string;
  equipmentId: string;
  planId: string | null;
  scheduledDate: string;
  actualDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    serialNumber: string | null;
    location: string | null;
    status: string;
  };
  plan?: {
    id: string;
    name: string;
    frequency: string;
    checklist?: {
      id: string;
      title: string;
      items: Array<{ id: string; text: string; isRequired: boolean }>;
    } | null;
  } | null;
  completedBy?: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
}

const MRO_COLUMNS: TableColumnOption[] = [
  { id: 'scheduledDate', label: 'Дата плана / Срок', defaultVisible: true },
  { id: 'equipment', label: 'Оборудование', defaultVisible: true },
  { id: 'plan', label: 'Регламент / Техкарта', defaultVisible: true },
  { id: 'periodicity', label: 'Периодичность', defaultVisible: true },
  { id: 'status', label: 'Статус исполнения', defaultVisible: true },
  { id: 'location', label: 'Локация', defaultVisible: false },
  { id: 'completedBy', label: 'Исполнитель', defaultVisible: true },
  { id: 'actions', label: 'Действия', defaultVisible: true, required: true },
];

function MroPageContent() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [schedules, setSchedules] = useState<MaintenanceScheduleItem[]>([]);
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

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/mro/schedules?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSchedules(json.data);
        } else {
          setSchedules([]);
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

  // KPIs
  const stats = useMemo(() => {
    const now = new Date();
    const total = schedules.length;
    const overdue = schedules.filter(
      (s) => s.status === 'MISSED' || (s.status === 'PLANNED' && new Date(s.scheduledDate) < now)
    ).length;
    const planned = schedules.filter((s) => s.status === 'PLANNED' && new Date(s.scheduledDate) >= now).length;
    const completed = schedules.filter((s) => s.status === 'COMPLETED').length;
    return { total, overdue, planned, completed };
  }, [schedules]);

  // Filtered & Sorted schedules
  const sortedSchedules = useMemo(() => {
    const now = new Date();
    let list = schedules.filter((sch) => {
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

    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'scheduledDate') {
        valA = new Date(a.scheduledDate).getTime();
        valB = new Date(b.scheduledDate).getTime();
      } else if (sortField === 'equipment') {
        valA = a.equipment?.name || '';
        valB = b.equipment?.name || '';
      } else if (sortField === 'plan') {
        valA = a.plan?.name || '';
        valB = b.plan?.name || '';
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [schedules, search, periodicityFilter, statusFilter, sortField, sortDirection]);

  const activeFilterCount = (search ? 1 : 0) + (statusFilter ? 1 : 0) + (periodicityFilter ? 1 : 0);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPeriodicityFilter('');
  };

  const handleExecuteMro = (schedule: MaintenanceScheduleItem) => {
    setSelectedSchedule(schedule);
    setIsExecutionWizardOpen(true);
  };

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* 1. Header */}
      <PageHeader
        title="График ТО и ППР"
        subtitle="Календарный план планово-предупредительных ремонтов, контроль сроков и проведение регламентов"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'ТО и Ремонт', href: '/mro' },
          { label: 'График ТО и ППР' },
        ]}
        actions={
          <Stack direction="row" spacing={1.25}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon className={refreshing ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
              onClick={handleRefresh}
              sx={{ fontWeight: 600, borderRadius: '8px', minHeight: 36 }}
            >
              Обновить
            </Button>
            {hasPermission(PERMISSIONS.MRO_EXECUTION_COMPLETE) && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  setSelectedSchedule(null);
                  setIsExecutionWizardOpen(true);
                }}
                sx={{
                  fontWeight: 700,
                  borderRadius: '8px',
                  minHeight: 36,
                  backgroundColor: '#0284c7',
                }}
              >
                Провести ТО
              </Button>
            )}
          </Stack>
        }
      />

      {/* 2. KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего в графике"
            value={stats.total}
            icon={<CalendarMonthIcon />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            loading={loading}
            subtitle="Запланированных и выполненных"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Просрочено регламентов"
            value={stats.overdue}
            icon={<WarningAmberIcon />}
            iconColor="#dc2626"
            iconBgColor="rgba(220, 38, 38, 0.08)"
            loading={loading}
            subtitle="Требуют немедленного проведения"
            onClick={() => setStatusFilter('OVERDUE')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Запланировано на период"
            value={stats.planned}
            icon={<EventIcon />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            loading={loading}
            subtitle="Ожидают наступления срока"
            onClick={() => setStatusFilter('PLANNED')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Выполнено ТО"
            value={stats.completed}
            icon={<CheckCircleOutlineIcon />}
            iconColor="#16a34a"
            iconBgColor="rgba(22, 163, 74, 0.08)"
            loading={loading}
            subtitle="Проведено с фиксацией акта"
            onClick={() => setStatusFilter('COMPLETED')}
          />
        </Grid>
      </Grid>

      {/* 3. Schedules Data Table */}
      <DataTableWrapper
        title="Календарный график планово-предупредительных работ"
        subtitle={`Всего позиций в графике: ${sortedSchedules.length}`}
        loading={loading}
        emptyState={
          <EmptyState
            icon={<CalendarMonthIcon sx={{ fontSize: 44, color: '#94a3b8' }} />}
            title="Регламенты не найдены"
            description={
              activeFilterCount > 0
                ? 'Нет регламентов, соответствующих заданным критериям фильтрации.'
                : 'Запланируйте первое регламентное обслуживание оборудования.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : 'Провести ТО'}
            onAction={activeFilterCount > 0 ? handleResetFilters : () => setIsExecutionWizardOpen(true)}
          />
        }
        columns={MRO_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbar={
          <FilterToolbar activeFilterCount={activeFilterCount} onResetFilters={handleResetFilters}>
            <Box sx={{ width: { xs: '100%', sm: 260 } }}>
              <SearchInput
                value={search}
                onSearch={setSearch}
                placeholder="Поиск по оборудованию, инв. №..."
              />
            </Box>
            <TextField
              select
              size="small"
              label="Статус"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Все статусы</MenuItem>
              <MenuItem value="PLANNED">Запланировано</MenuItem>
              <MenuItem value="OVERDUE">Просрочено</MenuItem>
              <MenuItem value="COMPLETED">Выполнено</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Периодичность"
              value={periodicityFilter}
              onChange={(e) => setPeriodicityFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Любая периодичность</MenuItem>
              <MenuItem value="DAILY">Ежедневно</MenuItem>
              <MenuItem value="WEEKLY">Еженедельно</MenuItem>
              <MenuItem value="MONTHLY">Ежемесячно</MenuItem>
              <MenuItem value="QUARTERLY">Ежеквартально</MenuItem>
              <MenuItem value="ANNUAL">Ежегодно</MenuItem>
            </TextField>
          </FilterToolbar>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              {visibleColumns.includes('scheduledDate') && (
                <TableCell sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={sortField === 'scheduledDate'}
                    direction={sortField === 'scheduledDate' ? sortDirection : 'asc'}
                    onClick={() => {
                      const isAsc = sortField === 'scheduledDate' && sortDirection === 'asc';
                      setSortDirection(isAsc ? 'desc' : 'asc');
                      setSortField('scheduledDate');
                    }}
                  >
                    Плановая дата
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('equipment') && (
                <TableCell sx={{ minWidth: 240 }}>Оборудование</TableCell>
              )}
              {visibleColumns.includes('plan') && (
                <TableCell sx={{ minWidth: 200 }}>Регламентная карта</TableCell>
              )}
              {visibleColumns.includes('periodicity') && (
                <TableCell sx={{ minWidth: 140 }}>Периодичность</TableCell>
              )}
              {visibleColumns.includes('status') && (
                <TableCell sx={{ minWidth: 140 }}>Статус</TableCell>
              )}
              {visibleColumns.includes('location') && (
                <TableCell sx={{ minWidth: 160 }}>Место установки</TableCell>
              )}
              {visibleColumns.includes('completedBy') && (
                <TableCell sx={{ minWidth: 150 }}>Исполнитель</TableCell>
              )}
              {visibleColumns.includes('actions') && (
                <TableCell align="right" sx={{ minWidth: 120 }}>
                  Действия
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedSchedules.map((sch) => {
              const isOverdue =
                sch.status === 'MISSED' || (sch.status === 'PLANNED' && new Date(sch.scheduledDate) < new Date());
              const effectiveStatus = isOverdue && sch.status === 'PLANNED' ? 'MISSED' : sch.status;

              return (
                <TableRow key={sch.id} hover>
                  {visibleColumns.includes('scheduledDate') && (
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {formatDate(sch.scheduledDate)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('equipment') && (
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="#0f172a">
                          {sch.equipment.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          Инв. № {sch.equipment.inventoryNumber || '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                  )}
                  {visibleColumns.includes('plan') && (
                    <TableCell>
                      <Typography variant="body2" color="#0f172a">
                        {sch.plan?.name || 'Регламентное ТО по паспорту'}
                      </Typography>
                      {sch.plan?.checklist && (
                        <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                          Чек-лист: {sch.plan.checklist.items.length} пунктов проверки
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('periodicity') && (
                    <TableCell>
                      <StatusBadge
                        status={sch.plan?.frequency || 'MONTHLY'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <StatusBadge status={effectiveStatus} size="small" />
                    </TableCell>
                  )}
                  {visibleColumns.includes('location') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {sch.equipment.location || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('completedBy') && (
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {sch.completedBy?.displayName || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableCell align="right">
                      {sch.status === 'COMPLETED' ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleExecuteMro(sch)}
                          sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          Протокол
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<PlayArrowIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleExecuteMro(sch)}
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            py: 0.35,
                            px: 1.25,
                            backgroundColor: '#0284c7',
                          }}
                        >
                          Выполнить
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* 4. Execution Wizard Dialog */}
      {isExecutionWizardOpen && (
        <MroExecutionWizardDialog
          open={isExecutionWizardOpen}
          schedule={selectedSchedule}
          onClose={() => setIsExecutionWizardOpen(false)}
          onSuccess={() => {
            setIsExecutionWizardOpen(false);
            fetchSchedules();
          }}
        />
      )}
    </Box>
  );
}

export default function MroPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка модуля ТОиР (MRO)..." />}>
      <MroPageContent />
    </Suspense>
  );
}
