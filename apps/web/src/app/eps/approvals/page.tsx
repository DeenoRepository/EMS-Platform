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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Tabs,
  Tab,
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
} from '@/components/ui';

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
    manufacturer: string | null;
    model: string | null;
    location: string | null;
    status: string;
  };
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
      const res = await fetch(`/api/eps/approvals/${selectedApprovalForReview.id}/resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
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

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0);

  const canCreate = hasPermission(PERMISSIONS.EPS_APPROVALS_CREATE) || hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  const canManage = hasPermission(PERMISSIONS.EPS_APPROVALS_MANAGE) || hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title="EPS — Согласования оборудования"
        subtitle="Единый центр согласования ввода в эксплуатацию, актов списания, смены статусов и нормативно-технической документации"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Согласования' },
        ]}
        actions={
          canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
              sx={{ px: 2.25, py: 0.75, fontWeight: 600 }}
            >
              Создать заявку
            </Button>
          )
        }
      />

      {/* Top KPI Metric Cards Bar with StatCard */}
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

      {/* Scope Navigation Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={scopeTab}
          onChange={(_, val) => {
            setScopeTab(val);
            setPage(1);
          }}
          sx={{ px: 2, minHeight: 44 }}
        >
          <Tab value="all" label="Все заявки" sx={{ minHeight: 44 }} />
          <Tab
            value="to_review"
            label={`Требуют рассмотрения (${stats.pending})`}
            sx={{ fontWeight: stats.pending > 0 ? 700 : 500, minHeight: 44 }}
          />
          <Tab value="my_requests" label="Мои заявки" sx={{ minHeight: 44 }} />
        </Tabs>
      </Paper>

      {/* Filter and Search Bar */}
      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
      >
        <Box sx={{ minWidth: { xs: '100%', sm: 280 } }}>
          <SearchInput
            value={search}
            placeholder="Поиск по теме, описанию, инв. номеру..."
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </Box>

        <TextField
          select
          size="small"
          label="Тип согласования"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="">Все типы</MenuItem>
          {Object.entries(APPROVAL_TYPE_MAP).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Статус"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Все статусы</MenuItem>
          {Object.entries(APPROVAL_STATUS_MAP).map(([key, info]) => (
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
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Все единицы</MenuItem>
          {equipmentList.map((eq) => (
            <MenuItem key={eq.id} value={eq.id}>
              {eq.inventoryNumber ? `[${eq.inventoryNumber}] ` : ''}{eq.name}
            </MenuItem>
          ))}
        </TextField>
      </FilterToolbar>

      {/* Main Approvals Table */}
      {items.length === 0 && !loading ? (
        <EmptyState
          paper
          icon={<FactCheckOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
          title="Заявки на согласование не найдены"
          description={
            activeFilterCount > 0
              ? 'По заданным критериям фильтрации заявки не найдены. Попробуйте сбросить фильтры.'
              : 'В системе пока нет активных заявок на согласование.'
          }
          actionText={activeFilterCount > 0 ? 'Сбросить фильтры' : (canCreate ? 'Создать заявку' : undefined)}
          onAction={activeFilterCount > 0 ? handleResetFilters : (canCreate ? () => setCreateModalOpen(true) : undefined)}
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
                <TableCell sx={{ fontWeight: 700 }}>Тема / Заявка</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Оборудование</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 170 }}>Тип согласования</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Статус</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }}>Инициатор</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130 }}>Дата подачи</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Решение / Автор</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((app) => {
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
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                        {app.title}
                      </Typography>
                      {app.description && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 260 }}>
                          {app.description}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/eps/${app.equipment.id}`);
                        }}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.75,
                          '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                        }}
                      >
                        <Chip
                          label={app.equipment.inventoryNumber || 'Б/Н'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontFamily: 'monospace', height: 20, borderRadius: '4px' }}
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {app.equipment.name}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={APPROVAL_TYPE_MAP[app.type] || app.type}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, borderRadius: '4px' }}
                      />
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>

                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {app.requester.displayName}
                    </TableCell>

                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {formatDateTime(app.createdAt)}
                    </TableCell>

                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {app.reviewer ? (
                        <Box>
                          <Typography variant="caption" fontWeight={600} display="block">
                            {app.reviewer.displayName}
                          </Typography>
                          {app.resolutionComment && (
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 150 }}>
                              «{app.resolutionComment}»
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Ожидает рассмотрения
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {isPending && canManage ? (
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
                          onClick={() => {
                            if (confirm('Отозвать данную заявку?')) {
                              setSelectedApprovalForReview(app);
                              handleProcessReview('CANCELLED');
                            }
                          }}
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableWrapper>
      )}

      {/* Dialog 1: Create Approval Request */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новая заявка на согласование</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {/* Equipment Picker */}
            <Autocomplete
              options={equipmentList}
              getOptionLabel={(option) => `${option.inventoryNumber ? `[${option.inventoryNumber}] ` : ''}${option.name}`}
              value={selectedEquipmentForCreate}
              onChange={(_, val) => setSelectedEquipmentForCreate(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Оборудование *"
                  placeholder="Выберите единицу оборудования"
                  size="small"
                  fullWidth
                />
              )}
            />

            {/* Approval Type */}
            <TextField
              select
              size="small"
              label="Тип согласования *"
              value={createType}
              onChange={(e) => setCreateType(e.target.value)}
              fullWidth
            >
              {Object.entries(APPROVAL_TYPE_MAP).map(([k, label]) => (
                <MenuItem key={k} value={k}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            {/* Target Status (if status change) */}
            {createType === 'STATUS_CHANGE' && (
              <TextField
                select
                size="small"
                label="Целевой рабочий статус *"
                value={createTargetStatus}
                onChange={(e) => setCreateTargetStatus(e.target.value)}
                fullWidth
              >
                {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, info]) => (
                  <MenuItem key={k} value={k}>
                    {info.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Title */}
            <TextField
              label="Тема заявки *"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              size="small"
              fullWidth
              placeholder="Например: Согласование акта списания насосного агрегата"
            />

            {/* Description */}
            <TextField
              label="Обоснование / Описание"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              multiline
              rows={3}
              size="small"
              fullWidth
              placeholder="Укажите причину (выработка ресурса, результаты дефектовки, номер приказа)..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateModalOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!selectedEquipmentForCreate || !createTitle.trim() || submittingCreate}
          >
            {submittingCreate ? <CircularProgress size={20} /> : 'Подать на согласование'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Review Resolution Modal */}
      <Dialog open={reviewModalOpen} onClose={() => setReviewModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Рассмотрение заявки на согласование</DialogTitle>
        <DialogContent dividers>
          {selectedApprovalForReview && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Оборудование:
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  {selectedApprovalForReview.equipment.name} (Инв. №: {selectedApprovalForReview.equipment.inventoryNumber || 'Б/Н'})
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="caption" color="text.secondary" display="block">
                  Тип согласования:
                </Typography>
                <Chip
                  label={APPROVAL_TYPE_MAP[selectedApprovalForReview.type] || selectedApprovalForReview.type}
                  size="small"
                  color="primary"
                  sx={{ mt: 0.5, fontWeight: 700 }}
                />

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                  Тема заявки:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedApprovalForReview.title}
                </Typography>

                {selectedApprovalForReview.description && (
                  <>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Обоснование инициатора ({selectedApprovalForReview.requester.displayName}):
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      «{selectedApprovalForReview.description}»
                    </Typography>
                  </>
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
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
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
        </DialogActions>
      </Dialog>

      {/* Dialog 3: Approval Details Modal */}
      <Dialog open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Сведения о заявке на согласование</DialogTitle>
        <DialogContent dividers>
          {selectedApprovalForDetails && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  label={APPROVAL_TYPE_MAP[selectedApprovalForDetails.type] || selectedApprovalForDetails.type}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label={APPROVAL_STATUS_MAP[selectedApprovalForDetails.status]?.label || selectedApprovalForDetails.status}
                  size="small"
                  color={APPROVAL_STATUS_MAP[selectedApprovalForDetails.status]?.color as any}
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              <Typography variant="h6" fontWeight={700}>
                {selectedApprovalForDetails.title}
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Оборудование:
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  {selectedApprovalForDetails.equipment.name} • Инв. №: {selectedApprovalForDetails.equipment.inventoryNumber || 'Б/Н'}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="caption" color="text.secondary" display="block">
                  Инициатор заявки:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedApprovalForDetails.requester.displayName} ({formatDateTime(selectedApprovalForDetails.createdAt)})
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsModalOpen(false)} color="inherit">
            Закрыть
          </Button>
          {selectedApprovalForDetails && (
            <Button
              variant="outlined"
              onClick={() => router.push(`/eps/${selectedApprovalForDetails.equipment.id}`)}
            >
              Перейти в паспорт оборудования
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      }
    >
      <ApprovalsListContent />
    </Suspense>
  );
}
