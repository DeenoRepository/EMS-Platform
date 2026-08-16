'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
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
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PageHeader from '@/components/layout/PageHeader';
import { formatDateTime, AUDIT_ACTION_MAP } from '@ems/shared';
import { useSnackbar } from 'notistack';

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

  return (
    <Box>
      <PageHeader
        title="Журнал аудита действий"
        subtitle="Неизменяемый реестр всех операций создания, изменения и удаления данных"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование' },
          { label: 'Журнал аудита' },
        ]}
      />

      {/* Filters Bar */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <TextField
            size="small"
            placeholder="Поиск по ID или пользователю..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 260 }}
          />

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

          <Button type="submit" variant="outlined" size="medium">
            Применить
          </Button>
        </Box>
      </Card>

      {/* Log Table */}
      <Card>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Дата и время</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Пользователь</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Действие</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Тип объекта</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>ID объекта</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>IP адрес</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Изменения</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        Записей аудита не найдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const actionInfo = AUDIT_ACTION_MAP[log.action] || { label: log.action, color: 'default' };
                      return (
                        <TableRow key={log.id} hover>
                          <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDateTime(log.createdAt)}</TableCell>
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
                            <Chip label={actionInfo.label} size="small" color={actionInfo.color as any} />
                          </TableCell>
                          <TableCell>
                            <Chip label={log.entityType} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {log.entityId}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                            {log.ipAddress || '—'}
                          </TableCell>
                          <TableCell align="right">
                            {log.changes ? (
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => setSelectedChanges(log.changes)}
                                title="Посмотреть детали изменений"
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Всего записей: {total}
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => setPage(val)}
                color="primary"
                size="small"
              />
            </Box>
          </>
        )}
      </Card>

      {/* Changes JSON Viewer Modal */}
      <Dialog open={Boolean(selectedChanges)} onClose={() => setSelectedChanges(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Детали изменений (Payload / Diff)</DialogTitle>
        <DialogContent dividers>
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
            }}
          >
            {JSON.stringify(selectedChanges, null, 2)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedChanges(null)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
