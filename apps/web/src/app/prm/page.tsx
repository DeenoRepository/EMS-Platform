'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { Box, Grid, TextField, MenuItem, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PageHeader from '@/components/layout/PageHeader';
import { PURCHASE_REQUEST_STATUS_MAP, PERMISSIONS } from '@ems/shared';
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
} from '@/components/ui';
import {
  PrmRequestWizardDialog,
  PrmRequestTableView,
  PrmRequestReviewDialog,
  PrmRequestDetailsDialog,
  type PrmRequestTableItem,
  type PrmReviewDecision,
} from '@/components/prm';

function PrmRegistryContent() {
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<PrmRequestTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [activeScopeTab, setActiveScopeTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    toReview: 0,
    myDraft: 0,
    myPending: 0,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedForReview, setSelectedForReview] = useState<PrmRequestTableItem | null>(null);
  const [resolutionComment, setResolutionComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PrmRequestTableItem | null>(null);
  const [selectedForDetails, setSelectedForDetails] = useState<PrmRequestTableItem | null>(null);

  const canView = hasPermission(PERMISSIONS.PRM_REQUESTS_VIEW) || hasPermission(PERMISSIONS.PRM_REQUESTS_CREATE) || hasPermission(PERMISSIONS.PRM_REQUESTS_MANAGE);
  const canCreate = hasPermission(PERMISSIONS.PRM_REQUESTS_CREATE);
  const canReview = hasPermission(PERMISSIONS.PRM_REQUESTS_MANAGE);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(rowsPerPage),
      });

      if (activeScopeTab === 'to_review') params.set('scope', 'to_review');
      else if (activeScopeTab === 'my_requests') params.set('scope', 'my_requests');

      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/prm/requests?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items || []);
          setTotal(json.data.total || 0);
          if (json.data.stats) setStats(json.data.stats);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при получении списка заявок на закупку', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, activeScopeTab, search, statusFilter, enqueueSnackbar]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmitDraft = async (item: PrmRequestTableItem) => {
    try {
      const res = await fetch(`/api/prm/requests/${item.id}/submit`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Заявка отправлена на согласование', { variant: 'success' });
        fetchRequests();
      } else {
        enqueueSnackbar(json.error || 'Ошибка отправки заявки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    }
  };

  const handleProcessReview = async (decision: PrmReviewDecision, targetItem?: PrmRequestTableItem | null) => {
    const item = targetItem || selectedForReview;
    if (!item) return;

    if (decision === 'REJECTED' && !resolutionComment.trim()) {
      enqueueSnackbar('Для отклонения заявки обязательно укажите причину', { variant: 'warning' });
      return;
    }

    const endpointByDecision: Record<PrmReviewDecision, string> = {
      APPROVED: 'approve',
      REJECTED: 'reject',
      CANCELLED: 'cancel',
    };

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/prm/requests/${item.id}/${endpointByDecision[decision]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionComment: resolutionComment.trim() || undefined }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const messages: Record<PrmReviewDecision, string> = {
          APPROVED: 'Заявка согласована',
          REJECTED: 'Заявка отклонена',
          CANCELLED: 'Заявка отменена',
        };
        enqueueSnackbar(messages[decision], { variant: decision === 'REJECTED' ? 'info' : 'success' });
        setReviewModalOpen(false);
        setSelectedForReview(null);
        setResolutionComment('');
        fetchRequests();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения решения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при обработке решения', { variant: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const scopeTabs = [
    { value: 'all', label: 'Все заявки', icon: <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />, badge: stats.total },
    ...(canReview
      ? [{ value: 'to_review', label: 'На рассмотрении', icon: <PendingActionsOutlinedIcon sx={{ fontSize: 18 }} />, badge: stats.toReview }]
      : []),
    { value: 'my_requests', label: 'Мои заявки', icon: <ShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />, badge: stats.myDraft + stats.myPending },
  ];

  const activeFilterCount = (search ? 1 : 0) + (statusFilter ? 1 : 0);

  if (!canView) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Заявки на закупку ТМЦ"
          subtitle="Подача и согласование заявок на закупку товарно-материальных ценностей"
          breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'PRM' }]}
        />
        <EmptyState title="Доступ ограничен" description="У вашей учетной записи недостаточно прав для просмотра реестра заявок на закупку." />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Заявки на закупку ТМЦ"
        subtitle="Подача и согласование заявок на закупку товарно-материальных ценностей"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'PRM' }]}
        actions={
          canCreate ? (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setCreateModalOpen(true)} sx={{ fontWeight: 700 }}>
              Создать заявку
            </Button>
          ) : undefined
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="На согласовании"
            value={stats.submitted}
            subtitle="Ожидают решения"
            icon={<PendingActionsOutlinedIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(217, 119, 6, 0.08)"
            iconColor="warning.main"
            accentColor="warning.main"
            loading={loading}
            active={statusFilter === 'SUBMITTED'}
            onClick={() => { setStatusFilter(statusFilter === 'SUBMITTED' ? '' : 'SUBMITTED'); setPage(0); }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Согласовано"
            value={stats.approved}
            subtitle="Одобренные заявки"
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(22, 163, 74, 0.08)"
            iconColor="success.main"
            accentColor="success.main"
            loading={loading}
            active={statusFilter === 'APPROVED'}
            onClick={() => { setStatusFilter(statusFilter === 'APPROVED' ? '' : 'APPROVED'); setPage(0); }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Отклонено"
            value={stats.rejected}
            subtitle="Требуют доработки"
            icon={<CancelOutlinedIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="error.main"
            accentColor="error.main"
            loading={loading}
            active={statusFilter === 'REJECTED'}
            onClick={() => { setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED'); setPage(0); }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Черновики"
            value={stats.draft}
            subtitle="Не отправлены"
            icon={<AssignmentOutlinedIcon sx={{ fontSize: 22 }} />}
            iconBgColor="rgba(100, 116, 139, 0.08)"
            iconColor="text.secondary"
            accentColor="grey.600"
            loading={loading}
            active={statusFilter === 'DRAFT'}
            onClick={() => { setStatusFilter(statusFilter === 'DRAFT' ? '' : 'DRAFT'); setPage(0); }}
          />
        </Grid>
      </Grid>

      <DataTableWrapper
        tabs={
          <NavTabsContainer
            tabs={scopeTabs}
            value={activeScopeTab}
            onChange={(val) => { setActiveScopeTab(val as string); setPage(0); }}
          />
        }
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={() => { setSearch(''); setStatusFilter(''); setPage(0); }}
          >
            <Box sx={{ minWidth: 260 }}>
              <SearchInput
                placeholder="Поиск по номеру, поставщику, ТМЦ..."
                value={search}
                onSearch={(v: string) => { setSearch(v); setPage(0); }}
              />
            </Box>
            <TextField
              select
              size="small"
              label="Статус"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="">Все статусы</MenuItem>
              {Object.entries(PURCHASE_REQUEST_STATUS_MAP).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
          </FilterToolbar>
        }
        total={total}
        page={page}
        pageSize={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        loading={loading}
        empty={items.length === 0 && !loading}
        emptyState={
          <EmptyState
            title="Заявок на закупку не найдено"
            description="По заданным критериям фильтрации записей не обнаружено."
            actionText={canCreate ? 'Создать заявку' : undefined}
            onAction={canCreate ? () => setCreateModalOpen(true) : undefined}
          />
        }
      >
        <PrmRequestTableView
          items={items}
          currentUserId={user?.userId}
          canReview={canReview}
          onSelectDetails={(item) => setSelectedForDetails(item)}
          onSubmit={handleSubmitDraft}
          onReview={(item) => { setSelectedForReview(item); setResolutionComment(''); setReviewModalOpen(true); }}
          onCancel={(item) => setCancelTarget(item)}
        />
      </DataTableWrapper>

      <PrmRequestWizardDialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={fetchRequests} />

      <PrmRequestDetailsDialog
        open={Boolean(selectedForDetails)}
        request={selectedForDetails}
        currentUserId={user?.userId}
        canReview={canReview}
        onClose={() => setSelectedForDetails(null)}
        onSubmit={async (item) => {
          setSelectedForDetails(null);
          await handleSubmitDraft(item);
        }}
        onReview={(item) => {
          setSelectedForDetails(null);
          setSelectedForReview(item);
          setResolutionComment('');
          setReviewModalOpen(true);
        }}
        onCancel={(item) => {
          setSelectedForDetails(null);
          setCancelTarget(item);
        }}
      />

      <PrmRequestReviewDialog
        open={reviewModalOpen}
        request={selectedForReview}
        resolutionComment={resolutionComment}
        submitting={submittingReview}
        onClose={() => setReviewModalOpen(false)}
        onCommentChange={setResolutionComment}
        onProcessReview={handleProcessReview}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Отменить заявку на закупку?"
        message={cancelTarget ? `Вы уверены, что хотите отменить заявку «${cancelTarget.requestNumber}»? Она будет переведена в статус «Отозвана».` : ''}
        confirmText="Отменить заявку"
        variant="danger"
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          const target = cancelTarget;
          setCancelTarget(null);
          if (target) await handleProcessReview('CANCELLED', target);
        }}
      />
    </Box>
  );
}

export default function PrmRegistryPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка реестра заявок на закупку..." />}>
      <PrmRegistryContent />
    </Suspense>
  );
}
