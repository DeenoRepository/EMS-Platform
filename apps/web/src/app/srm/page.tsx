'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
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
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';
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
  ModuleMaintenanceState,
  type TableColumnOption,
} from '@/components/ui';
import {
  CreateServiceRequestDialog,
  SrmIssueDetailsDrawer,
  SrmIntegrationWizardDialog,
} from '@/components/srm';
import { formatDateTime, formatDate, PERMISSIONS, PlatformMaintenanceStatus } from '@ems/shared';
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
  { id: 'key', label: 'Номер инцидента / Заявки', defaultVisible: true },
  { id: 'title', label: 'Краткое содержание неисправности', defaultVisible: true },
  { id: 'equipment', label: 'Технологическая позиция оборудования', defaultVisible: true },
  { id: 'priority', label: 'Приоритет / Критичность', defaultVisible: true },
  { id: 'status', label: 'Статус обработки', defaultVisible: true },
  { id: 'failureCategory', label: 'Причина отказа (ГОСТ 27.002-2015)', defaultVisible: true },
  { id: 'source', label: 'Источник регистрации', defaultVisible: false },
  { id: 'reportedBy', label: 'Автор обращения (ФИО)', defaultVisible: true },
  { id: 'assignedTo', label: 'Ответственный исполнитель', defaultVisible: false },
  { id: 'createdAt', label: 'Дата регистрации', defaultVisible: true },
  { id: 'actions', label: 'Операции', defaultVisible: true, required: true },
];

function SrmPageContent() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Issues Data
  const [issues, setIssues] = useState<SrmIssueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Stats Data
  const [stats, setStats] = useState<{
    totalIssues: number;
    openIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
    mttrHours: number;
    mtbfDays: number;
    slaComplianceRate: number;
  }>({
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
    mttrHours: 0,
    mtbfDays: 0,
    slaComplianceRate: 100,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Selected Issue & Drawers
  const [selectedIssue, setSelectedIssue] = useState<SrmIssueItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);

  // Sorting & Column Visibility
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    SRM_COLUMNS.filter((c) => c.defaultVisible !== false).map((c) => c.id)
  );

  const [maintStatus, setMaintStatus] = useState<PlatformMaintenanceStatus | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, maintRes] = await Promise.all([
        fetch('/api/srm/stats'),
        fetch('/api/system/maintenance'),
      ]);
      if (statsRes.ok) {
        const json = await statsRes.json();
        if (json.success && json.data) {
          setStats(json.data);
        }
      }
      if (maintRes.ok) {
        const maintJson = await maintRes.json();
        if (maintJson.success && maintJson.data) {
          setMaintStatus(maintJson.data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const res = await fetch(`/api/srm/issues?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setIssues(json.data.items || []);
          setTotal(json.data.total || 0);
        } else {
          setIssues([]);
          setTotal(0);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке заявок SRM', { variant: 'error' });
      setIssues([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search, statusFilter, priorityFilter, enqueueSnackbar]);

  useEffect(() => {
    fetchIssues();
    fetchStats();
  }, [fetchIssues, fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchIssues();
    fetchStats();
  };

  const handleSyncJira = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/srm/sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          enqueueSnackbar(`Синхронизация завершена: обновлено ${json.data?.synced || 0} заявок`, {
            variant: 'success',
          });
          fetchIssues();
          fetchStats();
        } else {
          enqueueSnackbar(json.error || 'Ошибка синхронизации', { variant: 'warning' });
        }
      }
    } catch {
      enqueueSnackbar('Сбой при вызове сервиса синхронизации', { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleRequestSort = (field: string) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  const sortedIssues = useMemo(() => {
    const list = [...issues];
    list.sort((a, b) => {
      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];

      if (sortField === 'equipment') {
        valA = a.equipment?.name || '';
        valB = b.equipment?.name || '';
      } else if (sortField === 'reportedBy') {
        valA = a.reportedBy?.displayName || '';
        valB = b.reportedBy?.displayName || '';
      } else if (sortField === 'createdAt') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [issues, sortField, sortDirection]);

  const paginatedIssues = useMemo(() => {
    return sortedIssues.slice((page - 1) * pageSize, page * pageSize);
  }, [sortedIssues, page, pageSize]);

  const activeFilterCount = (search ? 1 : 0) + (statusFilter ? 1 : 0) + (priorityFilter ? 1 : 0);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  const handleOpenDetails = (issue: SrmIssueItem) => {
    setSelectedIssue(issue);
    setIsDrawerOpen(true);
  };

  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('administrator');
  const isModuleInMaintenance = Boolean(maintStatus?.modules.srm?.enabled);

  if (isModuleInMaintenance && !isAdmin) {
    return (
      <ModuleMaintenanceState
        moduleName="Подача заявок (SRM)"
        message={maintStatus?.modules.srm.message}
        estimatedUntil={maintStatus?.modules.srm.estimatedUntil}
        onRefresh={handleRefresh}
      />
    );
  }

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* Admin Maintenance Preview Banner */}
      {isModuleInMaintenance && (
        <Alert
          severity="warning"
          sx={{
            mb: 2.5,
            borderRadius: '12px',
            border: '1px solid warning.light',
            backgroundColor: 'warning.light',
            fontWeight: 500,
          }}
        >
          <strong>Режим предпросмотра администратора:</strong> Модуль SRM переведен в режим технического обслуживания. Для обычных пользователей доступ временно закрыт.
        </Alert>
      )}

      {/* 1. Header */}
      <PageHeader
        title="Журнал инцидентов и сервисных заявок"
        subtitle="Регистрация отказов оборудования, технологических простоев и сервисных нарядов"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Управление инцидентами', href: '/srm' },
          { label: 'Журнал инцидентов' },
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
            {hasPermission(PERMISSIONS.SRM_SYNC_TRIGGER) && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<SyncIcon className={syncing ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
                onClick={handleSyncJira}
                disabled={syncing}
                sx={{ fontWeight: 600, borderRadius: '8px', minHeight: 36 }}
              >
                Синхронизация Jira
              </Button>
            )}
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => setIsCreateDialogOpen(true)}
              sx={{
                fontWeight: 700,
                borderRadius: '8px',
                minHeight: 36,
                backgroundColor: 'primary.main',
              }}
            >
              Подать заявку
            </Button>
          </Stack>
        }
      />

      {/* 2. KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего заявок"
            value={stats.totalIssues}
            icon={<BugReportOutlinedIcon />}
            iconColor="primary.main"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            loading={loading}
            subtitle="Зарегистрировано в системе"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Открыто / Новые"
            value={stats.openIssues}
            icon={<SpeedIcon />}
            iconColor="warning.main"
            iconBgColor="rgba(217, 119, 6, 0.08)"
            loading={loading}
            subtitle="Ожидают распределения"
            onClick={() => setStatusFilter('OPEN')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="В работе / Диагностика"
            value={stats.inProgressIssues}
            icon={<BuildCircleIcon />}
            iconColor="primary.main"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            loading={loading}
            subtitle="На устранении службой ТО"
            onClick={() => setStatusFilter('IN_PROGRESS')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Урегулировано"
            value={stats.resolvedIssues}
            icon={<FactCheckOutlinedIcon />}
            iconColor="success.main"
            iconBgColor="rgba(22, 163, 74, 0.08)"
            loading={loading}
            subtitle="Успешно закрытые заявки"
            onClick={() => setStatusFilter('RESOLVED')}
          />
        </Grid>
      </Grid>

      {/* 3. DataTable */}
      <DataTableWrapper
        title="Реестр инцидентов и сервисных обращений"
        subtitle={`Всего найдено: ${total}`}
        loading={loading}
        page={page - 1}
        pageSize={pageSize}
        total={total}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        emptyState={
          <EmptyState
            icon={<BugReportOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />}
            title="Заявки не найдены"
            description={
              activeFilterCount > 0
                ? 'Нет заявок, удовлетворяющих заданным критериям фильтрации.'
                : 'В системе пока не создано ни одной сервисной заявки.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : 'Подать заявку'}
            onAction={activeFilterCount > 0 ? handleResetFilters : () => setIsCreateDialogOpen(true)}
          />
        }
        storageKey="srm_issues_table"
        columns={SRM_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbar={
          <FilterToolbar activeFilterCount={activeFilterCount} onResetFilters={handleResetFilters}>
            <Box sx={{ width: { xs: '100%', sm: 260 } }}>
              <SearchInput
                value={search}
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Поиск по теме, коду, оборудованию..."
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
            {paginatedIssues.map((issue) => (
              <TableRow
                key={issue.id}
                hover
                onClick={() => handleOpenDetails(issue)}
                sx={{ cursor: 'pointer' }}
              >
                {visibleColumns.includes('key') && (
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>
                    {issue.key}
                  </TableCell>
                )}
                {visibleColumns.includes('title') && (
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
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
                        <Typography variant="body2" fontWeight={600} color="text.primary">
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
                    <StatusBadge status={issue.source || 'INTERNAL'} size="small" />
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

      {/* 4. Drawers and Dialogs */}
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
