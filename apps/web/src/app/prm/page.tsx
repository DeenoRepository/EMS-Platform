'use client';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { Box, Grid, TextField, MenuItem, Button } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
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
  ErrorState,
  ConfirmDialog,
  NavTabsContainer,
  ExportButton,
} from '@/components/ui';
import {
  PrmRequestWizardDialog,
  PrmDeliveryDialog,
  PrmRequestTableView,
  PrmRequestReviewDialog,
  PrmRequestDetailsDialog,
  type PrmRequestTableItem,
  type PrmReviewDecision,
} from '@/components/prm';

type DeepLinkDetailBody = {
  success?: boolean;
  data?: PrmRequestTableItem;
  error?: string;
} | null;

type DeepLinkDetailPayload = {
  ok: boolean;
  status: number;
  body: DeepLinkDetailBody;
};

/**
 * In-flight registry for deep-link detail requests, keyed by request ID.
 *
 * React 18 Strict Mode replays every effect as setup -> cleanup -> setup for
 * the same committed deep link. Sharing the still-pending promise collapses
 * that replay into exactly one network call. Only the *pending* promise is
 * shared: the entry is removed the moment the request settles, so neither the
 * response payload nor an authorization failure is ever cached. Navigating
 * away from a `requestId` and back therefore always issues a fresh request.
 */
const inFlightDeepLinkRequests = new Map<string, Promise<DeepLinkDetailPayload>>();

function requestDeepLinkedDetailsOnce(requestId: string): Promise<DeepLinkDetailPayload> {
  const pending = inFlightDeepLinkRequests.get(requestId);
  if (pending) return pending;

  const request = (async (): Promise<DeepLinkDetailPayload> => {
    const response = await fetch(`/api/prm/requests/${encodeURIComponent(requestId)}`);
    const body = (await response.json().catch(() => null)) as DeepLinkDetailBody;
    return { ok: response.ok, status: response.status, body };
  })();

  inFlightDeepLinkRequests.set(requestId, request);

  // Drop the entry as soon as the request settles — success or failure alike.
  // Attaching both handlers here also keeps a rejected shared promise handled.
  const forget = () => {
    if (inFlightDeepLinkRequests.get(requestId) === request) {
      inFlightDeepLinkRequests.delete(requestId);
    }
  };
  request.then(forget, forget);

  return request;
}

function PrmRegistryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [selectedForDelivery, setSelectedForDelivery] = useState<PrmRequestTableItem | null>(null);
  const [closeTarget, setCloseTarget] = useState<PrmRequestTableItem | null>(null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);

  const canView = hasPermission(PERMISSIONS.PRM_REQUESTS_VIEW) || hasPermission(PERMISSIONS.PRM_REQUESTS_CREATE) || hasPermission(PERMISSIONS.PRM_REQUESTS_MANAGE);
  const canCreate = hasPermission(PERMISSIONS.PRM_REQUESTS_CREATE);
  const canReview = hasPermission(PERMISSIONS.PRM_REQUESTS_MANAGE);
  const canClose = canReview || user?.userId === selectedForDetails?.targetWarehouse.responsibleUserId;

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

  // The deep link is identified by the `requestId` value alone. Keying the
  // loader on the raw string (instead of the `searchParams` object, whose
  // identity changes on every navigation) guarantees exactly one detail
  // request per stable ID, even when unrelated query parameters change.
  const deepLinkRequestId = searchParams.get('requestId');

  // Latest query string and router kept in refs so `clearDeepLink` stays
  // identity-stable across renders and can never re-trigger the loader effect
  // through its dependency list.
  const currentQueryRef = useRef('');
  currentQueryRef.current = searchParams.toString();
  const routerRef = useRef(router);
  routerRef.current = router;

  // Monotonic token: every load generation and every explicit close bumps it,
  // so a superseded (stale/raced) response can never write component state.
  const deepLinkTokenRef = useRef(0);

  const clearDeepLink = useCallback(() => {
    const params = new URLSearchParams(currentQueryRef.current);
    if (!params.has('requestId')) return;
    params.delete('requestId');
    const query = params.toString();
    routerRef.current.replace(query ? `/prm?${query}` : '/prm', { scroll: false });
  }, []);

  // Single exit point for the details view. Whatever closes or replaces it —
  // the ordinary close button or any action workflow — removes only the
  // `requestId` deep-link parameter, preserves every unrelated parameter, and
  // invalidates any in-flight detail request so the dialog cannot reopen.
  const closeDeepLinkedDetails = useCallback(() => {
    deepLinkTokenRef.current += 1;
    setSelectedForDetails(null);
    setDeepLinkLoading(false);
    setDeepLinkError(null);
    clearDeepLink();
  }, [clearDeepLink]);

  useEffect(() => {
    if (!deepLinkRequestId) return;

    const token = deepLinkTokenRef.current + 1;
    deepLinkTokenRef.current = token;
    const isCurrent = () => deepLinkTokenRef.current === token;

    setDeepLinkLoading(true);
    setDeepLinkError(null);

    const loadDeepLinkedRequest = async () => {
      try {
        // Strict Mode's second setup reuses the first setup's in-flight
        // request instead of issuing a duplicate one.
        const { ok, status, body } = await requestDeepLinkedDetailsOnce(deepLinkRequestId);
        if (!isCurrent()) return;

        if (ok && body?.success && body.data) {
          setSelectedForDetails(body.data);
          return;
        }

        const message = status === 401 || status === 403
          ? 'У вас нет доступа к этой заявке.'
          : status === 404
            ? 'Заявка не найдена или была удалена.'
            : body?.error || 'Не удалось открыть заявку.';
        setSelectedForDetails(null);
        setDeepLinkError(message);
        enqueueSnackbar(message, { variant: 'warning' });
        clearDeepLink();
      } catch {
        if (!isCurrent()) return;
        const message = 'Не удалось загрузить заявку из уведомления.';
        setSelectedForDetails(null);
        setDeepLinkError(message);
        enqueueSnackbar(message, { variant: 'error' });
        clearDeepLink();
      } finally {
        if (isCurrent()) setDeepLinkLoading(false);
      }
    };

    loadDeepLinkedRequest();
    return () => {
      // Invalidate this generation: a response arriving after the ID changed
      // or after unmount must not open stale data.
      deepLinkTokenRef.current += 1;
    };
  }, [clearDeepLink, enqueueSnackbar, deepLinkRequestId]);

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

  const handleCloseRequest = async (item: PrmRequestTableItem) => {
    try {
      const res = await fetch(`/api/prm/requests/${item.id}/close`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Заявка закрыта', { variant: 'success' });
        closeDeepLinkedDetails();
        fetchRequests();
      } else {
        enqueueSnackbar(json.error || 'Ошибка закрытия заявки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при закрытии заявки', { variant: 'error' });
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton
              formats={['csv']}
              label="Экспорт"
              onExport={() => {
                const params = new URLSearchParams();
                if (activeScopeTab === 'to_review') params.set('scope', 'to_review');
                if (activeScopeTab === 'my_requests') params.set('scope', 'my_requests');
                if (statusFilter) params.set('status', statusFilter);
                if (search) params.set('search', search);
                window.location.href = `/api/prm/requests/export?${params.toString()}`;
              }}
            />
            {canCreate && (
              <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setCreateModalOpen(true)} sx={{ fontWeight: 700 }}>
                Создать заявку
              </Button>
            )}
          </Box>
        }
      />

      {deepLinkLoading && <PageLoading text="Загрузка заявки из уведомления..." minHeight={180} />}
      {deepLinkError && !deepLinkLoading && (
        <ErrorState
          title="Не удалось открыть заявку"
          description={deepLinkError}
          minHeight={180}
        />
      )}

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
          canClose={(item) => canReview || user?.userId === item.targetWarehouse.responsibleUserId}
          onSelectDetails={(item) => setSelectedForDetails(item)}
          onSubmit={handleSubmitDraft}
          onReview={(item) => { setSelectedForReview(item); setResolutionComment(''); setReviewModalOpen(true); }}
          onCancel={(item) => setCancelTarget(item)}
          onCloseRequest={(item) => setCloseTarget(item)}
        />
      </DataTableWrapper>

      <PrmRequestWizardDialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={fetchRequests} />

      <PrmRequestDetailsDialog
        open={Boolean(selectedForDetails)}
        request={selectedForDetails}
        currentUserId={user?.userId}
        canReview={canReview}
        canClose={canClose}
        onCloseRequest={(item) => setCloseTarget(item)}
        onClose={closeDeepLinkedDetails}
        onReceive={(item) => {
          closeDeepLinkedDetails();
          setSelectedForDelivery(item);
        }}
        onSubmit={async (item) => {
          closeDeepLinkedDetails();
          await handleSubmitDraft(item);
        }}
        onReview={(item) => {
          closeDeepLinkedDetails();
          setSelectedForReview(item);
          setResolutionComment('');
          setReviewModalOpen(true);
        }}
        onCancel={(item) => {
          closeDeepLinkedDetails();
          setCancelTarget(item);
        }}
      />

      <PrmDeliveryDialog
        open={Boolean(selectedForDelivery)}
        request={selectedForDelivery}
        onClose={() => setSelectedForDelivery(null)}
        onSuccess={() => {
          setSelectedForDelivery(null);
          fetchRequests();
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

      <ConfirmDialog
        open={Boolean(closeTarget)}
        title="Закрыть поставленную заявку?"
        message={closeTarget ? `Заявка «${closeTarget.requestNumber}» будет переведена в статус «Закрыта». Повторное открытие и новые поставки не предусмотрены.` : ''}
        confirmText="Закрыть заявку"
        variant="success"
        onClose={() => setCloseTarget(null)}
        onConfirm={async () => {
          const target = closeTarget;
          setCloseTarget(null);
          if (target) await handleCloseRequest(target);
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
