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
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import HubIcon from '@mui/icons-material/Hub';
import TimelineIcon from '@mui/icons-material/Timeline';
import SpeedIcon from '@mui/icons-material/Speed';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LaunchIcon from '@mui/icons-material/Launch';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
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
import {
  CreateServiceRequestDialog,
  SrmIssueDetailsDrawer,
  SrmIntegrationWizardDialog,
  SrmReliabilityAnalytics,
  SrmWarrantyTab,
} from '@/components/srm';
import { formatDateTime, formatDate, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';

interface SrmIssueItem {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  failureCategory: string | null;
  source: string;
  externalKey: string | null;
  externalUrl: string | null;
  equipmentId: string | null;
  equipment?: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    model: string | null;
    location: string | null;
  } | null;
  reportedBy?: {
    displayName: string;
    ldapLogin: string;
  } | null;
  assignedTo?: {
    displayName: string;
    ldapLogin: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

const SRM_COLUMNS: TableColumnOption[] = [
  { id: 'key', label: 'Номер / Ключ', defaultVisible: true },
  { id: 'title', label: 'Тема заявки / Описание дефекта', defaultVisible: true },
  { id: 'equipment', label: 'Оборудование', defaultVisible: true },
  { id: 'priority', label: 'Приоритет', defaultVisible: true },
  { id: 'status', label: 'Статус', defaultVisible: true },
  { id: 'failureCategory', label: 'Категория отказа', defaultVisible: true },
  { id: 'source', label: 'Источник', defaultVisible: false },
  { id: 'reportedBy', label: 'Инициатор', defaultVisible: true },
  { id: 'assignedTo', label: 'Исполнитель', defaultVisible: false },
  { id: 'createdAt', label: 'Дата регистрации', defaultVisible: true },
  { id: 'actions', label: 'Действия', defaultVisible: true, required: true },
];

function SrmPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Tab: 'issues' | 'analytics' | 'warranties'
  const [activeTab, setActiveTab] = useState<'issues' | 'analytics' | 'warranties'>(
    (searchParams?.get('tab') as any) || 'issues'
  );

  // Issues Data
  const [issues, setIssues] = useState<SrmIssueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [failureCategoryFilter, setFailureCategoryFilter] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
  });

  // Selected Issue for Drawer
  const [selectedIssue, setSelectedIssue] = useState<SrmIssueItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    SRM_COLUMNS.filter((c) => c.defaultVisible !== false).map((c) => c.id)
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/srm/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats({
            totalIssues: json.data.totalIssues || 0,
            openIssues: json.data.openIssues || 0,
            inProgressIssues: json.data.inProgressIssues || 0,
            resolvedIssues: json.data.resolvedIssues || 0,
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (failureCategoryFilter) params.append('category', failureCategoryFilter);

      const res = await fetch(`/api/srm/issues?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setIssues(json.data.items || json.data || []);
          setTotal(json.data.total || json.meta?.total || 0);
        } else {
          setIssues([]);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке заявок', { variant: 'error' });
      setIssues([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search, statusFilter, priorityFilter, failureCategoryFilter, enqueueSnackbar]);

  // Reliability Analytics Data
  const [reliabilityData, setReliabilityData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const fetchReliability = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch('/api/srm/analytics/reliability');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setReliabilityData(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'issues') {
      fetchIssues();
    } else if (activeTab === 'analytics') {
      fetchReliability();
    }
  }, [activeTab, fetchIssues, fetchReliability]);

  const handleTabChange = (_: React.SyntheticEvent, newTab: 'issues' | 'analytics' | 'warranties') => {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    router.replace(`/srm?${params.toString()}`);
  };

  const handleOpenDetails = (issue: SrmIssueItem) => {
    setSelectedIssue(issue);
    setIsDrawerOpen(true);
  };

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const sortedIssues = useMemo(() => {
    if (!sortField) return issues;
    return [...issues].sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'equipment') {
        aVal = a.equipment?.name || '';
        bVal = b.equipment?.name || '';
      }
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (a < bVal ? 1 : -1);
    });
  }, [issues, sortField, sortDirection]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (statusFilter) count++;
    if (priorityFilter) count++;
    if (failureCategoryFilter) count++;
    return count;
  }, [search, statusFilter, priorityFilter, failureCategoryFilter]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setFailureCategoryFilter('');
    setPage(1);
  };

  const handleTriggerSync = async () => {
    try {
      enqueueSnackbar('Запущена синхронизация с внешними трекерами (Jira / SD)...', { variant: 'info' });
      const res = await fetch('/api/srm/sync', { method: 'POST' });
      if (res.ok) {
        enqueueSnackbar('Синхронизация успешно завершена', { variant: 'success' });
        fetchIssues();
        fetchStats();
      } else {
        enqueueSnackbar('Ошибка синхронизации', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при синхронизации', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ width: '100%', pb: 3 }}>
      {/* 1. Header */}
      <PageHeader
        title="Система подачи заявок и управления инцидентами (SRM)"
        subtitle="Регистрация инцидентов, контроль соблюдения регламентов SLA, аналитика отказов и интеграция с Jira"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Подача заявок (SRM)' }]}
        actions={
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<SyncIcon sx={{ fontSize: 16 }} />}
              onClick={handleTriggerSync}
              sx={{ fontWeight: 600, borderRadius: '8px', minHeight: 36 }}
            >
              Синхронизация Jira
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HubIcon sx={{ fontSize: 16 }} />}
              onClick={() => setIsIntegrationDialogOpen(true)}
              sx={{ fontWeight: 600, borderRadius: '8px', minHeight: 36 }}
            >
              Настройка интеграции
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => setIsCreateDialogOpen(true)}
              sx={{ fontWeight: 700, borderRadius: '8px', minHeight: 36, backgroundColor: '#0284c7' }}
            >
              Подать заявку
            </Button>
          </Stack>
        }
      />

      {/* 2. KPI Cards Bar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего инцидентов"
            value={stats.totalIssues}
            subtitle="За весь период учета"
            icon={<BugReportOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            onClick={() => {
              setStatusFilter('');
              setActiveTab('issues');
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Открыто (В очереди)"
            value={stats.openIssues}
            subtitle="Ожидают реакции дежурного"
            icon={<BugReportOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#dc2626"
            iconBgColor="rgba(220, 38, 38, 0.08)"
            accentColor={stats.openIssues > 0 ? '#ef4444' : undefined}
            onClick={() => {
              setStatusFilter('OPEN');
              setActiveTab('issues');
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="В работе (На ремонте)"
            value={stats.inProgressIssues}
            subtitle="Исполняется бригадами"
            icon={<BuildCircleIcon sx={{ fontSize: 24 }} />}
            iconColor="#d97706"
            iconBgColor="rgba(217, 119, 6, 0.08)"
            onClick={() => {
              setStatusFilter('IN_PROGRESS');
              setActiveTab('issues');
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Успешно решено"
            value={stats.resolvedIssues}
            subtitle="Устраненные инциденты"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="#16a34a"
            iconBgColor="rgba(22, 163, 74, 0.08)"
            onClick={() => {
              setStatusFilter('RESOLVED');
              setActiveTab('issues');
            }}
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
            value="issues"
            label="Реестр заявок и инцидентов"
            icon={<BugReportOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            value="analytics"
            label="Аналитика надежности (MTTR / MTBF)"
            icon={<SpeedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            value="warranties"
            label="Гарантии и рекламации"
            icon={<ShieldOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* 4. Tab Content */}
      {activeTab === 'issues' && (
        <DataTableWrapper
          title="Журнал сервисных заявок"
          subtitle={`Всего записей: ${total}`}
          loading={loading}
          empty={!loading && issues.length === 0}
          emptyState={
            <EmptyState
              icon={<BugReportOutlinedIcon sx={{ fontSize: 42, color: '#94a3b8' }} />}
              title={activeFilterCount > 0 ? 'Заявки по выбранным фильтрам не найдены' : 'Журнал инцидентов пуст'}
              description={
                activeFilterCount > 0
                  ? 'Попробуйте изменить параметры поиска или сбросить активные фильтры.'
                  : 'Зарегистрируйте первую сервисную заявку для контроля дефекта оборудования.'
              }
              actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : 'Подать заявку'}
              onAction={activeFilterCount > 0 ? handleResetFilters : () => setIsCreateDialogOpen(true)}
            />
          }
          columns={SRM_COLUMNS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          page={page - 1}
          pageSize={pageSize}
          total={total}
          onPageChange={(_, newPage) => setPage(newPage + 1)}
          onPageSizeChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          toolbar={
            <FilterToolbar activeFilterCount={activeFilterCount} onResetFilters={handleResetFilters}>
              <Box sx={{ width: { xs: '100%', sm: 260 } }}>
                <SearchInput
                  value={search}
                  onSearch={(val) => {
                    setSearch(val);
                    setPage(1);
                  }}
                  placeholder="Поиск по теме, номеру, инв. №..."
                />
              </Box>
              <TextField
                select
                size="small"
                label="Статус"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="">Все статусы</MenuItem>
                <MenuItem value="OPEN">Открыто</MenuItem>
                <MenuItem value="IN_PROGRESS">В работе</MenuItem>
                <MenuItem value="RESOLVED">Решено</MenuItem>
                <MenuItem value="CLOSED">Закрыто</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Приоритет"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="">Все приоритеты</MenuItem>
                <MenuItem value="CRITICAL">Аварийный</MenuItem>
                <MenuItem value="HIGH">Высокий</MenuItem>
                <MenuItem value="MEDIUM">Средний</MenuItem>
                <MenuItem value="LOW">Низкий</MenuItem>
              </TextField>
            </FilterToolbar>
          }
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                {visibleColumns.includes('key') && (
                  <TableCell sx={{ minWidth: 120 }}>
                    <TableSortLabel
                      active={sortField === 'key'}
                      direction={sortField === 'key' ? sortDirection : 'asc'}
                      onClick={() => handleRequestSort('key')}
                    >
                      Ключ
                    </TableSortLabel>
                  </TableCell>
                )}
                {visibleColumns.includes('title') && (
                  <TableCell sx={{ minWidth: 260 }}>
                    <TableSortLabel
                      active={sortField === 'title'}
                      direction={sortField === 'title' ? sortDirection : 'asc'}
                      onClick={() => handleRequestSort('title')}
                    >
                      Тема / Описание
                    </TableSortLabel>
                  </TableCell>
                )}
                {visibleColumns.includes('equipment') && (
                  <TableCell sx={{ minWidth: 200 }}>Оборудование</TableCell>
                )}
                {visibleColumns.includes('priority') && (
                  <TableCell sx={{ minWidth: 120 }}>
                    <TableSortLabel
                      active={sortField === 'priority'}
                      direction={sortField === 'priority' ? sortDirection : 'asc'}
                      onClick={() => handleRequestSort('priority')}
                    >
                      Приоритет
                    </TableSortLabel>
                  </TableCell>
                )}
                {visibleColumns.includes('status') && (
                  <TableCell sx={{ minWidth: 120 }}>
                    <TableSortLabel
                      active={sortField === 'status'}
                      direction={sortField === 'status' ? sortDirection : 'asc'}
                      onClick={() => handleRequestSort('status')}
                    >
                      Статус
                    </TableSortLabel>
                  </TableCell>
                )}
                {visibleColumns.includes('failureCategory') && (
                  <TableCell sx={{ minWidth: 160 }}>Категория отказа</TableCell>
                )}
                {visibleColumns.includes('source') && (
                  <TableCell sx={{ minWidth: 100 }}>Источник</TableCell>
                )}
                {visibleColumns.includes('reportedBy') && (
                  <TableCell sx={{ minWidth: 150 }}>Инициатор</TableCell>
                )}
                {visibleColumns.includes('createdAt') && (
                  <TableCell sx={{ minWidth: 140 }}>
                    <TableSortLabel
                      active={sortField === 'createdAt'}
                      direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                      onClick={() => handleRequestSort('createdAt')}
                    >
                      Создана
                    </TableSortLabel>
                  </TableCell>
                )}
                {visibleColumns.includes('actions') && (
                  <TableCell align="right" sx={{ minWidth: 90 }}>
                    Действия
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedIssues.map((issue) => (
                <TableRow
                  key={issue.id}
                  hover
                  onClick={() => handleOpenDetails(issue)}
                  sx={{ cursor: 'pointer' }}
                >
                  {visibleColumns.includes('key') && (
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                      {issue.key}
                    </TableCell>
                  )}
                  {visibleColumns.includes('title') && (
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="#0f172a">
                        {issue.title}
                      </Typography>
                      {issue.externalKey && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Внешний трекер: {issue.externalKey}
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('equipment') && (
                    <TableCell>
                      {issue.equipment ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600} color="#0f172a">
                            {issue.equipment.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            Инв. № {issue.equipment.inventoryNumber || '—'}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Общестанционная
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('priority') && (
                    <TableCell>
                      <StatusBadge status={issue.priority} size="small" />
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <StatusBadge status={issue.status} size="small" />
                    </TableCell>
                  )}
                  {visibleColumns.includes('failureCategory') && (
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {issue.failureCategory || 'Не классифицирован'}
                      </Typography>
                    </TableCell>
                  )}
                  {visibleColumns.includes('source') && (
                    <TableCell>
                      <Chip label={issue.source} size="small" sx={{ fontSize: '0.6875rem' }} />
                    </TableCell>
                  )}
                  {visibleColumns.includes('reportedBy') && (
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {issue.reportedBy?.displayName || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('createdAt') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {formatDateTime(issue.createdAt)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenDetails(issue)}
                        sx={{ fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', py: 0.25 }}
                      >
                        Детали
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {activeTab === 'analytics' && (
        <SrmReliabilityAnalytics analytics={reliabilityData} loading={loadingAnalytics} />
      )}
      {activeTab === 'warranties' && (
        <SrmWarrantyTab issues={issues} onSelectIssue={handleOpenDetails} />
      )}

      {/* 5. Drawers and Dialogs */}
      {isDrawerOpen && (
        <SrmIssueDetailsDrawer
          open={isDrawerOpen}
          issue={selectedIssue}
          onClose={() => setIsDrawerOpen(false)}
          onIssueUpdated={() => {
            fetchIssues();
            fetchStats();
          }}
        />
      )}

      {isCreateDialogOpen && (
        <CreateServiceRequestDialog
          open={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSuccess={() => {
            setIsCreateDialogOpen(false);
            fetchIssues();
            fetchStats();
          }}
        />
      )}

      {isIntegrationDialogOpen && (
        <SrmIntegrationWizardDialog
          open={isIntegrationDialogOpen}
          onClose={() => setIsIntegrationDialogOpen(false)}
          onSuccess={() => {
            setIsIntegrationDialogOpen(false);
            fetchIssues();
          }}
        />
      )}
    </Box>
  );
}

export default function SrmPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка модуля SRM..." />}>
      <SrmPageContent />
    </Suspense>
  );
}
