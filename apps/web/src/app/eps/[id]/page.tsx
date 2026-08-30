'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PageHeader from '@/components/layout/PageHeader';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  EQUIPMENT_STATUS_MAP,
  PERMISSIONS,
} from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import {
  ConfirmDialog,
  PageLoading,
  NavTabsContainer,
  type LifecycleEvent,
} from '@/components/ui';
import { CreateServiceRequestDialog } from '@/components/srm';
import { EquipmentPassportOverview } from '@/components/eps/EquipmentPassportOverview';
import { EquipmentDocumentsTab } from '@/components/eps/EquipmentDocumentsTab';
import { EquipmentApprovalsTab } from '@/components/eps/EquipmentApprovalsTab';
import { EquipmentOperationalTabs } from '@/components/eps/EquipmentOperationalTabs';
import type { EquipmentAuditLog } from '@/components/eps/EquipmentAuditHistoryTab';
import { EquipmentEditDialog } from '@/components/eps/EquipmentEditDialog';
import { EquipmentPassportAuxiliaryDialogs } from '@/components/eps/EquipmentPassportAuxiliaryDialogs';
import { buildEquipmentLifecycleEvents } from '@/components/eps/equipment-lifecycle-events';
import {
  computeEquipmentHealthScore,
  loadEquipmentAndMeta,
  loadAuditLogs,
  buildApprovalProposedData,
  submitApprovalRequest,
  saveEquipmentEdit,
  deleteEquipmentById,
  deleteEquipmentDocument,
  uploadEquipmentDocument,
  submitEquipmentForApproval,
} from '@/components/eps/equipment-passport-actions';

export interface CustomFieldDef {
  id: string;
  sectionId: string | null;
  key: string;
  name: string;
  fieldType: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  unit: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options?: string[];
}

export interface CustomSectionDef {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldDef[];
}

export interface EquipmentDetails {
  id: string;
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: string;
  commissionDate: string | null;
  customFields: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { displayName: string; ldapLogin: string };
  tags: { tag: { id: string; name: string; color: string | null } }[];
  photos: { id: string; fileName: string; originalName: string; filePath: string; isPrimary: boolean; createdAt: string }[];
  documents: {
    id: string;
    fileName: string;
    originalName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    docType: string;
    version: number;
    description: string | null;
    createdAt: string;
    uploadedBy: { displayName: string };
  }[];
  spareParts: {
    nomenclature: {
      id: string;
      name: string;
      article: string | null;
      unit: string;
      stockItems: { quantity: string; warehouse: { name: string } }[];
    };
  }[];
  maintenancePlans: {
    id: string;
    name: string;
    frequency: string;
    schedules: { id: string; title: string; scheduledDate: string; status: string }[];
  }[];
  jiraIssues?: {
    id: string;
    issueKey: string;
    summary: string;
    status: string;
    priority: string;
    createdDate: string;
    resolvedDate: string | null;
  }[];
  approvals?: {
    id: string;
    type: string;
    status: string;
    title: string;
    description: string | null;
    proposedData: unknown;
    createdAt: string;
    reviewedAt: string | null;
    resolutionComment: string | null;
    requester: { displayName: string; ldapLogin: string };
    reviewer: { displayName: string; ldapLogin: string } | null;
  }[];
}

export interface EquipmentEditFormState {
  name?: string;
  inventoryNumber?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  status?: string;
  commissionDate?: string;
}

function EquipmentPassportContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');

  const TAB_KEY_MAP: Record<string, number> = useMemo(() => ({
    overview: 0,
    specs: 1,
    photos: 2,
    docs: 3,
    'spare-parts': 4,
    mro: 5,
    srm: 6,
    history: 7,
  }), []);

  const TAB_INDEX_MAP = useMemo(() => ['overview', 'specs', 'photos', 'docs', 'spare-parts', 'mro', 'srm', 'history'], []);

  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [sections, setSections] = useState<CustomSectionDef[]>([]);
  const [unassignedFields, setUnassignedFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam && TAB_KEY_MAP[tabParam] !== undefined) {
      return TAB_KEY_MAP[tabParam];
    }
    return 0;
  });

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EquipmentEditFormState>({});
  const [editCustomFields, setEditCustomFields] = useState<Record<string, unknown>>({});

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<EquipmentAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Approval Modal State
  const [createApprovalModalOpen, setCreateApprovalModalOpen] = useState(false);
  const [createApprovalType, setCreateApprovalType] = useState('DECOMMISSIONING');
  const [createApprovalTitle, setCreateApprovalTitle] = useState('');
  const [createApprovalDescription, setCreateApprovalDescription] = useState('');
  const [createApprovalTargetStatus, setCreateApprovalTargetStatus] = useState('UNDER_REPAIR');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('SCHEMA');
  const [docDescription, setDocDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // SRM Incident Dialog State
  const [openCreateSrmModal, setOpenCreateSrmModal] = useState(false);

  // Confirm State
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const fetchEquipmentAndMeta = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadEquipmentAndMeta(id);
      if (result.equipment) setEquipment(result.equipment);
      if (result.editForm) setEditForm(result.editForm);
      if (result.editCustomFields) setEditCustomFields(result.editCustomFields);
      if (result.sections) setSections(result.sections);
      if (result.unassignedFields) setUnassignedFields(result.unassignedFields);
    } catch {
      enqueueSnackbar('Ошибка загрузки паспорта оборудования', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => {
    fetchEquipmentAndMeta();
  }, [fetchEquipmentAndMeta]);

  const fetchAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const logs = await loadAuditLogs(id);
      if (logs) setAuditLogs(logs);
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  }, [id]);

  const handleTabChange = (newValue: number) => {
    setActiveTab(newValue);
    const key = TAB_INDEX_MAP[newValue] || 'overview';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', key);
      router.replace(`/eps/${id}?${params.toString()}`);
    }
    if (newValue === 6) {
      fetchAudit();
    }
  };

  // Submit new approval request from passport page
  const handleCreateApproval = async () => {
    if (!createApprovalTitle.trim()) {
      enqueueSnackbar('Укажите тему заявки', { variant: 'warning' });
      return;
    }
    setSubmittingApproval(true);
    try {
      const proposedData = buildApprovalProposedData(createApprovalType, createApprovalTargetStatus);
      const result = await submitApprovalRequest({
        equipmentId: id,
        type: createApprovalType,
        title: createApprovalTitle,
        description: createApprovalDescription,
        proposedData,
      });
      if (result.success) {
        enqueueSnackbar('Заявка на согласование создана', { variant: 'success' });
        setCreateApprovalModalOpen(false);
        setCreateApprovalTitle('');
        setCreateApprovalDescription('');
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar(result.error || 'Ошибка создания заявки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при создании заявки', { variant: 'error' });
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Edit Submit
  const handleSaveEdit = async (submitForApproval = false) => {
    try {
      const result = await saveEquipmentEdit({ id, editForm, editCustomFields, submitForApproval });
      if (result.success) {
        if (submitForApproval) {
          enqueueSnackbar('Изменения паспорта отправлены на согласование', { variant: 'success' });
        } else {
          enqueueSnackbar('Паспорт оборудования сохранен', { variant: 'success' });
        }
        setEditModalOpen(false);
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar(result.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка отправки данных', { variant: 'error' });
    }
  };

  // Delete Equipment
  const handleDeleteEquipment = () => {
    setConfirmState({
      open: true,
      title: 'Удаление оборудования',
      message: 'Вы действительно хотите удалить эту единицу оборудования из системы?',
      onConfirm: async () => {
        try {
          const result = await deleteEquipmentById(id);
          if (result.success) {
            enqueueSnackbar('Оборудование удалено', { variant: 'info' });
            router.push('/eps');
          } else {
            enqueueSnackbar(result.error || 'Ошибка удаления', { variant: 'error' });
          }
        } catch {
          enqueueSnackbar('Ошибка сети', { variant: 'error' });
        } finally {
          setConfirmState((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  // Upload Document
  const handleUploadDocument = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const result = await uploadEquipmentDocument({
        file: selectedFile,
        equipmentId: id,
        docType,
        description: docDescription,
      });
      if (result.success) {
        enqueueSnackbar('Документ успешно прикреплен', { variant: 'success' });
        setDocModalOpen(false);
        setSelectedFile(null);
        setDocDescription('');
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar(result.error || 'Ошибка загрузки документа', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при загрузке документа', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = (documentId: string) => {
    setConfirmState({
      open: true,
      title: 'Удаление документа',
      message: 'Удалить этот прикрепленный документ?',
      onConfirm: async () => {
        try {
          const result = await deleteEquipmentDocument(documentId);
          if (result.success) {
            enqueueSnackbar('Документ успешно удален', { variant: 'info' });
            fetchEquipmentAndMeta();
          } else {
            enqueueSnackbar(result.error || 'Ошибка удаления', { variant: 'error' });
          }
        } catch {
          enqueueSnackbar('Ошибка удаления', { variant: 'error' });
        } finally {
          setConfirmState((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const canEdit = hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT);
  const canDelete = hasPermission(PERMISSIONS.EPS_EQUIPMENT_DELETE);

  const healthScore = useMemo(() => computeEquipmentHealthScore(equipment), [equipment]);

  const lifecycleEvents = useMemo(
    () => (equipment ? buildEquipmentLifecycleEvents(equipment, auditLogs) : []),
    [equipment, auditLogs]
  );

  if (loading || !equipment) {
    return <PageLoading text="Загрузка электронного паспорта оборудования..." />;
  }

  // Copy helper with feedback
  const handleCopy = (text: string, label: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    enqueueSnackbar(`${label} скопирован в буфер: ${text}`, {
      variant: 'info',
      autoHideDuration: 2200,
    });
  };

  return (
    <Box sx={{ width: '100%', pb: 2 }}>
      {/* Official Print Header (Visible strictly when printing / PDF export) */}
      <Box
        className="print-only"
        sx={{
          display: 'none',
          '@media print': {
            display: 'block !important',
            mb: 2.5,
            pb: 1.5,
            borderBottom: '2px solid text.primary',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.02em', color: 'text.primary' }}>
              Электронный паспорт оборудования
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              Корпоративная система управления оборудованием и основными фондами (EMS Platform)
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
              Дата выгрузки паспорта:
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
              {new Date().toLocaleDateString('ru-RU')}
            </Typography>
          </Box>
        </Box>
      </Box>

      <PageHeader
        title={equipment.name}
        subtitle={`${equipment.manufacturer || ''} ${equipment.model || ''} • Инв. №: ${equipment.inventoryNumber || 'Б/Н'}`}
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: equipment.name },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
            {canEdit && (
              <Button
                variant="contained"
                onClick={() => setEditModalOpen(true)}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  px: 2.25,
                  boxSizing: 'border-box',
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
                startIcon={<EditIcon />}
              >
                Редактировать
              </Button>
            )}
            {canDelete && (
              <IconButton color="error" onClick={handleDeleteEquipment} title="Удалить оборудование">
                <DeleteOutlineIcon />
              </IconButton>
            )}
          </Box>
        }
        tabs={
          <NavTabsContainer
            value={activeTab}
            onChange={handleTabChange}
            tabs={[
              { label: 'Паспорт оборудования', value: 0 },
              { label: 'Документация и схемы', value: 1, badge: equipment.documents.length },
              { label: 'Согласования и заявки', value: 2, badge: equipment.approvals?.length || 0 },
              { label: 'Комплектующие и ЗИП', value: 3, badge: equipment.spareParts.length },
              { label: 'График ТОиР и ППР', value: 4, badge: equipment.maintenancePlans.length },
              { label: 'Журнал инцидентов и дефектов', value: 5, badge: equipment.jiraIssues?.length || 0 },
              { label: 'Жизненный цикл и аудит', value: 6 },
            ]}
          />
        }
      />

      {equipment.status === 'DRAFT' && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={async () => {
                const result = await submitEquipmentForApproval(id);
                if (result.success) {
                  enqueueSnackbar('Паспорт оборудования отправлен на согласование', { variant: 'success' });
                  fetchEquipmentAndMeta();
                } else {
                  enqueueSnackbar(result.error || 'Ошибка', { variant: 'error' });
                }
              }}
              sx={{ fontWeight: 700 }}
            >
              Отправить на согласование
            </Button>
          }
          sx={{ mb: 3, borderRadius: '8px' }}
        >
          <strong>Черновик паспорта:</strong> этот паспорт виден только вам. Чтобы он появился в общем реестре оборудования, отправьте его на согласование ответственным лицам.
        </Alert>
      )}

      <EquipmentPassportOverview
        activeTab={activeTab}
        equipment={equipment}
        sections={sections}
        unassignedFields={unassignedFields}
        healthScore={healthScore}
        onCopy={handleCopy}
      />

      <EquipmentDocumentsTab
        activeTab={activeTab}
        documents={equipment.documents}
        canUpload={hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD)}
        canDelete={canEdit}
        onUpload={() => setDocModalOpen(true)}
        onDelete={handleDeleteDoc}
      />

      <EquipmentApprovalsTab
        activeTab={activeTab}
        approvals={equipment.approvals}
        canCreate={hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT)}
        onCreate={() => setCreateApprovalModalOpen(true)}
      />

      <EquipmentOperationalTabs
        activeTab={activeTab}
        equipment={equipment}
        lifecycleEvents={lifecycleEvents}
        auditLogs={auditLogs}
        loadingAudit={loadingAudit}
        onCreateSrmRequest={() => setOpenCreateSrmModal(true)}
      />

      <EquipmentEditDialog
        open={editModalOpen}
        equipment={equipment}
        sections={sections}
        unassignedFields={unassignedFields}
        editForm={editForm}
        editCustomFields={editCustomFields}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveEdit}
        onFormChange={setEditForm}
        onCustomFieldChange={(key, value) => setEditCustomFields((previous) => ({ ...previous, [key]: value }))}
      />

      <EquipmentPassportAuxiliaryDialogs
        equipment={equipment}
        documentDialogOpen={docModalOpen}
        selectedFile={selectedFile}
        documentType={docType}
        documentDescription={docDescription}
        uploading={uploading}
        onCloseDocumentDialog={() => setDocModalOpen(false)}
        onSelectedFileChange={setSelectedFile}
        onDocumentTypeChange={setDocType}
        onDocumentDescriptionChange={setDocDescription}
        onUploadDocument={handleUploadDocument}
        approvalDialogOpen={createApprovalModalOpen}
        approvalType={createApprovalType}
        approvalTitle={createApprovalTitle}
        approvalDescription={createApprovalDescription}
        approvalTargetStatus={createApprovalTargetStatus}
        submittingApproval={submittingApproval}
        onCloseApprovalDialog={() => setCreateApprovalModalOpen(false)}
        onApprovalTypeChange={setCreateApprovalType}
        onApprovalTitleChange={setCreateApprovalTitle}
        onApprovalDescriptionChange={setCreateApprovalDescription}
        onApprovalTargetStatusChange={setCreateApprovalTargetStatus}
        onCreateApproval={handleCreateApproval}
        previewDocumentUrl={previewDocUrl}
        onClosePreview={() => setPreviewDocUrl(null)}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant="danger"
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />

      {/* Диалог создания инцидента SRM */}
      <CreateServiceRequestDialog
        open={openCreateSrmModal}
        onClose={() => setOpenCreateSrmModal(false)}
        initialEquipmentId={equipment.id}
        onSuccess={() => fetchEquipmentAndMeta()}
      />
    </Box>
  );
}

export default function EquipmentPassportPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка паспорта оборудования..." />}>
      <EquipmentPassportContent />
    </Suspense>
  );
}
