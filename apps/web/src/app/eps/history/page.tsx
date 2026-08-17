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
import { useSnackbar } from 'notistack';

import {
  StatCard,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  StatusBadge,
  PageLoading,
} from '@/components/ui';

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
    return <StatusBadge status={val} size="small" />;
  }

  if (key === 'docType') {
    return DOCUMENT_TYPE_MAP[val] || String(val);
  }

  if (key === 'type') {
    return APPROVAL_TYPE_MAP[val] || String(val);
  }

  if (key === 'approvalStatus') {
    return <StatusBadge status={val} size="small" />;
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

  if (entries.length === 0) {
    return <Typography variant="caption" color="text.secondary">—</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {entries.map(([key, val]: [string, any]) => {
        if (val && typeof val === 'object' && 'old' in val && 'new' in val) {
          return (
            <Box key={key} sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                {key}:
              </Typography>
              <Box component="span" sx={{ textDecoration: 'line-through', color: 'error.main', opacity: 0.8 }}>
                {formatValue(key, val.old)}
              </Box>
              <ArrowRightAltIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>
                {formatValue(key, val.new)}
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

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  // Filters
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
  }, [page, pageSize, actionFilter, equipmentFilter, startDate, endDate, enqueueSnackbar]);

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
    setActionFilter('');
    setEquipmentFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const activeFilterCount =
    (actionFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

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

      {/* Top KPI Metric Cards Bar */}
      <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего событий"
            value={stats.total}
            subtitle="Зафиксировано в аудите"
            icon={<TimelineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
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
            iconColor="#16a34a"
            accentColor="#16a34a"
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
            iconColor="#0284c7"
            accentColor="#0284c7"
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
            iconColor="#dc2626"
            accentColor="#dc2626"
            active={actionFilter === 'DELETE'}
            onClick={() => handleKpiFilter('DELETE')}
            loading={loading && stats.total === 0}
          />
        </Grid>
      </Grid>

      {/* Filter and Date Range Bar */}
      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
      >
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
      </FilterToolbar>

      {/* Main Audit Log Table */}
      {items.length === 0 && !loading ? (
        <EmptyState
          paper
          icon={<HistoryOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="События аудита не найдены"
          description={
            activeFilterCount > 0
              ? 'По выбранным параметрам фильтрации события аудита не найдены. Попробуйте сбросить фильтры.'
              : 'В журнале аудита пока нет зафиксированных событий.'
          }
          actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : undefined}
          onAction={activeFilterCount > 0 ? handleResetFilters : undefined}
        />
      ) : (
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
          stickyHeader
        >
          <Table size="small">
            <TableHead>
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
                      <StatusBadge status={log.action} />
                    </TableCell>

                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      <Chip
                        label={ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 500, height: 22, borderRadius: '4px' }}
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
                            sx={{ fontWeight: 700, fontFamily: 'monospace', height: 20, borderRadius: '4px' }}
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
        </DataTableWrapper>
      )}
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
