'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
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
import PageHeader from '@/components/layout/PageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AUDIT_ACTION_MAP,
  EQUIPMENT_STATUS_MAP,
  DOCUMENT_TYPE_MAP,
  APPROVAL_TYPE_MAP,
  APPROVAL_STATUS_MAP,
  formatDateTime,
} from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
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

function formatValue(key: string, val: any): React.ReactNode {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Да' : 'Нет';

  if (key === 'status') {
    const s = EQUIPMENT_STATUS_MAP[val];
    if (s) {
      return <Chip label={s.label} size="small" color={s.color as any} sx={{ height: 20, fontSize: '0.7rem' }} />;
    }
  }

  if (key === 'docType') {
    return DOCUMENT_TYPE_MAP[val] || String(val);
  }

  if (key === 'type') {
    return APPROVAL_TYPE_MAP[val] || String(val);
  }

  if (key === 'approvalStatus') {
    const a = APPROVAL_STATUS_MAP[val];
    if (a) {
      return <Chip label={a.label} size="small" color={a.color as any} sx={{ height: 20, fontSize: '0.7rem' }} />;
    }
  }

  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  return String(val);
}

function RenderChangesDiff({ changes }: { changes: any }) {
  if (!changes || typeof changes !== 'object') {
    return <Typography variant="caption" color="text.secondary">—</Typography>;
  }

  const entries = Object.entries(changes);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {entries.map(([key, val]: [string, any]) => {
        // If it's a diff with old/new
        if (val && typeof val === 'object' && ('old' in val || 'new' in val)) {
          return (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: '#f8fafc',
                p: 0.75,
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '0.78125rem',
              }}
            >
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ minWidth: 100 }}>
                {key}:
              </Typography>
              <Box sx={{ color: '#dc2626', textDecoration: 'line-through', display: 'flex', alignItems: 'center' }}>
                {formatValue(key, val.old)}
              </Box>
              <ArrowRightAltIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Box sx={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {formatValue(key, val.new)}
              </Box>
            </Box>
          );
        }

        // Single field change / creation metadata
        return (
          <Box
            key={key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: '#f8fafc',
              p: 0.5,
              px: 0.75,
              borderRadius: '4px',
              fontSize: '0.75rem',
            }}
          >
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {key}:
            </Typography>
            <Box sx={{ fontWeight: 500 }}>{formatValue(key, val)}</Box>
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

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState(searchParams?.get('action') || '');
  const [equipmentFilter, setEquipmentFilter] = useState(searchParams?.get('equipmentId') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Equipment options for filter
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
        pageSize: '25',
      });
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
          setTotalPages(json.data.totalPages || 1);
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
  }, [page, actionFilter, equipmentFilter, startDate, endDate, enqueueSnackbar]);

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

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title="EPS — История изменений и аудит"
        subtitle="Сквозной журнал аудита событий оборудования, смены рабочих статусов, загрузки документов и решений согласования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'История изменений' },
        ]}
      />

      {/* KPI Cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => handleKpiFilter('')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: actionFilter === '' ? '2px solid #0284c7' : '1px solid #e2e8f0',
              backgroundColor: actionFilter === '' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="primary.main" fontWeight={700} fontSize="0.6875rem">
                ВСЕГО СОБЫТИЙ
              </Typography>
              <TimelineIcon color="primary" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: '#0f172a', fontSize: '1.25rem' }}>
              {stats.total}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => handleKpiFilter('CREATE')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: actionFilter === 'CREATE' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              backgroundColor: actionFilter === 'CREATE' ? 'rgba(22, 163, 74, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="success.main" fontWeight={700} fontSize="0.6875rem">
                СОЗДАНИЕ ОБЪЕКТОВ
              </Typography>
              <AddCircleOutlineIcon color="success" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'success.main', fontSize: '1.25rem' }}>
              {stats.creates}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => handleKpiFilter('UPDATE')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: actionFilter === 'UPDATE' ? '2px solid #0284c7' : '1px solid #e2e8f0',
              backgroundColor: actionFilter === 'UPDATE' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="info.main" fontWeight={700} fontSize="0.6875rem">
                ИЗМЕНЕНИЯ И СТАТУСЫ
              </Typography>
              <EditNoteIcon color="info" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'info.main', fontSize: '1.25rem' }}>
              {stats.updates}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => handleKpiFilter('DELETE')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: actionFilter === 'DELETE' ? '2px solid #dc2626' : '1px solid #e2e8f0',
              backgroundColor: actionFilter === 'DELETE' ? 'rgba(220, 38, 38, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="error.main" fontWeight={700} fontSize="0.6875rem">
                УДАЛЕНИЯ
              </Typography>
              <DeleteForeverOutlinedIcon color="error" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'error.main', fontSize: '1.25rem' }}>
              {stats.deletes}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Date Range Bar */}
      <Card sx={{ p: 1.25, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', flexGrow: 1 }}>
            <TextField
              select
              size="small"
              label="Тип действия"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">Все действия</MenuItem>
              {Object.entries(AUDIT_ACTION_MAP).map(([key, info]) => (
                <MenuItem key={key} value={key}>
                  {info.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Оборудование"
              value={equipmentFilter}
              onChange={(e) => {
                setEquipmentFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 240 }}
            >
              <MenuItem value="">Все единицы оборудования</MenuItem>
              {equipmentList.map((eq) => (
                <MenuItem key={eq.id} value={eq.id}>
                  {eq.inventoryNumber ? `[${eq.inventoryNumber}] ` : ''}{eq.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="С даты"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              sx={{ width: 150 }}
            />

            <TextField
              size="small"
              label="По дату"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              sx={{ width: 150 }}
            />

            {(actionFilter || equipmentFilter || startDate || endDate) && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setActionFilter('');
                  setEquipmentFilter('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                color="inherit"
              >
                Сбросить фильтры
              </Button>
            )}
          </Box>
        </Box>
      </Card>

      {/* Main Audit Log Table */}
      {loading ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Card>
      ) : items.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <HistoryOutlinedIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            События аудита не найдены
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Попробуйте изменить выбранные параметры фильтрации
          </Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 150 }}>Дата и время</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 150 }}>Пользователь</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 120 }}>Действие</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 180 }}>Сущность</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Оборудование</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Детализация изменений</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((log) => {
                  const actionInfo = AUDIT_ACTION_MAP[log.action] || { label: log.action, color: 'default' };

                  return (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                        {formatDateTime(log.createdAt)}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                        {log.user?.displayName || 'Система'}
                        {log.user?.ldapLogin && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            @{log.user.ldapLogin}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={actionInfo.label}
                          size="small"
                          color={actionInfo.color as any}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.8125rem' }}>
                        <Chip
                          label={ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>

                      <TableCell>
                        {log.equipment ? (
                          <Box
                            onClick={() => router.push(`/eps/${log.equipment!.id}`)}
                            sx={{
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.75,
                              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                            }}
                          >
                            <Chip
                              label={log.equipment.inventoryNumber || 'Б/Н'}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontFamily: 'monospace', height: 22 }}
                            />
                            <Typography variant="body2" fontWeight={500}>
                              {log.equipment.name}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <RenderChangesDiff changes={log.changes} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Всего записей в истории: {total}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, val) => setPage(val)}
              color="primary"
              size="medium"
            />
          </Box>
        </Card>
      )}
    </Box>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      }
    >
      <HistoryListContent />
    </Suspense>
  );
}
