'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchApi } from '@/lib/api-client';
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
  TextField,
  MenuItem,
  Button,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PageHeader from '@/components/layout/PageHeader';
import { formatDateTime } from '@ems/shared';
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
import { sortAuditLogs, type AuditItem } from './audit-log-sort';

export default function AdminAuditLogPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
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
    return sortAuditLogs(logs, sortField, sortDirection);
  }, [logs, sortField, sortDirection]);

  // JSON viewer modal
  const [selectedChanges, setSelectedChanges] = useState<any | null>(null);
  const [pageSize, setPageSize] = useState(25);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (actionFilter) params.append('action', actionFilter);
    if (entityTypeFilter) params.append('entityType', entityTypeFilter);
    if (search) params.append('search', search);

    const json = await fetchApi<{ items: AuditItem[]; total: number; totalPages: number }>(
      `/api/admin/audit-log?${params.toString()}`
    );
    if (json.success && json.data) {
      setLogs(json.data.items || []);
      setTotal(json.data.total || 0);
    } else {
      enqueueSnackbar(json.error || 'Ошибка загрузки журнала аудита', { variant: 'error' });
    }
    setLoading(false);
  }, [page, pageSize, actionFilter, entityTypeFilter, search, enqueueSnackbar]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
        title="Журнал аудита безопасности и системных событий"
        subtitle="Сквозной протокол действий пользователей, авторизаций, изменений данных и критических операций"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/settings' },
          { label: 'Журнал аудита безопасности' },
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
            iconBgColor="action.hover"
            iconColor="primary.main"
            accentColor="primary.main"
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
            iconBgColor="success.light"
            iconColor="success.main"
            accentColor="success.main"
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
            iconBgColor="warning.light"
            iconColor="warning.main"
            accentColor="warning.main"
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
            iconBgColor="error.light"
            iconColor="error.main"
            accentColor="error.main"
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
        pageSize={pageSize}
        total={total}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        pageSizeOptions={[15, 20, 25, 50, 100]}
        storageKey="admin_audit_table"
        columns={AUDIT_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        stickyHeader
        empty={logs.length === 0 && !loading}
        emptyState={
          <EmptyState
            icon={<HistoryIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
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
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'text.disabled' },
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
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'text.disabled' },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все объекты</MenuItem>
                  <MenuItem value="Equipment" sx={{ fontSize: '0.8125rem' }}>Оборудование</MenuItem>
                  <MenuItem value="Document" sx={{ fontSize: '0.8125rem' }}>Документы</MenuItem>
                  <MenuItem value="StockOperation" sx={{ fontSize: '0.8125rem' }}>Складские операции</MenuItem>
                  <MenuItem value="Role" sx={{ fontSize: '0.8125rem' }}>Роли и права</MenuItem>
                  <MenuItem value="User" sx={{ fontSize: '0.8125rem' }}>Пользователи</MenuItem>
                  <MenuItem value="SystemSetting" sx={{ fontSize: '0.8125rem' }}>Параметры системы</MenuItem>
                  <MenuItem value="SystemModule" sx={{ fontSize: '0.8125rem' }}>Системные модули</MenuItem>
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
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
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
                            borderColor: 'divider',
                            color: 'text.secondary',
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
            backgroundColor: 'text.primary',
            color: 'primary.light',
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
