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
  const [resolutionComment, setResolutionComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedApprovalForDetails, setSelectedApprovalForDetails] = useState<ApprovalItem | null>(null);

  // Load equipment list for selectors
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
                status: eq.status,
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

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        scope: scopeTab,
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (equipmentFilter) params.append('equipmentId', equipmentFilter);

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
      enqueueSnackbar('Ошибка загрузки списка согласований', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, scopeTab, search, statusFilter, typeFilter, equipmentFilter, enqueueSnackbar]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApprovals();
  };

  const handleKpiFilter = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter('');
    } else {
      setStatusFilter(status);
    }
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

  // Process Resolution Submit (Approve or Reject)
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
      if (json.success) {
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
              sx={{ px: 2.5, py: 1, fontWeight: 600 }}
            >
              Создать заявку
            </Button>
          )
        }
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('PENDING')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === 'PENDING' ? '2px solid #d97706' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'PENDING' ? 'rgba(217, 119, 6, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="warning.main" fontWeight={700} fontSize="0.6875rem">
                НА РАССМОТРЕНИИ
              </Typography>
              <PendingActionsOutlinedIcon color="warning" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'warning.main', fontSize: '1.25rem' }}>
              {stats.pending}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('APPROVED')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === 'APPROVED' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'APPROVED' ? 'rgba(22, 163, 74, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="success.main" fontWeight={700} fontSize="0.6875rem">
                СОГЛАСОВАНО
              </Typography>
              <CheckCircleOutlineIcon color="success" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'success.main', fontSize: '1.25rem' }}>
              {stats.approved}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('REJECTED')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === 'REJECTED' ? '2px solid #dc2626' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'REJECTED' ? 'rgba(220, 38, 38, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="error.main" fontWeight={700} fontSize="0.6875rem">
                ОТКЛОНЕНО
              </Typography>
              <CancelOutlinedIcon color="error" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'error.main', fontSize: '1.25rem' }}>
              {stats.rejected}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('CANCELLED')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === 'CANCELLED' ? '2px solid #64748b' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'CANCELLED' ? 'rgba(100, 116, 139, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize="0.6875rem">
                ОТОЗВАНО
              </Typography>
              <RemoveCircleOutlineIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: 'text.primary', fontSize: '1.25rem' }}>
              {stats.cancelled}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            onClick={() => handleKpiFilter('')}
            sx={{
              p: 1.25,
              cursor: 'pointer',
              border: statusFilter === '' ? '2px solid #0284c7' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === '' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
              transition: 'all 0.12s ease',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="primary.main" fontWeight={700} fontSize="0.6875rem">
                ВСЕГО ЗАЯВОК
              </Typography>
              <FactCheckOutlinedIcon color="primary" sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: '#0f172a', fontSize: '1.25rem' }}>
              {stats.total}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Scope Navigation Tabs */}
      <Card sx={{ mb: 2 }}>
        <Tabs
          value={scopeTab}
          onChange={(_, val) => {
            setScopeTab(val);
            setPage(1);
          }}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab value="all" label="Все заявки" />
          <Tab
            value="to_review"
            label={`Требуют рассмотрения (${stats.pending})`}
            sx={{ fontWeight: stats.pending > 0 ? 700 : 500 }}
          />
          <Tab value="my_requests" label="Мои заявки" />
        </Tabs>
      </Card>

      {/* Filter and Search Bar */}
      <Card sx={{ p: 1.25, mb: 2 }}>
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
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
              size="small"
              placeholder="Поиск по теме, описанию, инв. номеру..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 280, flexGrow: { xs: 1, md: 0 } }}
            />

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

            <Button type="submit" variant="outlined" size="small" sx={{ px: 2 }}>
              Применить
            </Button>
            {(search || statusFilter || typeFilter || equipmentFilter) && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setTypeFilter('');
                  setEquipmentFilter('');
                  setPage(1);
                }}
                color="inherit"
              >
                Сбросить
              </Button>
            )}
          </Box>
        </Box>
      </Card>

      {/* Main Approvals Table */}
      {loading ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Card>
      ) : items.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <FactCheckOutlinedIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Заявки на согласование не найдены
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Попробуйте изменить фильтры или подайте новую заявку
          </Typography>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateModalOpen(true)}>
              Создать заявку
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
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
                  const statusInfo = APPROVAL_STATUS_MAP[app.status] || { label: app.status, color: 'default' };
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
                            sx={{ fontWeight: 700, fontFamily: 'monospace', height: 22 }}
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
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          color={statusInfo.color as any}
                          sx={{ fontWeight: 700 }}
                        />
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
                            sx={{ fontSize: '0.75rem', px: 1.25, py: 0.25 }}
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
                            sx={{ fontSize: '0.75rem', px: 1 }}
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
                            sx={{ fontSize: '0.75rem' }}
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
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Всего заявок: {total}
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
