'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  InputAdornment,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AUDIT_ACTION_MAP,
  EQUIPMENT_STATUS_MAP,
  DOCUMENT_TYPE_MAP,
  APPROVAL_TYPE_MAP,
  APPROVAL_STATUS_MAP,
  formatDateTime,
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
  StatusBadge,
  PageLoading,
  DatePickerField,
  FormDialog,
  type TableColumnOption,
} from '@/components/ui';

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
  } | null;
}

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string | null;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  Equipment: 'Паспорт оборудования',
  EquipmentDocument: 'Документ / Чертеж',
  EquipmentApproval: 'Заявка на согласование',
  Photo: 'Фотография',
  CustomField: 'Технический параметр',
  EquipmentCustomSection: 'Пользовательский раздел',
};

function formatValue(key: string, val: unknown): React.ReactNode {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Да' : 'Нет';

  if (key === 'status') {
    return <StatusBadge status={String(val)} size="small" />;
  }

  if (key === 'docType') {
    return DOCUMENT_TYPE_MAP[String(val)] || String(val);
  }

  if (key === 'type') {
    return APPROVAL_TYPE_MAP[String(val)] || String(val);
  }

  if (key === 'approvalStatus') {
    return <StatusBadge status={String(val)} size="small" />;
  }

  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  return String(val);
}

function RenderChangesDiff({ changes }: { changes: Record<string, unknown> | null | undefined }) {
  if (!changes || typeof changes !== 'object') {
    return <Typography variant="caption" color="text.secondary">—</Typography>;
  }

  const entries = Object.entries(changes);

  if (entries.length === 0) {
    return <Typography variant="caption" color="text.secondary">—</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {entries.map(([key, val]) => {
        if (val && typeof val === 'object' && 'old' in val && 'new' in val) {
          const changeObj = val as { old: unknown; new: unknown };
          return (
            <Box key={key} sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                {key}:
              </Typography>
              <Box component="span" sx={{ textDecoration: 'line-through', color: 'error.main', opacity: 0.8 }}>
                {formatValue(key, changeObj.old)}
              </Box>
              <ArrowRightAltIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>
                {formatValue(key, changeObj.new)}
              </Box>
            </Box>
          );
        }

        return (
          <Box key={key} sx={{ fontSize: '0.75rem' }}>
            <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
              {key}:
            </Typography>{' '}
            <Typography component="span" sx={{ fontSize: '0.75rem' }}>
              {formatValue(key, val)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function HistoryListContent() {
  const router = useRouter();
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

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (sortField) {
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'user':
          aVal = a.user?.displayName || a.user?.ldapLogin || '';
          bVal = b.user?.displayName || b.user?.ldapLogin || '';
          break;
        case 'action':
          aVal = a.action || '';
          bVal = b.action || '';
          break;
        case 'entityType':
          aVal = a.entityType || '';
          bVal = b.entityType || '';
          break;
        case 'equipment':
          aVal = a.equipment?.name || a.equipment?.inventoryNumber || '';
          bVal = b.equipment?.name || b.equipment?.inventoryNumber || '';
          break;
        default:
          aVal = (a as any)[sortField] || '';
          bVal = (b as any)[sortField] || '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [items, sortField, sortDirection]);

  // Filters
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [actionFilter, setActionFilter] = useState(searchParams?.get('action') || '');
  const [equipmentFilter, setEquipmentFilter] = useState(searchParams?.get('equipmentId') || '');
  const [startDate, setStartDate] = useState(searchParams?.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams?.get('endDate') || '');

  // Equipment List for picker
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    creates: 0,
    updates: 0,
    deletes: 0,
  });

  // Load equipment list for selector
  useEffect(() => {
    async function loadEquipment() {
      try {
        const res = await fetch('/api/eps/equipment?pageSize=100');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.items) {
            setEquipmentList(
              json.data.items.map((eq: any) => ({
                id: eq.id,
                name: eq.name,
                inventoryNumber: eq.inventoryNumber,
              }))
            );
          }
        }
      } catch {
        // ignore
      }
    }
    loadEquipment();
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);
      if (equipmentFilter) params.append('equipmentId', equipmentFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/eps/history?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items || []);
          setTotal(json.data.total || 0);
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки истории изменений', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, actionFilter, equipmentFilter, startDate, endDate, enqueueSnackbar]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleKpiFilter = (action: string) => {
    if (actionFilter === action) {
      setActionFilter('');
    } else {
      setActionFilter(action);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('');
    setEquipmentFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const HISTORY_COLUMNS: TableColumnOption[] = [
    { id: 'createdAt', label: 'Дата и время', defaultVisible: true },
    { id: 'user', label: 'Пользователь', defaultVisible: true },
    { id: 'action', label: 'Действие', defaultVisible: true },
    { id: 'entityType', label: 'Сущность', defaultVisible: true },
    { id: 'equipment', label: 'Оборудование', defaultVisible: true },
    { id: 'changes', label: 'Детализация изменений', defaultVisible: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    HISTORY_COLUMNS.map((c) => c.id)
  );

  const activeFilterCount =
    (search ? 1 : 0) +
    (actionFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);
  if (!canAccessHistory) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="История изменений и аудит (EPS)"
          subtitle="Неизменяемый реестр всех операций создания, изменения реквизитов, согласований и списаний оборудования"
          breadcrumbs={[
            { label: 'Главная', href: '/' },
            { label: 'Оборудование', href: '/eps' },
            { label: 'История изменений' },
          ]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет полномочий для просмотра истории изменений и аудита оборудования (требуется право eps.history.view)."
          icon={<HistoryOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="История изменений и аудит (EPS)"
        subtitle="Неизменяемый реестр всех операций создания, изменения реквизитов, согласований и списаний оборудования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'История изменений' },
        ]}
      />

      {/* KPI Cards */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего событий"
            value={stats.total}
            subtitle="Зафиксировано в аудите"
            icon={<TimelineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="primary.main"
            accentColor="primary.main"
            active={actionFilter === ''}
            onClick={() => handleKpiFilter('')}
            loading={loading && stats.total === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Создание объектов"
            value={stats.creates}
            subtitle="Новое оборудование / файлы"
            icon={<AddCircleOutlineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="success.main"
            accentColor="success.main"
            active={actionFilter === 'CREATE'}
            onClick={() => handleKpiFilter('CREATE')}
            loading={loading && stats.total === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Изменения и статусы"
            value={stats.updates}
            subtitle="Корректировка паспортов"
            icon={<EditNoteIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="primary.main"
            accentColor="primary.main"
            active={actionFilter === 'UPDATE'}
            onClick={() => handleKpiFilter('UPDATE')}
            loading={loading && stats.total === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Удаления"
            value={stats.deletes}
            subtitle="Удаленные документы и записи"
            icon={<DeleteForeverOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="error.main"
            accentColor="error.main"
            active={actionFilter === 'DELETE'}
            onClick={() => handleKpiFilter('DELETE')}
            loading={loading && stats.total === 0}
          />
        </Grid>
      </Grid>

      {/* Main Audit Log Table */}
      <DataTableWrapper
        loading={loading}
        page={page - 1}
        pageSize={pageSize}
        total={total}
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
            actions={
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{
                    displayEmpty: true,
                  }}
                  sx={{
                    minWidth: 160,
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все действия</MenuItem>
                  {Object.entries(AUDIT_ACTION_MAP).map(([key, info]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
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
                  SelectProps={{
                    displayEmpty: true,
                  }}
                  sx={{
                    minWidth: 200,
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все оборудование</MenuItem>
                  {equipmentList.map((eq) => (
                    <MenuItem key={eq.id} value={eq.id} sx={{ fontSize: '0.8125rem' }}>
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
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по событиям, пользователю, объекту..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              {visibleColumns.includes('createdAt') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'createdAt'}
                    direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('createdAt')}
                  >
                    Дата и время
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('user') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'user'}
                    direction={sortField === 'user' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('user')}
                  >
                    Пользователь
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('action') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'action'}
                    direction={sortField === 'action' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('action')}
                  >
                    Действие
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('entityType') && (
                <TableCell sx={{ minWidth: 150 }}>
                  <TableSortLabel
                    active={sortField === 'entityType'}
                    direction={sortField === 'entityType' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('entityType')}
                  >
                    Сущность
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('equipment') && (
                <TableCell sx={{ minWidth: 180 }}>
                  <TableSortLabel
                    active={sortField === 'equipment'}
                    direction={sortField === 'equipment' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('equipment')}
                  >
                    Оборудование
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('changes') && (
                <TableCell sx={{ minWidth: 200 }}>
                  Детализация изменений
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((log) => {
              const eq = log.equipment;
              const hasDiff = log.changes && Object.keys(log.changes).length > 0;

              return (
                <TableRow key={log.id} hover>
                  {visibleColumns.includes('createdAt') && (
                    <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', whiteSpace: 'nowrap', color: 'text.disabled' }}>
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  )}

                  {visibleColumns.includes('user') && (
                    <TableCell>
                      {log.user ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600} fontSize="0.8125rem" sx={{ color: 'text.primary' }}>
                            {log.user.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.user.ldapLogin}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Система
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.includes('action') && (
                    <TableCell>
                      <StatusBadge status={log.action} />
                    </TableCell>
                  )}

                  {visibleColumns.includes('entityType') && (
                    <TableCell>
                      <StatusBadge status={log.entityType} size="small" variant="outlined" />
                    </TableCell>
                  )}

                  {visibleColumns.includes('equipment') && (
                    <TableCell>
                      {eq ? (
                        <Box
                          onClick={() => router.push(`/eps/${eq.id}`)}
                          sx={{
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 0.35,
                            '&:hover .equipment-name': { color: 'primary.main', textDecoration: 'underline' },
                          }}
                        >
                          <Typography
                            className="equipment-name"
                            variant="body2"
                            fontWeight={600}
                            sx={{ fontSize: '0.8125rem', color: 'text.primary', lineHeight: 1.35 }}
                          >
                            {eq.name}
                          </Typography>
                          <Paper
                            variant="outlined"
                            sx={{
                              px: 0.75,
                              py: 0.1,
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              bgcolor: 'background.default',
                              fontSize: '0.6875rem',
                              borderRadius: '4px',
                              color: 'text.secondary',
                              borderColor: 'grey.400',
                              lineHeight: 1.3,
                            }}
                          >
                            {eq.inventoryNumber || 'Б/Н'}
                          </Paper>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.includes('changes') && (
                    <TableCell>
                      <RenderChangesDiff changes={log.changes} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableWrapper>
    </Box>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка журнала истории изменений..." />}>
      <HistoryListContent />
    </Suspense>
  );
}
