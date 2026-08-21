'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Pagination,
  IconButton,
  Button,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PageHeader from '@/components/layout/PageHeader';
import { formatDateTime, AUDIT_ACTION_MAP } from '@ems/shared';
import { useSnackbar } from 'notistack';
import {
  StatCard,
  SearchInput,
  FilterToolbar,
  DataTableWrapper,
  EmptyState,
  StatusBadge,
  FormDialog,
  type TableColumnOption,
} from '@/components/ui';

interface AuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    ldapLogin: string;
    displayName: string;
  } | null;
}

export default function AdminAuditLogPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleRequestSort = (property: string) => {
    const isAsc = sortField === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const sortedLogs = useMemo(() => {
    if (!sortField) return logs;
    return [...logs].sort((a, b) => {
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
        case 'entityId':
          aVal = a.entityId || '';
          bVal = b.entityId || '';
          break;
        case 'ipAddress':
          aVal = a.ipAddress || '';
          bVal = b.ipAddress || '';
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
  }, [logs, sortField, sortDirection]);

  // JSON viewer modal
  const [selectedChanges, setSelectedChanges] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (actionFilter) params.append('action', actionFilter);
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLogs(json.data.items || []);
          setTotal(json.data.total || 0);
          setTotalPages(json.data.totalPages || 1);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки журнала аудита', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityTypeFilter, search, enqueueSnackbar]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setActionFilter('');
    setEntityTypeFilter('');
    setSearch('');
    setPage(1);
  };

  const activeFilterCount = (actionFilter ? 1 : 0) + (entityTypeFilter ? 1 : 0) + (search ? 1 : 0);

  const AUDIT_COLUMNS: TableColumnOption[] = [
    { id: 'createdAt', label: 'Дата и время', defaultVisible: true, required: true },
    { id: 'user', label: 'Пользователь', defaultVisible: true },
    { id: 'action', label: 'Действие', defaultVisible: true },
    { id: 'entityType', label: 'Тип объекта', defaultVisible: true },
    { id: 'entityId', label: 'ID объекта', defaultVisible: true },
    { id: 'ipAddress', label: 'IP адрес', defaultVisible: true },
    { id: 'changes', label: 'Изменения', defaultVisible: true, required: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    AUDIT_COLUMNS.map((c) => c.id)
  );

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Журнал аудита системы"
        subtitle="Неизменяемый журнал всех пользовательских действий и системных событий платформы"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin' },
          { label: 'Аудит' },
        ]}
      />

      {/* KPI Cards */}
      <Grid container spacing={1.75} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего событий"
            value={total}
            subtitle="Зафиксировано в БД"
            icon={<HistoryIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            active={actionFilter === '' && entityTypeFilter === ''}
            onClick={() => {
              setActionFilter('');
              setEntityTypeFilter('');
              setPage(1);
            }}
            loading={loading && total === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Создание (CREATE)"
            value={logs.filter((l) => l.action === 'CREATE').length}
            subtitle="Новые записи"
            icon={<AddCircleOutlineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            active={actionFilter === 'CREATE'}
            onClick={() => {
              setActionFilter(actionFilter === 'CREATE' ? '' : 'CREATE');
              setPage(1);
            }}
            loading={loading && total === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Изменение (UPDATE)"
            value={logs.filter((l) => l.action === 'UPDATE').length}
            subtitle="Корректировка данных"
            icon={<EditOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
            active={actionFilter === 'UPDATE'}
            onClick={() => {
              setActionFilter(actionFilter === 'UPDATE' ? '' : 'UPDATE');
              setPage(1);
            }}
            loading={loading && total === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Удаление (DELETE)"
            value={logs.filter((l) => l.action === 'DELETE').length}
            subtitle="Удаленные записи"
            icon={<DeleteOutlineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="#dc2626"
            accentColor="#dc2626"
            active={actionFilter === 'DELETE'}
            onClick={() => {
              setActionFilter(actionFilter === 'DELETE' ? '' : 'DELETE');
              setPage(1);
            }}
            loading={loading && total === 0}
          />
        </Grid>
      </Grid>

      {/* Audit Log Table */}
      <DataTableWrapper
        loading={loading}
        page={page - 1}
        pageSize={20}
        total={total}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        columns={AUDIT_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        stickyHeader
        empty={logs.length === 0 && !loading}
        emptyState={
          <EmptyState
            icon={<HistoryIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
            title="Записей аудита не найдено"
            description={
              activeFilterCount > 0
                ? 'По указанным критериям поиска события не найдены. Попробуйте сбросить фильтры.'
                : 'В системе пока не зафиксировано событий аудита.'
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
                    minWidth: 150,
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
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все действия</MenuItem>
                  <MenuItem value="CREATE" sx={{ fontSize: '0.8125rem' }}>Создание</MenuItem>
                  <MenuItem value="UPDATE" sx={{ fontSize: '0.8125rem' }}>Изменение</MenuItem>
                  <MenuItem value="DELETE" sx={{ fontSize: '0.8125rem' }}>Удаление</MenuItem>
                  <MenuItem value="LOGIN" sx={{ fontSize: '0.8125rem' }}>Вход</MenuItem>
                  <MenuItem value="LOGOUT" sx={{ fontSize: '0.8125rem' }}>Выход</MenuItem>
                </TextField>

                <TextField
                  select
                  size="small"
                  value={entityTypeFilter}
                  onChange={(e) => {
                    setEntityTypeFilter(e.target.value);
                    setPage(1);
                  }}
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
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все объекты</MenuItem>
                  <MenuItem value="Equipment" sx={{ fontSize: '0.8125rem' }}>Оборудование (Equipment)</MenuItem>
                  <MenuItem value="Document" sx={{ fontSize: '0.8125rem' }}>Документ (Document)</MenuItem>
                  <MenuItem value="StockOperation" sx={{ fontSize: '0.8125rem' }}>Складская операция</MenuItem>
                  <MenuItem value="Role" sx={{ fontSize: '0.8125rem' }}>Роль (Role)</MenuItem>
                  <MenuItem value="User" sx={{ fontSize: '0.8125rem' }}>Пользователь (User)</MenuItem>
                  <MenuItem value="SystemSetting" sx={{ fontSize: '0.8125rem' }}>Настройки</MenuItem>
                </TextField>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                placeholder="Поиск по ID или пользователю..."
                value={search}
                onSearch={(val: string) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <Table size="small" aria-label="Журнал аудита действий">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#ffffff' }}>
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
                    Тип объекта
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('entityId') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'entityId'}
                    direction={sortField === 'entityId' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('entityId')}
                  >
                    ID объекта
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('ipAddress') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'ipAddress'}
                    direction={sortField === 'ipAddress' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('ipAddress')}
                  >
                    IP адрес
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('changes') && (
                <TableCell align="right" sx={{ minWidth: 100 }}>
                  Изменения
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedLogs.map((log) => {
              return (
                <TableRow key={log.id} hover>
                  {visibleColumns.includes('createdAt') && (
                    <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', whiteSpace: 'nowrap', color: '#64748b' }}>
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('user') && (
                    <TableCell>
                      {log.user ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600} fontSize="0.8125rem" sx={{ color: '#0f172a' }}>
                            {log.user.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.user.ldapLogin}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Системный процесс
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
                  {visibleColumns.includes('entityId') && (
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>
                      {log.entityId}
                    </TableCell>
                  )}
                  {visibleColumns.includes('ipAddress') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                      {log.ipAddress || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('changes') && (
                    <TableCell align="right">
                      {log.changes ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectedChanges(log.changes)}
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
                          Детали
                        </Button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Changes JSON Viewer Modal */}
      <FormDialog
        open={Boolean(selectedChanges)}
        onClose={() => setSelectedChanges(null)}
        title="Детали изменений (Payload / Diff)"
        icon={<HistoryIcon color="primary" />}
        maxWidth="sm"
        hideActions
      >
        <Box
          component="pre"
          sx={{
            p: 2,
            backgroundColor: '#0f172a',
            color: '#38bdf8',
            borderRadius: 2,
            overflow: 'auto',
            fontSize: '0.8125rem',
            fontFamily: 'monospace',
            m: 0,
            maxHeight: 400,
          }}
        >
          {JSON.stringify(selectedChanges, null, 2)}
        </Box>
      </FormDialog>
    </Box>
  );
}
