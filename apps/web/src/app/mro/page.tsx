'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
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
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChecklistIcon from '@mui/icons-material/Checklist';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventIcon from '@mui/icons-material/Event';
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
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Active Tab: 'schedules' | 'checklists' | 'history'
  const [activeTab, setActiveTab] = useState<'schedules' | 'checklists' | 'history'>(
    (searchParams?.get('tab') as any) || 'schedules'
  );

  const [schedules, setSchedules] = useState<MaintenanceScheduleItem[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
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

  const fetchChecklists = useCallback(async () => {
    try {
      const res = await fetch('/api/mro/checklists');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setChecklists(json.data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchChecklists();
  }, [fetchSchedules, fetchChecklists]);

  const handleTabChange = (_: React.SyntheticEvent, newTab: 'schedules' | 'checklists' | 'history') => {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    router.replace(`/mro?${params.toString()}`);
  };

  const handleExecuteMro = (schedule: MaintenanceScheduleItem) => {
    setSelectedSchedule({
      id: schedule.id,
      title: schedule.plan?.name || 'Регламентное ТО',
      scheduledDate: schedule.scheduledDate,
      notes: schedule.notes,
      equipment: schedule.equipment,
      plan: schedule.plan,
    });
    setIsExecutionWizardOpen(true);
  };

  // Status Metrics Calculation
  const now = new Date();
  const overdueCount = schedules.filter(
    (s) => s.status === 'MISSED' || (s.status === 'PLANNED' && new Date(s.scheduledDate) < now)
  ).length;
  const plannedCount = schedules.filter(
    (s) => s.status === 'PLANNED' && new Date(s.scheduledDate) >= now
  ).length;
  const completedCount = schedules.filter((s) => s.status === 'COMPLETED').length;

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (search) {
        const query = search.toLowerCase();
        const eqName = s.equipment?.name?.toLowerCase() || '';
        const invNum = s.equipment?.inventoryNumber?.toLowerCase() || '';
        const planName = s.plan?.name?.toLowerCase() || '';
        if (!eqName.includes(query) && !invNum.includes(query) && !planName.includes(query)) {
          return false;
        }
      }
      if (periodicityFilter && s.plan?.frequency !== periodicityFilter) {
        return false;
      }
      return true;
    });
  }, [schedules, search, periodicityFilter]);

  const sortedSchedules = useMemo(() => {
    return [...filteredSchedules].sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'equipment') {
        aVal = a.equipment?.name || '';
        bVal = b.equipment?.name || '';
      }
      if (sortField === 'scheduledDate') {
        aVal = new Date(a.scheduledDate).getTime();
        bVal = new Date(b.scheduledDate).getTime();
      }
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (a < bVal ? 1 : -1);
    });
  }, [filteredSchedules, sortField, sortDirection]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (statusFilter) count++;
    if (periodicityFilter) count++;
    return count;
  }, [search, statusFilter, periodicityFilter]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPeriodicityFilter('');
  };

  return (
    <Box sx={{ width: '100%', pb: 3 }}>
      {/* 1. Header */}
      <PageHeader
        title="ТО и Ремонт оборудования (MRO)"
        subtitle="Управление планово-предупредительными ремонтами (ППР), электронные чек-листы и учет запчастей"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'ТО и Ремонт (MRO)' }]}
        actions={
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon className={refreshing ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
              onClick={() => {
                setRefreshing(true);
                fetchSchedules();
              }}
              sx={{ fontWeight: 600, borderRadius: '8px', minHeight: 36 }}
            >
              Обновить
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setSelectedSchedule(null);
                setIsExecutionWizardOpen(true);
              }}
              sx={{ fontWeight: 700, borderRadius: '8px', minHeight: 36, backgroundColor: '#0284c7' }}
            >
              Провести регламент ТО
            </Button>
          </Stack>
        }
      />

      {/* 2. KPI Cards Bar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего регламентов"
            value={schedules.length}
            subtitle="Запланировано в системе"
            icon={<CalendarMonthIcon sx={{ fontSize: 24 }} />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            onClick={() => setStatusFilter('')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Просрочено (Требует ТО)"
            value={overdueCount}
            subtitle="Превышен межсервисный интервал"
            icon={<WarningAmberIcon sx={{ fontSize: 24 }} />}
            iconColor="#dc2626"
            iconBgColor="rgba(220, 38, 38, 0.08)"
            accentColor={overdueCount > 0 ? '#ef4444' : undefined}
            onClick={() => setStatusFilter('OVERDUE')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Запланировано (В графике)"
            value={plannedCount}
            subtitle="Ожидают наступления срока"
            icon={<EventIcon sx={{ fontSize: 24 }} />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            onClick={() => setStatusFilter('PLANNED')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Выполнено успешно"
            value={completedCount}
            subtitle="С оформлением протокола"
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 24 }} />}
            iconColor="#16a34a"
            iconBgColor="rgba(22, 163, 74, 0.08)"
            onClick={() => setStatusFilter('COMPLETED')}
          />
        </Grid>
      </Grid>

      {/* 3. Navigation Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            px: 2,
            minHeight: 48,
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.8125rem',
              minHeight: 48,
              textTransform: 'none',
            },
          }}
        >
          <Tab
            value="schedules"
            label="График ППР и регламентов"
            icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            value="checklists"
            label="Технологические чек-листы"
            icon={<ChecklistIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            value="history"
            label="Журнал выполненных ТО"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* 4. Tab Content */}
      {activeTab === 'schedules' && (
        <DataTableWrapper
          title="Календарный план планово-предупредительных ремонтов"
          subtitle={`Всего позиций в плане: ${sortedSchedules.length}`}
          loading={loading}
          empty={!loading && sortedSchedules.length === 0}
          emptyState={
            <EmptyState
              icon={<BuildOutlinedIcon sx={{ fontSize: 42, color: '#94a3b8' }} />}
              title={activeFilterCount > 0 ? 'Регламенты по выбранным фильтрам не найдены' : 'График ППР пуст'}
              description={
                activeFilterCount > 0
                  ? 'Попробуйте сбросить фильтры или изменить поисковый запрос.'
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
                  sch.status === 'MISSED' || (sch.status === 'PLANNED' && new Date(sch.scheduledDate) < now);
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
      )}

      {activeTab === 'checklists' && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', bgcolor: '#ffffff' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={700} color="#0f172a">
                Электронные технологические карты и чек-листы
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Стандартизированные опросные листы для бригад слесарей и наладчиков
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {checklists.map((cl) => (
              <Grid item xs={12} md={6} key={cl.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: '10px',
                    borderColor: '#e2e8f0',
                    transition: 'border-color 0.15s ease',
                    '&:hover': { borderColor: '#0284c7' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                      {cl.title}
                    </Typography>
                    <Chip
                      label={`${cl.items?.length || 0} пунктов`}
                      size="small"
                      sx={{ fontWeight: 600, bgcolor: '#f0f9ff', color: '#0284c7' }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {cl.description || 'Регламентный технологический чек-лист проверки узлов и агрегатов.'}
                  </Typography>

                  <Stack spacing={0.75}>
                    {cl.items?.slice(0, 3).map((item: any, idx: number) => (
                      <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace', width: 18 }}>
                          {idx + 1}.
                        </Typography>
                        <Typography variant="caption" color="text.primary" noWrap>
                          {item.text}
                        </Typography>
                      </Box>
                    ))}
                    {cl.items?.length > 3 && (
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                        + еще {cl.items.length - 3} пунктов...
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {activeTab === 'history' && (
        <DataTableWrapper
          title="Журнал выполненных регламентных работ и ремонтов"
          subtitle="Архив актов выполненного ТО с фиксацией трудозатрат и списанных запчастей"
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Дата выполнения</TableCell>
                <TableCell>Оборудование</TableCell>
                <TableCell>Регламент</TableCell>
                <TableCell>Исполнитель</TableCell>
                <TableCell>Статус</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules
                .filter((s) => s.status === 'COMPLETED')
                .map((sch) => (
                  <TableRow key={sch.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {sch.actualDate ? formatDateTime(sch.actualDate) : formatDate(sch.scheduledDate)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {sch.equipment.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        Инв. № {sch.equipment.inventoryNumber || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{sch.plan?.name || 'Плановое ТО'}</TableCell>
                    <TableCell>{sch.completedBy?.displayName || 'Дежурный инженер'}</TableCell>
                    <TableCell>
                      <StatusBadge status="COMPLETED" size="small" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {/* 5. Execution Wizard Dialog */}
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
