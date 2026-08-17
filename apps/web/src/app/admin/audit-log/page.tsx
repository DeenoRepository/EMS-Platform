'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Pagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  InputAdornment,
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

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto', pb: 4 }}>
      <PageHeader
        title="Журнал аудита действий"
        subtitle="Неизменяемый реестр всех операций создания, изменения и удаления данных"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование' },
          { label: 'Журнал аудита' },
        ]}
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего событий"
            value={total}
            subtitle="Зафиксировано в аудите"
            icon={<HistoryIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            active={actionFilter === ''}
            onClick={() => {
              setActionFilter('');
              setPage(1);
            }}
            loading={loading && total === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Создание (CREATE)"
            value={logs.filter((l) => l.action === 'CREATE').length}
            subtitle="Новые объекты"
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

      {/* Filter Toolbar */}
      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
      >
        <Box sx={{ minWidth: 280 }}>
          <SearchInput
            placeholder="Поиск по ID или пользователю..."
            value={search}
            onSearch={(val: string) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </Box>

        <TextField
          select
          size="small"
          label="Действие"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Все действия</MenuItem>
          <MenuItem value="CREATE">Создание</MenuItem>
          <MenuItem value="UPDATE">Изменение</MenuItem>
          <MenuItem value="DELETE">Удаление</MenuItem>
          <MenuItem value="LOGIN">Вход</MenuItem>
          <MenuItem value="LOGOUT">Выход</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Объект"
          value={entityTypeFilter}
          onChange={(e) => {
            setEntityTypeFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Все объекты</MenuItem>
          <MenuItem value="Equipment">Оборудование (Equipment)</MenuItem>
          <MenuItem value="Document">Документ (Document)</MenuItem>
          <MenuItem value="StockOperation">Складская операция</MenuItem>
          <MenuItem value="Role">Роль (Role)</MenuItem>
          <MenuItem value="User">Пользователь (User)</MenuItem>
          <MenuItem value="SystemSetting">Настройки</MenuItem>
        </TextField>
      </FilterToolbar>

      {/* Audit Log Table */}
      {logs.length === 0 && !loading ? (
        <EmptyState
          paper
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
      ) : (
        <DataTableWrapper
          loading={loading}
          page={page - 1}
          pageSize={20}
          total={total}
          onPageChange={(_, newPage) => setPage(newPage + 1)}
          stickyHeader
        >
          <Table size="small" aria-label="Журнал аудита действий">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 150 }}>Дата и время</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Пользователь</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Действие</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }}>Тип объекта</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ID объекта</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130 }}>IP адрес</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 100 }}>Изменения</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => {
                return (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600} fontSize="0.8125rem">
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
                    <TableCell>
                      <StatusBadge status={log.action} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.entityType} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {log.entityId}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                      {log.ipAddress || '—'}
                    </TableCell>
                    <TableCell align="right">
                      {log.changes ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectedChanges(log.changes)}
                        >
                          Детали
                        </Button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

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
