'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PageHeader from '@/components/layout/PageHeader';
import { sortApprovals } from '../approval-registry-model';
import {
  APPROVAL_TYPE_MAP,
  APPROVAL_STATUS_MAP,
  PERMISSIONS,
} from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import {
  StatCard,
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  PageLoading,
  ConfirmDialog,
  NavTabsContainer,
  type TableColumnOption,
} from '@/components/ui';
import { ApprovalWizardDialog } from '@/components/eps';
import ApprovalReviewDialog, { ApprovalReviewDecision } from '@/components/eps/ApprovalReviewDialog';
import ApprovalDetailsDialog from '@/components/eps/ApprovalDetailsDialog';
import ApprovalTableView, { ApprovalTableItem, ApprovalSortField, ApprovalSortDirection } from '@/components/eps/ApprovalTableView';

const APPROVAL_REVIEW_FEEDBACK: Record<ApprovalReviewDecision, { message: string; variant: 'success' | 'info' }> = {
  APPROVED: { message: 'Заявка успешно согласована. Статус оборудования обновлен!', variant: 'success' },
  REJECTED: { message: 'Заявка отклонена', variant: 'info' },
  CANCELLED: { message: 'Заявка успешно отозвана инициатором', variant: 'info' },
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

function ApprovalRegistryContent() {
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<ApprovalTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [activeScopeTab, setActiveScopeTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');

  const [sortField, setSortField] = useState<ApprovalSortField>('date');
  const [sortDirection, setSortDirection] = useState<ApprovalSortDirection>('desc');

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    total: 0,
    toReview: 0,
    myPending: 0,
    myRejected: 0,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedApprovalForReview, setSelectedApprovalForReview] = useState<ApprovalTableItem | null>(null);
  const [selectedApprovalForDetails, setSelectedApprovalForDetails] = useState<ApprovalTableItem | null>(null);
  const [resolutionComment, setResolutionComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [revokeApproval, setRevokeApproval] = useState<ApprovalTableItem | null>(null);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    APPROVAL_COLUMNS.map((c) => c.id)
  );

  const canAccessApprovals = hasPermission(PERMISSIONS.EPS_APPROVALS_VIEW) || hasPermission(PERMISSIONS.EPS_EQUIPMENT_VIEW);
  const canCreate = hasPermission(PERMISSIONS.EPS_APPROVALS_CREATE) || hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  const canManage = hasPermission(PERMISSIONS.EPS_APPROVALS_MANAGE) || hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  const canReview = canManage;

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(rowsPerPage),
      });

      if (activeScopeTab === 'to_review') params.set('scope', 'to_review');
      else if (activeScopeTab === 'my_requests') params.set('scope', 'my_requests');
      else if (activeScopeTab === 'my_rejected') {
        params.set('scope', 'my_requests');
        params.set('status', 'REJECTED');
      }

      if (search) params.set('search', search);
      if (statusFilter && activeScopeTab !== 'my_rejected') params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (equipmentFilter) params.set('equipmentId', equipmentFilter);

      const res = await fetch(`/api/eps/approvals?${params}`);
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
      enqueueSnackbar('Ошибка при получении списка заявок на согласование', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, activeScopeTab, search, statusFilter, typeFilter, equipmentFilter, enqueueSnackbar]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleProcessReview = async (decision: ApprovalReviewDecision, targetItem?: ApprovalTableItem | null) => {
    const item = targetItem || selectedApprovalForReview;
    if (!item) return;

    if (decision === 'REJECTED' && !resolutionComment.trim()) {
      enqueueSnackbar('Для отклонения заявки обязательно укажите причину в комментарии', { variant: 'warning' });
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/eps/approvals/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision,
          resolutionComment: resolutionComment.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const feedback = APPROVAL_REVIEW_FEEDBACK[decision];
        enqueueSnackbar(feedback.message, { variant: feedback.variant });
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

  const handleRequestSort = (field: ApprovalSortField) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  const sortedItems = useMemo(() => {
    return sortApprovals(items as any, sortField, sortDirection) as ApprovalTableItem[];
  }, [items, sortField, sortDirection]);

  const scopeTabs = useMemo(() => {
    const tabs = [
      {
        value: 'all',
        label: 'Все заявки',
        icon: <FactCheckOutlinedIcon sx={{ fontSize: 18 }} />,
        badge: stats.total,
      },
    ];

    if (canReview) {
      tabs.push({
        value: 'to_review',
        label: 'На рассмотрении (Входящие)',
        icon: <PendingActionsOutlinedIcon sx={{ fontSize: 18 }} />,
        badge: stats.toReview,
      });
    }

    tabs.push({
      value: 'my_requests',
      label: 'Мои поданные заявки',
      icon: <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />,
      badge: stats.myPending,
    });

    if (stats.myRejected > 0) {
      tabs.push({
        value: 'my_rejected',
        label: 'Отклоненные (Требуют внимания)',
        icon: <CancelOutlinedIcon sx={{ fontSize: 18 }} />,
        badge: stats.myRejected,
      });
    }

    return tabs;
  }, [canReview, stats]);

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0);

  if (!canAccessApprovals) {
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
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи недостаточно прав для просмотра реестра согласований EPS."
        />
      </Box>
    );
  }

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
        actions={
          canCreate ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
              sx={{ fontWeight: 700 }}
            >
              Создать заявку
            </Button>
          ) : undefined
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ожидают решения"
            value={stats.pending}
            subtitle="Требуют рассмотрения"
            icon={<PendingActionsOutlinedIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="warning.main"
            accentColor="warning.main"
            loading={loading}
            active={statusFilter === 'PENDING'}
            onClick={() => {
              setStatusFilter(statusFilter === 'PENDING' ? '' : 'PENDING');
              setPage(0);
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Утверждено"
            value={stats.approved}
            subtitle="Согласованные изменения"
            icon={<AssignmentTurnedInOutlinedIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="success.main"
            accentColor="success.main"
            loading={loading}
            active={statusFilter === 'APPROVED'}
            onClick={() => {
              setStatusFilter(statusFilter === 'APPROVED' ? '' : 'APPROVED');
              setPage(0);
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Отклонено"
            value={stats.rejected}
            subtitle="Отправлены на доработку"
            icon={<CancelOutlinedIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="error.main"
            accentColor="error.main"
            loading={loading}
            active={statusFilter === 'REJECTED'}
            onClick={() => {
              setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED');
              setPage(0);
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Отозвано"
            value={stats.cancelled}
            subtitle="Аннулировано автором"
            icon={<RemoveCircleOutlineIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(100, 116, 139, 0.08)"
            iconColor="text.secondary"
            accentColor="grey.600"
            loading={loading}
            active={statusFilter === 'CANCELLED'}
            onClick={() => {
              setStatusFilter(statusFilter === 'CANCELLED' ? '' : 'CANCELLED');
              setPage(0);
            }}
          />
        </Grid>
      </Grid>

      <DataTableWrapper
        tabs={
          <NavTabsContainer
            tabs={scopeTabs}
            value={activeScopeTab}
            onChange={(val) => {
              setActiveScopeTab(val as string);
              setPage(0);
            }}
          />
        }
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={() => {
              setSearch('');
              setStatusFilter('');
              setTypeFilter('');
              setEquipmentFilter('');
              setPage(0);
            }}
          >
            <Box sx={{ minWidth: 260 }}>
              <SearchInput
                placeholder="Поиск по теме, оборудованию, инициатору..."
                value={search}
                onSearch={(v: string) => {
                  setSearch(v);
                  setPage(0);
                }}
              />
            </Box>
            <TextField
              select
              size="small"
              label="Тип заявки"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="">Все типы</MenuItem>
              {Object.entries(APPROVAL_TYPE_MAP).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {typeof v === 'string' ? v : (v as any).label}
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
                setPage(0);
              }}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">Все статусы</MenuItem>
              {Object.entries(APPROVAL_STATUS_MAP).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {typeof v === 'string' ? v : (v as any).label}
                </MenuItem>
              ))}
            </TextField>
          </FilterToolbar>
        }
        total={total}
        page={page}
        pageSize={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        columns={APPROVAL_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        loading={loading}
        empty={items.length === 0 && !loading}
        emptyState={
          <EmptyState
            title="Заявок на согласование не найдено"
            description="По заданным критериям фильтрации записей не обнаружено."
            actionText={canCreate ? 'Создать заявку' : undefined}
            onAction={canCreate ? () => setCreateModalOpen(true) : undefined}
          />
        }
      >
        <ApprovalTableView
          items={sortedItems}
          visibleColumns={visibleColumns}
          sortField={sortField}
          sortDirection={sortDirection}
          currentUserId={user?.userId}
          canReview={canReview}
          onRequestSort={handleRequestSort}
          onSelectReview={(app) => {
            setSelectedApprovalForReview(app);
            setResolutionComment('');
            setReviewModalOpen(true);
          }}
          onSelectDetails={(app) => {
            setSelectedApprovalForDetails(app);
            setDetailsModalOpen(true);
          }}
          onRevoke={(app) => setRevokeApproval(app)}
        />
      </DataTableWrapper>

      <ApprovalWizardDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchApprovals}
      />

      <ApprovalReviewDialog
        open={reviewModalOpen}
        approval={selectedApprovalForReview}
        resolutionComment={resolutionComment}
        submitting={submittingReview}
        onClose={() => setReviewModalOpen(false)}
        onCommentChange={setResolutionComment}
        onProcessReview={handleProcessReview}
      />

      <ApprovalDetailsDialog
        open={detailsModalOpen}
        approval={selectedApprovalForDetails}
        onClose={() => setDetailsModalOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(revokeApproval)}
        title="Отозвать заявку на согласование?"
        message={
          revokeApproval
            ? `Вы уверены, что хотите отозвать заявку «${revokeApproval.title}»? Она будет переведена в статус «Отозвано» и не будет рассматриваться.`
            : ''
        }
        confirmText="Отозвать заявку"
        variant="danger"
        onClose={() => setRevokeApproval(null)}
        onConfirm={async () => {
          const itemToRevoke = revokeApproval;
          setRevokeApproval(null);
          await handleProcessReview('CANCELLED', itemToRevoke);
        }}
      />
    </Box>
  );
}

export default function ApprovalRegistryPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка журнала согласований..." />}>
      <ApprovalRegistryContent />
    </Suspense>
  );
}
