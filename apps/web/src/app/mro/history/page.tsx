'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Stack,
  TextField,
  MenuItem,
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PersonIcon from '@mui/icons-material/Person';
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
import { formatDateTime, formatDate } from '@ems/shared';
import { useSnackbar } from 'notistack';

interface MaintenanceHistoryItem {
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

const HISTORY_COLUMNS: TableColumnOption[] = [
  { id: 'actualDate', label: 'Дата и время завершения', defaultVisible: true },
  { id: 'equipment', label: 'Оборудование', defaultVisible: true },
  { id: 'plan', label: 'Регламент / Техкарта', defaultVisible: true },
  { id: 'completedBy', label: 'Исполнитель', defaultVisible: true },
  { id: 'notes', label: 'Заключение / Примечания', defaultVisible: true },
  { id: 'status', label: 'Статус', defaultVisible: true },
  { id: 'actions', label: 'Протокол', defaultVisible: true, required: true },
];

export default function MroHistoryPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [schedules, setSchedules] = useState<MaintenanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const [sortField, setSortField] = useState<string>('actualDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    HISTORY_COLUMNS.filter((c) => c.defaultVisible !== false).map((c) => c.id)
  );

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mro/schedules');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const completedOnly = json.data.filter((s: any) => s.status === 'COMPLETED');
          setSchedules(completedOnly);
        } else {
          setSchedules([]);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке журнала ТО', { variant: 'error' });
      setSchedules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const filteredHistory = useMemo(() => {
    let list = schedules.filter((sch) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const eqName = sch.equipment?.name?.toLowerCase() || '';
      const eqInv = sch.equipment?.inventoryNumber?.toLowerCase() || '';
      const planName = sch.plan?.name?.toLowerCase() || '';
      const user = sch.completedBy?.displayName?.toLowerCase() || '';
      return eqName.includes(q) || eqInv.includes(q) || planName.includes(q) || user.includes(q);
    });

    list.sort((a, b) => {
      let valA: any = a.actualDate || a.scheduledDate;
      let valB: any = b.actualDate || b.scheduledDate;

      if (sortField === 'equipment') {
        valA = a.equipment?.name || '';
        valB = b.equipment?.name || '';
      } else if (sortField === 'completedBy') {
        valA = a.completedBy?.displayName || '';
        valB = b.completedBy?.displayName || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [schedules, search, sortField, sortDirection]);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const paginatedHistory = useMemo(() => {
    return filteredHistory.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredHistory, page, rowsPerPage]);

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* 1. Header */}
      <PageHeader
        title="Журнал выполненных ТО"
        subtitle="Архив и протоколы проведенных регламентных работ, списания ТМЦ и фиксации исполнителей"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'ТО и Ремонт', href: '/mro' },
          { label: 'Журнал выполненных ТО' },
        ]}
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon className={refreshing ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
            onClick={handleRefresh}
            sx={{ fontWeight: 600, borderRadius: '8px', minHeight: 36 }}
          >
            Обновить
          </Button>
        }
      />

      {/* 2. KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Всего проведено ТО"
            value={schedules.length}
            icon={<CheckCircleOutlineIcon />}
            iconColor="#16a34a"
            iconBgColor="rgba(22, 163, 74, 0.08)"
            loading={loading}
            subtitle="Зафиксированных актов ТОиР"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Обслужено единиц оборудования"
            value={new Set(schedules.map((s) => s.equipmentId)).size}
            icon={<PrecisionManufacturingIcon />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            loading={loading}
            subtitle="Уникальных станков и агрегатов"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Задействовано исполнителей"
            value={new Set(schedules.map((s) => s.completedBy?.id).filter(Boolean)).size}
            icon={<PersonIcon />}
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            loading={loading}
            subtitle="Слесарей и инженеров в журнале"
          />
        </Grid>
      </Grid>

      {/* 3. Table Wrapper */}
      <DataTableWrapper
        title="Архив протоколов и актов выполненного ТО"
        subtitle={`Всего выполненных записей: ${filteredHistory.length}`}
        loading={loading}
        page={page}
        pageSize={rowsPerPage}
        total={filteredHistory.length}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        pageSizeOptions={[15, 25, 50, 100]}
        stickyHeader
        emptyState={
          <EmptyState
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 44, color: '#94a3b8' }} />}
            title="Записей пока нет"
            description="В системе пока нет завершенных регламентных работ."
          />
        }
        storageKey="mro_history_table"
        columns={HISTORY_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbar={
          <FilterToolbar
            activeFilterCount={search ? 1 : 0}
            onResetFilters={() => {
              setSearch('');
              setPage(0);
            }}
          >
            <Box sx={{ width: { xs: '100%', sm: 300 } }}>
              <SearchInput
                value={search}
                onSearch={(val) => {
                  setSearch(val);
                  setPage(0);
                }}
                placeholder="Поиск по оборудованию, регламенту, исполнителю..."
              />
            </Box>
          </FilterToolbar>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              {visibleColumns.includes('actualDate') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'actualDate'}
                    direction={sortField === 'actualDate' ? sortDirection : 'desc'}
                    onClick={() => {
                      const isAsc = sortField === 'actualDate' && sortDirection === 'asc';
                      setSortDirection(isAsc ? 'desc' : 'asc');
                      setSortField('actualDate');
                    }}
                  >
                    Дата завершения
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('equipment') && (
                <TableCell sx={{ minWidth: 240 }}>Оборудование</TableCell>
              )}
              {visibleColumns.includes('plan') && (
                <TableCell sx={{ minWidth: 200 }}>Регламент</TableCell>
              )}
              {visibleColumns.includes('completedBy') && (
                <TableCell sx={{ minWidth: 160 }}>Исполнитель</TableCell>
              )}
              {visibleColumns.includes('notes') && (
                <TableCell sx={{ minWidth: 220 }}>Заключение</TableCell>
              )}
              {visibleColumns.includes('status') && (
                <TableCell sx={{ minWidth: 120 }}>Статус</TableCell>
              )}
              {visibleColumns.includes('actions') && (
                <TableCell align="right" sx={{ minWidth: 100 }}>
                  Протокол
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedHistory.map((sch) => (
              <TableRow key={sch.id} hover>
                {visibleColumns.includes('actualDate') && (
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {sch.actualDate ? formatDateTime(sch.actualDate) : formatDate(sch.scheduledDate)}
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
                      {sch.plan?.name || 'Плановое регламентное ТО'}
                    </Typography>
                  </TableCell>
                )}
                {visibleColumns.includes('completedBy') && (
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {sch.completedBy?.displayName || 'Дежурный инженер'}
                  </TableCell>
                )}
                {visibleColumns.includes('notes') && (
                  <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    {sch.notes || 'Работы выполнены в полном объеме, дефектов не выявлено.'}
                  </TableCell>
                )}
                {visibleColumns.includes('status') && (
                  <TableCell>
                    <StatusBadge status="COMPLETED" size="small" />
                  </TableCell>
                )}
                {visibleColumns.includes('actions') && (
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedSchedule(sch);
                        setIsWizardOpen(true);
                      }}
                      sx={{ fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', py: 0.25 }}
                    >
                      Протокол
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Protocol Modal */}
      {isWizardOpen && (
        <MroExecutionWizardDialog
          open={isWizardOpen}
          schedule={selectedSchedule}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => {
            setIsWizardOpen(false);
            fetchHistory();
          }}
        />
      )}
    </Box>
  );
}
