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
  Pagination,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Autocomplete,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  APPROVAL_TYPE_MAP,
  APPROVAL_STATUS_MAP,
  EQUIPMENT_STATUS_MAP,
  formatDateTime,
  PERMISSIONS,
} from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import {
  StatCard,
  StatusBadge,
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  PageLoading,
  FormDialog,
  ConfirmDialog,
  NavTabsContainer,
  type TableColumnOption,
} from '@/components/ui';
import { ApprovalWizardDialog } from '@/components/eps';

interface ApprovalItem {
  id: string;
  equipmentId: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  proposedData: any | null;
  requesterId: string;
  reviewerId: string | null;
  reviewedAt: string | null;
  resolutionComment: string | null;
  createdAt: string;
  updatedAt: string;
  equipment: {
    id: string;
    name: string;
    inventoryNumber: string | null;
    manufacturer?: string | null;
    model?: string | null;
    location?: string | null;
    status?: string;
  } | null;
  requester: {
    id: string;
    displayName: string;
    ldapLogin: string;
  };
  reviewer: {
    id: string;
    displayName: string;
    ldapLogin: string;
  } | null;
}

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber: string | null;
  status: string;
}

function ApprovalsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<string>('date');
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
        case 'title':
          aVal = a.title || '';
          bVal = b.title || '';
          break;
        case 'inventoryNumber':
          aVal = a.equipment?.inventoryNumber || '';
          bVal = b.equipment?.inventoryNumber || '';
          break;
        case 'equipment':
          aVal = a.equipment?.name || '';
          bVal = b.equipment?.name || '';
          break;
        case 'manufacturer':
          aVal = a.equipment?.manufacturer || '';
          bVal = b.equipment?.manufacturer || '';
          break;
        case 'type':
          aVal = a.type || '';
          bVal = b.type || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'requester':
          aVal = a.requester?.displayName || '';
          bVal = b.requester?.displayName || '';
          break;
        case 'date':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'reviewer':
          aVal = a.reviewer?.displayName || '';
          bVal = b.reviewer?.displayName || '';
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

  // Scope Tab: 'all' | 'to_review' | 'my_requests'
  const [scopeTab, setScopeTab] = useState<'all' | 'to_review' | 'my_requests'>('all');

  // Filters
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams?.get('type') || '');
  const [equipmentFilter, setEquipmentFilter] = useState(searchParams?.get('equipmentId') || '');

  // Equipment options for filter & create
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  });

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedEquipmentForCreate, setSelectedEquipmentForCreate] = useState<EquipmentOption | null>(null);
  const [createType, setCreateType] = useState('DECOMMISSIONING');
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createTargetStatus, setCreateTargetStatus] = useState('UNDER_REPAIR');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Review Resolution Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedApprovalForReview, setSelectedApprovalForReview] = useState<ApprovalItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED' | 'CANCELLED'>('APPROVED');
  const [resolutionComment, setResolutionComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Detailed Modal View
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedApprovalForDetails, setSelectedApprovalForDetails] = useState<ApprovalItem | null>(null);
  const [revokeApproval, setRevokeApproval] = useState<ApprovalItem | null>(null);

  const fetchEquipmentList = async () => {
    try {
      const res = await fetch('/api/eps/equipment?pageSize=100');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setEquipmentList(
            json.data.items.map((eq: any) => ({
              id: eq.id,
              name: eq.name,
              inventoryNumber: eq.inventoryNumber,
              status: eq.status,
            }))
          );
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (equipmentFilter) params.append('equipmentId', equipmentFilter);
      if (scopeTab === 'to_review') params.append('scope', 'to_review');
      if (scopeTab === 'my_requests') params.append('scope', 'my_requests');

      const res = await fetch(`/api/eps/approvals?${params.toString()}`);
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
      enqueueSnackbar('Ошибка загрузки заявок на согласование', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, typeFilter, equipmentFilter, scopeTab, enqueueSnackbar]);

  useEffect(() => {
    fetchEquipmentList();
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleKpiFilter = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter('');
    } else {
      setStatusFilter(status);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setEquipmentFilter('');
    setPage(1);
  };

  // Create Approval Submit
  const handleCreateSubmit = async () => {
    if (!selectedEquipmentForCreate) {
      enqueueSnackbar('Выберите единицу оборудования', { variant: 'warning' });
      return;
    }
    if (!createTitle.trim()) {
      enqueueSnackbar('Укажите наименование/тему заявки', { variant: 'warning' });
      return;
    }

    setSubmittingCreate(true);
    try {
      let proposedData: any = null;
      if (createType === 'STATUS_CHANGE') {
        proposedData = { targetStatus: createTargetStatus };
      } else if (createType === 'DECOMMISSIONING') {
        proposedData = { targetStatus: 'DECOMMISSIONED' };
      } else if (createType === 'COMMISSIONING') {
        proposedData = { targetStatus: 'ACTIVE' };
      }

      const res = await fetch('/api/eps/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: selectedEquipmentForCreate.id,
          type: createType,
          title: createTitle,
          description: createDescription,
          proposedData,
        }),
      });

      const json = await res.json();
      if (json.success) {
        enqueueSnackbar('Заявка на согласование успешно создана', { variant: 'success' });
        setCreateModalOpen(false);
        setSelectedEquipmentForCreate(null);
        setCreateTitle('');
        setCreateDescription('');
        fetchApprovals();
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания заявки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при создании заявки', { variant: 'error' });
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleProcessReview = async (decision: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    if (!selectedApprovalForReview) return;
    if (decision === 'REJECTED' && !resolutionComment.trim()) {
      enqueueSnackbar('Для отклонения заявки обязательно укажите причину в комментарии', { variant: 'warning' });
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/eps/approvals/${selectedApprovalForReview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision,
          resolutionComment: resolutionComment.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const msg =
          decision === 'APPROVED'
            ? 'Заявка успешно согласована. Статус оборудования обновлен!'
            : decision === 'REJECTED'
            ? 'Заявка отклонена'
            : 'Заявка отозвана';
        enqueueSnackbar(msg, { variant: decision === 'APPROVED' ? 'success' : 'info' });
        setReviewModalOpen(false);
        setSelectedApprovalForReview(null);
        setResolutionComment('');
        fetchApprovals();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения решения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при обработке решения', { variant: 'error' });
  } finally {
      setSubmittingReview(false);
    }
  };

  const APPROVAL_COLUMNS: TableColumnOption[] = [
    { id: 'title', label: 'Тема / Заявка', defaultVisible: true },
    { id: 'inventoryNumber', label: 'Инв. номер', defaultVisible: true },
    { id: 'equipment', label: 'Оборудование', defaultVisible: true },
    { id: 'manufacturer', label: 'Производитель', defaultVisible: true },
    { id: 'type', label: 'Тип согласования', defaultVisible: true },
    { id: 'status', label: 'Статус', defaultVisible: true },
    { id: 'requester', label: 'Инициатор', defaultVisible: true },
    { id: 'date', label: 'Дата подачи', defaultVisible: true },
    { id: 'reviewer', label: 'Решение / Автор', defaultVisible: true },
    { id: 'actions', label: 'Действия', defaultVisible: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    APPROVAL_COLUMNS.map((c) => c.id)
  );

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0);

  const canCreate = hasPermission(PERMISSIONS.EPS_APPROVALS_CREATE) || hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  const canManage = hasPermission(PERMISSIONS.EPS_APPROVALS_MANAGE) || hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  const canReview = canManage;

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Согласование изменений оборудования"
        subtitle="Процедура рассмотрения, утверждения и отклонения запросов на регистрацию, изменение реквизитов, списание и документы"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Согласования' },
        ]}
      />

      <Grid container spacing={1.75} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="На рассмотрении"
            value={stats.pending}
            subtitle="Ожидают решения"
            icon={<PendingActionsOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="#d97706"
            accentColor="#d97706"
            active={statusFilter === 'PENDING'}
            onClick={() => handleKpiFilter('PENDING')}
            loading={loading && stats.total === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Согласовано"
            value={stats.approved}
            subtitle="Одобренные заявки"
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="#16a34a"
            accentColor="#16a34a"
            active={statusFilter === 'APPROVED'}
            onClick={() => handleKpiFilter('APPROVED')}
            loading={loading && stats.total === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Отклонено"
            value={stats.rejected}
            subtitle="Отклоненные заявки"
            icon={<CancelOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="#dc2626"
            accentColor="#dc2626"
            active={statusFilter === 'REJECTED'}
            onClick={() => handleKpiFilter('REJECTED')}
            loading={loading && stats.total === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Отозвано"
            value={stats.cancelled}
            subtitle="Отмененные инициатором"
            icon={<RemoveCircleOutlineIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(100, 116, 139, 0.08)"
            iconColor="#64748b"
            accentColor="#64748b"
            active={statusFilter === 'CANCELLED'}
            onClick={() => handleKpiFilter('CANCELLED')}
            loading={loading && stats.total === 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Всего заявок"
            value={stats.total}
            subtitle="За все время"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(2, 132, 199, 0.08)"
            iconColor="#0284c7"
            accentColor="#0284c7"
            active={statusFilter === ''}
            onClick={() => handleKpiFilter('')}
            loading={loading && stats.total === 0}
          />
        </Grid>
      </Grid>

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
        columns={APPROVAL_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        stickyHeader
        tabs={
          <NavTabsContainer
            value={scopeTab}
            onChange={(val) => {
              setScopeTab(val);
              setPage(1);
            }}
            tabs={[
              { label: 'Все заявки', value: 'all' },
              {
                label: 'Требуют рассмотрения',
                value: 'to_review',
                badge: stats.pending,
                badgeColor: stats.pending > 0 ? 'warning' : 'default',
              },
              { label: 'Мои заявки', value: 'my_requests' },
            ]}
          />
        }
        empty={items.length === 0 && !loading}
        emptyState={
          <EmptyState
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
            title="Заявки на согласование не найдены"
            description={
              activeFilterCount > 0
                ? 'По заданным критериям фильтрации заявки не найдены. Попробуйте сбросить фильтры.'
                : 'В системе пока нет активных заявок на согласование.'
            }
            actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : (canCreate ? 'Создать заявку' : undefined)}
            onAction={activeFilterCount > 0 ? handleResetFilters : (canCreate ? () => setCreateModalOpen(true) : undefined)}
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
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{
                    displayEmpty: true,
                  }}
                  sx={{
                    minWidth: 170,
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
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все типы</MenuItem>
                  {Object.entries(APPROVAL_TYPE_MAP).map(([key, label]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
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
                      '&:hover fieldset': { borderColor: 'grey.400' },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все статусы</MenuItem>
                  {Object.entries(APPROVAL_STATUS_MAP).map(([key, info]) => (
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
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все единицы</MenuItem>
                  {equipmentList.map((eq) => (
                    <MenuItem key={eq.id} value={eq.id} sx={{ fontSize: '0.8125rem' }}>
                      {eq.inventoryNumber ? `[${eq.inventoryNumber}] ` : ''}{eq.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по теме, описанию, инв. номеру..."
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
              {visibleColumns.includes('title') && (
                <TableCell sx={{ minWidth: 200 }}>
                  <TableSortLabel
                    active={sortField === 'title'}
                    direction={sortField === 'title' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('title')}
                  >
                    Тема / заявка
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('inventoryNumber') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'inventoryNumber'}
                    direction={sortField === 'inventoryNumber' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('inventoryNumber')}
                  >
                    Инв. номер
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
              {visibleColumns.includes('manufacturer') && (
                <TableCell sx={{ minWidth: 150 }}>
                  <TableSortLabel
                    active={sortField === 'manufacturer'}
                    direction={sortField === 'manufacturer' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('manufacturer')}
                  >
                    Производитель
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('type') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'type'}
                    direction={sortField === 'type' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('type')}
                  >
                    Тип согласования
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('status') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    Статус
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('requester') && (
                <TableCell sx={{ minWidth: 150 }}>
                  <TableSortLabel
                    active={sortField === 'requester'}
                    direction={sortField === 'requester' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('requester')}
                  >
                    Инициатор
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('date') && (
                <TableCell sx={{ minWidth: 130 }}>
                  <TableSortLabel
                    active={sortField === 'date'}
                    direction={sortField === 'date' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('date')}
                  >
                    Дата подачи
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('reviewer') && (
                <TableCell sx={{ minWidth: 160 }}>
                  <TableSortLabel
                    active={sortField === 'reviewer'}
                    direction={sortField === 'reviewer' ? sortDirection : 'asc'}
                    onClick={() => handleRequestSort('reviewer')}
                  >
                    Решение / автор
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleColumns.includes('actions') && (
                <TableCell align="right" sx={{ minWidth: 110 }}>
                  Действия
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((app) => {
              const isPending = app.status === 'PENDING';
              const isRequester = user?.userId === app.requesterId;

              return (
                <TableRow
                  key={app.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedApprovalForDetails(app);
                    setDetailsModalOpen(true);
                  }}
                >
                  {visibleColumns.includes('title') && (
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.8125rem' }}>
                        {app.title}
                      </Typography>
                      {app.proposedData?.targetStatus && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Целевой статус:
                          </Typography>
                          <StatusBadge status={app.proposedData.targetStatus} size="small" variant="outlined" />
                        </Box>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.includes('inventoryNumber') && (
                    <TableCell sx={{ width: 120 }}>
                      {app.equipment?.inventoryNumber ? (
                        <Paper
                          variant="outlined"
                          sx={{
                            display: 'inline-block',
                            px: 0.85,
                            py: 0.2,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            bgcolor: 'background.default',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            color: 'text.secondary',
                            borderColor: 'grey.400',
                            lineHeight: 1.3,
                          }}
                        >
                          {app.equipment.inventoryNumber}
                        </Paper>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.includes('equipment') && (
                    <TableCell>
                      {app.equipment ? (
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            if (app.equipment?.id) {
                              router.push(`/eps/${app.equipment.id}`);
                            }
                          }}
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
                            {app.equipment.name}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.includes('manufacturer') && (
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {app.equipment?.manufacturer || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('type') && (
                    <TableCell>
                      <StatusBadge status={app.type} />
                    </TableCell>
                  )}

                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                  )}

                  {visibleColumns.includes('requester') && (
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {app.requester?.displayName || '—'}
                    </TableCell>
                  )}

                  {visibleColumns.includes('date') && (
                    <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'text.disabled' }}>
                      {formatDateTime(app.createdAt)}
                    </TableCell>
                  )}

                  {visibleColumns.includes('reviewer') && (
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {app.reviewer ? (
                        <Box>
                          <Typography variant="caption" fontWeight={600} display="block" sx={{ color: 'text.primary' }}>
                            {app.reviewer.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {app.reviewedAt ? formatDateTime(app.reviewedAt) : ''}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Не рассмотрено
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.includes('actions') && (
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {isPending && canReview ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            setSelectedApprovalForReview(app);
                            setResolutionComment('');
                            setReviewModalOpen(true);
                          }}
                          sx={{ fontSize: '0.75rem', px: 1.25, py: 0.25, borderRadius: '6px' }}
                        >
                          Решение
                        </Button>
                      ) : isPending && isRequester ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          onClick={() => setRevokeApproval(app)}
                          sx={{ fontSize: '0.75rem', px: 1, borderRadius: '6px' }}
                        >
                          Отозвать
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            setSelectedApprovalForDetails(app);
                            setDetailsModalOpen(true);
                          }}
                          sx={{ fontSize: '0.75rem', borderRadius: '6px' }}
                        >
                          Детали
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Мастер создания заявки на согласование */}
      <ApprovalWizardDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchApprovals}
      />

      {/* Dialog 2: Review Resolution Modal */}
      <FormDialog
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Рассмотрение заявки на согласование"
        icon={<CheckCircleOutlineIcon color="primary" />}
        maxWidth="sm"
        hideActions
      >
        {selectedApprovalForReview && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Оборудование:
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                {selectedApprovalForReview.equipment
                  ? `${selectedApprovalForReview.equipment.name} (Инв. №: ${selectedApprovalForReview.equipment.inventoryNumber || 'Б/Н'})`
                  : 'Оборудование удалено / не привязано'}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="caption" color="text.secondary" display="block">
                Тип согласования:
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <StatusBadge status={selectedApprovalForReview.type} />
              </Box>

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                Тема заявки:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {selectedApprovalForReview.title}
              </Typography>

              {selectedApprovalForReview.description && (
                <>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Обоснование инициатора ({selectedApprovalForReview.requester?.displayName || 'Инициатор'}):
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    «{selectedApprovalForReview.description}»
                  </Typography>
                </>
              )}

              {selectedApprovalForReview.proposedData && typeof selectedApprovalForReview.proposedData === 'object' && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.75 }}>
                    Предложенные данные / характеристики:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {Object.entries(selectedApprovalForReview.proposedData).map(([key, val]) => {
                      if (val === null || val === undefined || val === '') return null;
                      if (key === 'customFields' && typeof val === 'object') {
                        return Object.entries(val).map(([cfKey, cfVal]) => (
                          <Box key={cfKey} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', py: 0.25, borderBottom: '1px dashed #f1f5f9' }}>
                            <Typography variant="caption" color="text.secondary">{cfKey}:</Typography>
                            <Typography variant="caption" fontWeight={600}>{String(cfVal)}</Typography>
                          </Box>
                        ));
                      }
                      const labels: Record<string, string> = {
                        name: 'Наименование',
                        inventoryNumber: 'Инвентарный №',
                        serialNumber: 'Заводской №',
                        manufacturer: 'Производитель',
                        model: 'Модель',
                        location: 'Локация',
                        status: 'Целевой статус',
                        targetStatus: 'Целевой статус',
                      };
                      return (
                        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', py: 0.25, borderBottom: '1px dashed #f1f5f9' }}>
                          <Typography variant="caption" color="text.secondary">{labels[key] || key}:</Typography>
                          <Typography variant="caption" fontWeight={600}>{String(val)}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Paper>

            <Alert severity="info">
              При согласовании система <strong>автоматически обновит статус оборудования</strong> в базе данных и зафиксирует событие в Истории изменений.
            </Alert>

            <TextField
              label="Резолюция / Комментарий согласующего лица"
              value={resolutionComment}
              onChange={(e) => setResolutionComment(e.target.value)}
              multiline
              rows={3}
              size="small"
              fullWidth
              placeholder="Укажите комментарий, основание решения или номер служебной записки..."
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setReviewModalOpen(false)} color="inherit">
                Закрыть
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleProcessReview('REJECTED')}
                  disabled={submittingReview}
                >
                  Отклонить
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleProcessReview('APPROVED')}
                  disabled={submittingReview}
                >
                  {submittingReview ? <CircularProgress size={20} /> : 'Согласовать'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </FormDialog>

      {/* Dialog 3: Approval Details Modal */}
      <FormDialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Сведения о заявке на согласование"
        maxWidth="sm"
        hideActions
      >
        {selectedApprovalForDetails && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StatusBadge status={selectedApprovalForDetails.type} />
              <StatusBadge status={selectedApprovalForDetails.status} />
            </Box>

            <Typography variant="h6" fontWeight={700}>
              {selectedApprovalForDetails.title}
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Оборудование:
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                {selectedApprovalForDetails.equipment
                  ? `${selectedApprovalForDetails.equipment.name} • Инв. №: ${selectedApprovalForDetails.equipment.inventoryNumber || 'Б/Н'}`
                  : 'Оборудование удалено / не привязано'}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="caption" color="text.secondary" display="block">
                Инициатор заявки:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {selectedApprovalForDetails.requester?.displayName || 'Инициатор'} ({formatDateTime(selectedApprovalForDetails.createdAt)})
              </Typography>

              {selectedApprovalForDetails.description && (
                <>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                    Обоснование:
                  </Typography>
                  <Typography variant="body2">
                    {selectedApprovalForDetails.description}
                  </Typography>
                </>
              )}

              {selectedApprovalForDetails.proposedData && typeof selectedApprovalForDetails.proposedData === 'object' && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.75 }}>
                    Предложенные данные / характеристики:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {Object.entries(selectedApprovalForDetails.proposedData).map(([key, val]) => {
                      if (val === null || val === undefined || val === '') return null;
                      if (key === 'customFields' && typeof val === 'object') {
                        return Object.entries(val).map(([cfKey, cfVal]) => (
                          <Box key={cfKey} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', py: 0.25, borderBottom: '1px dashed #f1f5f9' }}>
                            <Typography variant="caption" color="text.secondary">{cfKey}:</Typography>
                            <Typography variant="caption" fontWeight={600}>{String(cfVal)}</Typography>
                          </Box>
                        ));
                      }
                      const labels: Record<string, string> = {
                        name: 'Наименование',
                        inventoryNumber: 'Инвентарный №',
                        serialNumber: 'Заводской №',
                        manufacturer: 'Производитель',
                        model: 'Модель',
                        location: 'Локация',
                        status: 'Целевой статус',
                        targetStatus: 'Целевой статус',
                      };
                      return (
                        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', py: 0.25, borderBottom: '1px dashed #f1f5f9' }}>
                          <Typography variant="caption" color="text.secondary">{labels[key] || key}:</Typography>
                          <Typography variant="caption" fontWeight={600}>{String(val)}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {selectedApprovalForDetails.reviewer && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary" display="block">
                    Решение принял:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedApprovalForDetails.reviewer.displayName} ({formatDateTime(selectedApprovalForDetails.reviewedAt)})
                  </Typography>

                  {selectedApprovalForDetails.resolutionComment && (
                    <>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Резолюция:
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        «{selectedApprovalForDetails.resolutionComment}»
                      </Typography>
                    </>
                  )}
                </>
              )}
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setDetailsModalOpen(false)} color="inherit">
                Закрыть
              </Button>
              {selectedApprovalForDetails.equipment && (
                <Button
                  variant="outlined"
                  onClick={() => router.push(`/eps/${selectedApprovalForDetails.equipment?.id}`)}
                >
                  Перейти в паспорт оборудования
                </Button>
              )}
            </Box>
          </Box>
        )}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(revokeApproval)}
        title="Отозвать заявку"
        message={`Вы действительно хотите отозвать заявку «${revokeApproval?.title || ''}»?`}
        variant="warning"
        confirmText="Отозвать заявку"
        cancelText="Отмена"
        loading={submittingReview}
        onConfirm={async () => {
          if (!revokeApproval) return;
          setSelectedApprovalForReview(revokeApproval);
          setRevokeApproval(null);
          await handleProcessReview('CANCELLED');
        }}
        onClose={() => setRevokeApproval(null)}
      />
    </Box>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка реестра заявок на согласование..." />}>
      <ApprovalsListContent />
    </Suspense>
  );
}
