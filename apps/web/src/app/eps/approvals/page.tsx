'use client';

import React, { useState, Suspense, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { useRouter } from 'next/navigation';
import { APPROVAL_TYPE_MAP, APPROVAL_STATUS_MAP, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/layout/PageHeader';
import {
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  ConfirmDialog,
  PageLoading,
  FormDialog,
} from '@/components/ui';
import { ApprovalWizardDialog } from '@/components/eps';
import {
  ApprovalItem,
  APPROVALS_COLUMNS,
  useApprovalRegistry,
  ApprovalKpiBar,
  ApprovalRegistryTable,
} from '@/components/eps/approvals';

function EquipmentApprovalsContent() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const canAccessApprovals =
    Boolean(user?.roles?.includes('admin')) ||
    hasPermission(PERMISSIONS.EPS_APPROVALS_VIEW) ||
    hasPermission(PERMISSIONS.EPS_EQUIPMENT_VIEW);
  const canCreate = hasPermission(PERMISSIONS.EPS_APPROVALS_CREATE) || hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);
  const canApprove = hasPermission(PERMISSIONS.EPS_APPROVALS_MANAGE) || Boolean(user?.roles?.includes('admin'));

  const {
    items,
    total,
    page,
    pageSize,
    loading,
    search,
    statusFilter,
    typeFilter,
    stats,
    setPage,
    setPageSize,
    setSearch,
    setStatusFilter,
    setTypeFilter,
    fetchApprovals,
    handleKpiFilter,
    handleResetFilters,
  } = useApprovalRegistry(canAccessApprovals);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    APPROVALS_COLUMNS.map((c) => c.id)
  );

  // Dialogs States
  const [openWizard, setOpenWizard] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [resolutionComment, setResolutionComment] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const handleOpenReview = useCallback((item: ApprovalItem, action: 'APPROVED' | 'REJECTED') => {
    setSelectedApproval(item);
    setReviewAction(action);
    setResolutionComment('');
    setIsReviewDialogOpen(true);
  }, []);

  const handleProcessReview = useCallback(async () => {
    if (!selectedApproval) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/eps/approvals/${selectedApproval.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewAction,
          resolutionComment: resolutionComment.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(
          reviewAction === 'APPROVED' ? 'Заявка успешно утверждена' : 'Заявка отклонена',
          { variant: reviewAction === 'APPROVED' ? 'success' : 'info' }
        );
        setIsReviewDialogOpen(false);
        fetchApprovals();
      } else {
        enqueueSnackbar(json.error || 'Ошибка при вынесении решения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при отправке решения', { variant: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  }, [selectedApproval, reviewAction, resolutionComment, enqueueSnackbar, fetchApprovals]);

  if (!canAccessApprovals) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Очередь согласований оборудования"
          subtitle="Реестр заявок на ввод в эксплуатацию, изменение рабочих параметров и списание"
          breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Согласования' }]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет прав для просмотра очереди согласований."
          icon={<FactCheckOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  const activeFilterCount = (search ? 1 : 0) + (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0);

  return (
    <Box sx={{ pb: 3 }}>
      {/* 1. Header */}
      <PageHeader
        title="Очередь согласований оборудования"
        subtitle="Реестр заявок на ввод в эксплуатацию, смену статуса, перемещение и списание оборудования"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Согласования' }]}
        actions={
          canCreate ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setOpenWizard(true)}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                textTransform: 'none',
                px: 2,
              }}
            >
              Создать заявку
            </Button>
          ) : undefined
        }
      />

      {/* 2. Top KPI Cards */}
      <ApprovalKpiBar
        stats={stats}
        statusFilter={statusFilter}
        loading={loading}
        onKpiFilter={handleKpiFilter}
      />

      {/* 3. Table with Filters */}
      <DataTableWrapper
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        columns={APPROVALS_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        loading={loading}
        stickyHeader
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            actions={
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 160,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
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
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 160,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все типы операций</MenuItem>
                  {Object.entries(APPROVAL_TYPE_MAP).map(([key, label]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по теме, номеру оборудования..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <ApprovalRegistryTable
          items={items}
          visibleColumns={visibleColumns}
          canApprove={canApprove}
          loading={loading}
          currentUserId={user?.userId}
          onOpenReview={handleOpenReview}
          onViewDetails={(app) => {
            setSelectedApproval(app);
            setDetailsDialogOpen(true);
          }}
          onNavigateToEquipment={(eqId) => router.push(`/eps/${eqId}`)}
          onResetFilters={handleResetFilters}
          hasFilters={Boolean(search || statusFilter || typeFilter)}
          onOpenCreateWizard={() => setOpenWizard(true)}
        />
      </DataTableWrapper>

      {/* Review Dialog */}
      <FormDialog
        open={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        title={reviewAction === 'APPROVED' ? 'Утверждение заявки' : 'Отклонение заявки'}
        maxWidth="xs"
        loading={submittingReview}
        submitLabel={reviewAction === 'APPROVED' ? 'Одобрить' : 'Отклонить'}
        submitColor={reviewAction === 'APPROVED' ? 'primary' : 'error'}
        onSubmit={handleProcessReview}
      >
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {reviewAction === 'APPROVED'
              ? `Вы подтверждаете выполнение операции по заявке: «${selectedApproval?.title}»?`
              : `Укажите замечания или причину отклонения заявки «${selectedApproval?.title}»:`}
          </Typography>
          <TextField
            label={reviewAction === 'APPROVED' ? 'Комментарий (необязательно)' : 'Причина отклонения *'}
            value={resolutionComment}
            onChange={(e) => setResolutionComment(e.target.value)}
            multiline
            rows={3}
            fullWidth
            size="small"
            required={reviewAction === 'REJECTED'}
          />
        </Box>
      </FormDialog>

      {/* Details Dialog */}
      <FormDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        title={selectedApproval?.title || 'Карточка заявки'}
        maxWidth="sm"
        hideActions
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Описание:</Typography>
            <Typography variant="body2">{selectedApproval?.description || '—'}</Typography>
          </Box>
          {selectedApproval?.resolutionComment && (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">Резолюция рецензента:</Typography>
              <Typography variant="body2" fontWeight={600}>{selectedApproval.resolutionComment}</Typography>
            </Box>
          )}
        </Box>
      </FormDialog>

      {/* Create Wizard */}
      <ApprovalWizardDialog
        open={openWizard}
        onClose={() => setOpenWizard(false)}
        onSuccess={() => {
          setOpenWizard(false);
          fetchApprovals();
        }}
      />
    </Box>
  );
}

export default function EquipmentApprovalsPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка очереди согласований..." />}>
      <EquipmentApprovalsContent />
    </Suspense>
  );
}
