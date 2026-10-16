'use client';

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { Box, Card } from '@mui/material';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { PageLoading, EmptyState, ConfirmDialog, FormDialog } from '@/components/ui';
import { CreateServiceRequestDialog } from '@/components/srm';
import {
  useEquipmentPassport,
  PassportKpiBar,
  PassportHeaderSummary,
  PassportOverviewTab,
  PassportDocumentsTab,
  PassportApprovalsTab,
  PassportSparePartsTab,
  PassportMroTab,
  PassportSrmTab,
  PassportAuditTab,
  PassportEditDialog,
  PassportUploadDocDialog,
  PassportChangeRespDialog,
  PassportCreateApprovalDialog,
} from '@/components/eps/passport';

function EquipmentPassportContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const {
    equipment,
    sections,
    unassignedFields,
    loading,
    loadError,
    activeTab,
    auditLogs,
    loadingAudit,
    editModalOpen,
    editForm,
    editCustomFields,
    savingEdit,
    changeRespModalOpen,
    newRespName,
    savingResp,
    setEditModalOpen,
    setChangeRespModalOpen,
    setNewRespName,
    setNewRespUser,
    handleTabChange,
    handleFieldChange,
    handleSaveEdit,
    handleSaveResponsible,
    handleCopy,
    fetchEquipmentAndMeta,
    fetchAudit,
  } = useEquipmentPassport(id, searchParams?.get('tab'));

  // Modals & Dialogs States
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState('SCHEMA');
  const [docDescription, setDocDescription] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [applyToAllModel, setApplyToAllModel] = useState(false);
  const [applyToAllDecimal, setApplyToAllDecimal] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  // Approval Dialog
  const [createApprovalModalOpen, setCreateApprovalModalOpen] = useState(false);
  const [createApprovalType, setCreateApprovalType] = useState('DECOMMISSIONING');
  const [createApprovalTitle, setCreateApprovalTitle] = useState('');
  const [createApprovalDescription, setCreateApprovalDescription] = useState('');
  const [createApprovalTargetStatus, setCreateApprovalTargetStatus] = useState('UNDER_REPAIR');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // SRM Dialog
  const [openCreateSrmModal, setOpenCreateSrmModal] = useState(false);

  // Confirm State
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const canEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  const canDelete = hasPermission(PERMISSIONS.EPS_EQUIPMENT_DELETE);

  const statusInfo = useMemo(() => {
    if (!equipment) return { label: '', color: 'default' };
    return EQUIPMENT_STATUS_MAP[equipment.status] || { label: equipment.status, color: 'default' };
  }, [equipment]);

  const custom = equipment?.customFields || {};
  const actualWear =
    custom.actual_wear_percentage !== undefined &&
    custom.actual_wear_percentage !== null &&
    custom.actual_wear_percentage !== ''
      ? Number(custom.actual_wear_percentage)
      : null;
  const criticality = custom.criticality || 'B';
  const maintPeriodicity = custom.maintenance_periodicity || '';
  const maintScheduleYear = custom.maintenance_schedule_year || '';

  const lifecycleEvents = useMemo(() => {
    if (!equipment) return [];
    const evts: any[] = [];

    if (equipment.commissionDate) {
      evts.push({
        id: 'commissioning',
        type: 'COMMISSIONING',
        title: 'Ввод оборудования в эксплуатацию',
        date: equipment.commissionDate,
        author: equipment.createdBy?.displayName || 'Системный сервис',
        description: `Оборудование принято к учету и введено в эксплуатацию с инв. номером: ${equipment.inventoryNumber || 'Б/Н'}.`,
      });
    }

    (equipment.approvals || []).forEach((app) => {
      evts.push({
        id: `app-${app.id}`,
        type: app.status === 'APPROVED' ? 'STATUS_CHANGE' : 'APPROVAL',
        title: `Заявка на согласование: ${app.title}`,
        date: app.reviewedAt || app.createdAt,
        author: app.reviewer?.displayName || app.requester.displayName,
        description: `Статус: ${app.status}. ${app.resolutionComment || ''}`,
      });
    });

    (equipment.jiraIssues || []).forEach((issue) => {
      evts.push({
        id: `srm-${issue.id}`,
        type: 'INCIDENT',
        title: `Инцидент ServiceDesk: [${issue.issueKey}] ${issue.summary}`,
        date: issue.createdDate,
        author: 'ServiceDesk',
        description: `Приоритет: ${issue.priority}. Статус: ${issue.status}.`,
      });
    });

    (auditLogs || []).forEach((log) => {
      evts.push({
        id: `audit-${log.id}`,
        type: log.action === 'CREATE' ? 'COMMISSIONING' : 'AUDIT',
        title: `Аудит данных паспорта (${log.action})`,
        date: log.createdAt,
        author: log.user?.displayName || 'Системный сервис',
        description: 'Зафиксированы изменения в структуре паспорта или атрибутов оборудования.',
      });
    });

    return evts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [equipment, auditLogs]);

  // Delete Equipment Handler
  const handleDeleteEquipment = useCallback(() => {
    setConfirmState({
      open: true,
      title: 'Удаление паспорта оборудования',
      message: `Вы действительно хотите безвозвратно удалить паспорт оборудования «${equipment?.name}»? Связанные документы и история будут удалены.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/eps/equipment/${id}`, { method: 'DELETE' });
          if (res.ok) {
            enqueueSnackbar('Оборудование успешно удалено', { variant: 'success' });
            router.push('/eps');
          } else {
            const data = await res.json();
            enqueueSnackbar(data.error || 'Ошибка удаления', { variant: 'error' });
          }
        } catch {
          enqueueSnackbar('Ошибка сети при удалении', { variant: 'error' });
        }
      },
    });
  }, [id, equipment?.name, enqueueSnackbar, router]);

  // Upload Document Handler
  const handleUploadDocument = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setUploadingDoc(true);
    try {
      let successCount = 0;
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', docType);
        if (docDescription) formData.append('description', docDescription);
        if (applyToAllModel && equipment?.model) formData.append('model', equipment.model);

        const res = await fetch(`/api/eps/equipment/${id}/documents`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) successCount++;
      }

      if (successCount > 0) {
        enqueueSnackbar(`Прикреплено документов: ${successCount}`, { variant: 'success' });
        setDocModalOpen(false);
        setSelectedFiles([]);
        setDocDescription('');
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar('Ошибка при загрузке файлов', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при загрузке документа', { variant: 'error' });
    } finally {
      setUploadingDoc(false);
    }
  }, [id, selectedFiles, docType, docDescription, applyToAllModel, equipment?.model, enqueueSnackbar, fetchEquipmentAndMeta]);

  // Delete Document Handler
  const handleDeleteDocument = useCallback((doc: any) => {
    setConfirmState({
      open: true,
      title: 'Удаление документа',
      message: `Удалить документ «${doc.originalName}» из паспорта?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/eps/documents/${doc.id}`, { method: 'DELETE' });
          if (res.ok) {
            enqueueSnackbar('Документ удален', { variant: 'success' });
            fetchEquipmentAndMeta();
          } else {
            enqueueSnackbar('Ошибка при удалении документа', { variant: 'error' });
          }
        } catch {
          enqueueSnackbar('Ошибка сети при удалении документа', { variant: 'error' });
        }
      },
    });
  }, [enqueueSnackbar, fetchEquipmentAndMeta]);

  // Create Approval Handler
  const handleCreateApproval = useCallback(async () => {
    if (!createApprovalTitle.trim()) return;
    setSubmittingApproval(true);
    try {
      const payload: any = {
        equipmentId: id,
        type: createApprovalType,
        title: createApprovalTitle.trim(),
        description: createApprovalDescription.trim() || undefined,
      };

      if (createApprovalType === 'STATUS_CHANGE') {
        payload.proposedData = { targetStatus: createApprovalTargetStatus };
      }

      const res = await fetch('/api/eps/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        enqueueSnackbar('Заявка на согласование успешно создана', { variant: 'success' });
        setCreateApprovalModalOpen(false);
        setCreateApprovalTitle('');
        setCreateApprovalDescription('');
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar(data.error || 'Ошибка при создании заявки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при создании заявки', { variant: 'error' });
    } finally {
      setSubmittingApproval(false);
    }
  }, [id, createApprovalType, createApprovalTitle, createApprovalDescription, createApprovalTargetStatus, enqueueSnackbar, fetchEquipmentAndMeta]);

  if (loading) {
    return <PageLoading text="Загрузка электронного паспорта оборудования..." />;
  }

  if (loadError || !equipment) {
    return (
      <EmptyState
        title={loadError || 'Оборудование не найдено'}
        description="Проверьте адрес или повторите загрузку."
        actionText="Повторить"
        onAction={fetchEquipmentAndMeta}
      />
    );
  }

  return (
    <Box sx={{ width: '100%', pb: 3 }}>
      {/* 1. Header with Role & Action Controls */}
      <PassportHeaderSummary
        equipment={equipment}
        activeTab={activeTab}
        canEdit={canEdit}
        canDelete={canDelete}
        onTabChange={handleTabChange}
        onOpenEditModal={() => setEditModalOpen(true)}
        onDeleteEquipment={handleDeleteEquipment}
        onSubmitDraftForApproval={async () => {
          const res = await fetch(`/api/eps/equipment/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submitForApproval: true }),
          });
          if (res.ok) {
            enqueueSnackbar('Паспорт оборудования отправлен на согласование', { variant: 'success' });
            fetchEquipmentAndMeta();
          }
        }}
      />

      {/* 2. Top Overview KPI Cards */}
      <PassportKpiBar
        equipment={equipment}
        sections={sections}
        statusInfo={statusInfo}
        actualWear={actualWear}
        criticality={criticality}
        maintPeriodicity={maintPeriodicity}
        maintScheduleYear={maintScheduleYear}
      />

      {/* 3. Tab Contents */}
      {activeTab === 0 && (
        <PassportOverviewTab
          equipment={equipment}
          sections={sections}
          canEdit={canEdit}
          onOpenEditModal={() => setEditModalOpen(true)}
          onOpenChangeResp={() => {
            setNewRespName(custom.responsible_person_name || '');
            setNewRespUser(null);
            setChangeRespModalOpen(true);
          }}
          onCopy={handleCopy}
          onNavigateToSettings={() => router.push('/admin/module-settings')}
        />
      )}

      {activeTab === 1 && (
        <PassportDocumentsTab
          documents={equipment.documents}
          equipmentModel={equipment.model}
          canUpload={hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD)}
          canDelete={canDelete}
          onOpenUploadModal={() => setDocModalOpen(true)}
          onPreview={(url) => setPreviewDocUrl(url)}
          onDeleteDoc={handleDeleteDocument}
        />
      )}

      {activeTab === 2 && (
        <PassportApprovalsTab
          approvals={equipment.approvals || []}
          canEdit={canEdit}
          onCreateApproval={() => setCreateApprovalModalOpen(true)}
        />
      )}

      {activeTab === 3 && <PassportSparePartsTab spareParts={equipment.spareParts} />}

      {activeTab === 4 && <PassportMroTab maintenancePlans={equipment.maintenancePlans} />}

      {activeTab === 5 && (
        <PassportSrmTab
          equipmentId={equipment.id}
          jiraIssues={equipment.jiraIssues || []}
          onCreateSrm={() => setOpenCreateSrmModal(true)}
        />
      )}

      {activeTab === 6 && (
        <PassportAuditTab
          lifecycleEvents={lifecycleEvents}
          auditLogs={auditLogs}
          loadingAudit={loadingAudit}
        />
      )}

      {/* Dialogs */}
      <PassportEditDialog
        open={editModalOpen}
        sections={sections}
        unassignedFields={unassignedFields}
        editForm={editForm}
        editCustomFields={editCustomFields}
        saving={savingEdit}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveEdit}
        onFieldChange={handleFieldChange}
      />

      <PassportUploadDocDialog
        open={docModalOpen}
        equipmentModel={equipment.model}
        decimalNumber={custom.decimal_number || custom.detsimalnyy_nomer}
        selectedFiles={selectedFiles}
        docType={docType}
        docDescription={docDescription}
        applyToAllModel={applyToAllModel}
        applyToAllDecimal={applyToAllDecimal}
        uploading={uploadingDoc}
        onClose={() => {
          setDocModalOpen(false);
          setSelectedFiles([]);
        }}
        onFilesChange={setSelectedFiles}
        onDocTypeChange={setDocType}
        onDescriptionChange={setDocDescription}
        onApplyToAllModelChange={setApplyToAllModel}
        onApplyToAllDecimalChange={setApplyToAllDecimal}
        onSubmit={handleUploadDocument}
      />

      <PassportChangeRespDialog
        open={changeRespModalOpen}
        equipmentName={equipment.name}
        inventoryNumber={equipment.inventoryNumber}
        currentRespPerson={custom.responsible_person_name}
        newRespName={newRespName}
        saving={savingResp}
        onClose={() => setChangeRespModalOpen(false)}
        onNameChange={(name, userObj) => {
          setNewRespName(name);
          setNewRespUser(userObj);
        }}
        onSubmit={handleSaveResponsible}
      />

      <PassportCreateApprovalDialog
        open={createApprovalModalOpen}
        equipmentName={equipment.name}
        inventoryNumber={equipment.inventoryNumber}
        approvalType={createApprovalType}
        targetStatus={createApprovalTargetStatus}
        title={createApprovalTitle}
        description={createApprovalDescription}
        submitting={submittingApproval}
        onClose={() => setCreateApprovalModalOpen(false)}
        onTypeChange={setCreateApprovalType}
        onTargetStatusChange={setCreateApprovalTargetStatus}
        onTitleChange={setCreateApprovalTitle}
        onDescriptionChange={setCreateApprovalDescription}
        onSubmit={handleCreateApproval}
      />

      <CreateServiceRequestDialog
        open={openCreateSrmModal}
        onClose={() => setOpenCreateSrmModal(false)}
        initialEquipmentId={equipment.id}
        onSuccess={() => {
          setOpenCreateSrmModal(false);
          fetchEquipmentAndMeta();
        }}
      />

      {/* Lightbox / Preview */}
      <FormDialog
        open={Boolean(previewDocUrl)}
        onClose={() => setPreviewDocUrl(null)}
        title="Просмотр документа"
        maxWidth="md"
        hideActions
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'black', borderRadius: 1, overflow: 'hidden' }}>
          {previewDocUrl && (
            <Box
              component="img"
              src={previewDocUrl}
              alt="Preview"
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </Box>
      </FormDialog>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={async () => {
          await confirmState.onConfirm();
          setConfirmState((prev) => ({ ...prev, open: false }));
        }}
        onClose={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}

export default function EquipmentPassportPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка паспорта..." />}>
      <EquipmentPassportContent />
    </Suspense>
  );
}
