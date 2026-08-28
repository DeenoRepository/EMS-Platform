'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Grid,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Divider,
  Paper,
  Switch,
  FormControlLabel,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import AddIcon from '@mui/icons-material/Add';
import LaunchIcon from '@mui/icons-material/Launch';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PageHeader from '@/components/layout/PageHeader';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  EQUIPMENT_STATUS_MAP,
  DOCUMENT_TYPE_MAP,
  APPROVAL_TYPE_MAP,
  APPROVAL_STATUS_MAP,
  MAINTENANCE_STATUS_MAP,
  formatDate,
  formatDateTime,
  formatBytes,
  PERMISSIONS,
  AUDIT_ACTION_MAP,
} from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { useSnackbar } from 'notistack';
import {
  StatusBadge,
  EmptyState,
  ConfirmDialog,
  LifecycleTimeline,
  PageLoading,
  FormDialog,
  DataTableWrapper,
  NavTabsContainer,
  FileUploadDropzone,
  DatePickerField,
  type LifecycleEvent,
} from '@/components/ui';
import { CreateServiceRequestDialog } from '@/components/srm';
import { EquipmentPassportOverview } from '@/components/eps/EquipmentPassportOverview';
import { EquipmentDocumentsTab } from '@/components/eps/EquipmentDocumentsTab';
import { EquipmentApprovalsTab } from '@/components/eps/EquipmentApprovalsTab';
import { EquipmentOperationalTabs } from '@/components/eps/EquipmentOperationalTabs';
import { EquipmentEditDialog } from '@/components/eps/EquipmentEditDialog';

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
  customFields: Record<string, any> | null;
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
    proposedData: any | null;
    createdAt: string;
    reviewedAt: string | null;
    resolutionComment: string | null;
    requester: { displayName: string; ldapLogin: string };
    reviewer: { displayName: string; ldapLogin: string } | null;
  }[];
}

function EquipmentPassportContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');

  const TAB_KEY_MAP: Record<string, number> = {
    overview: 0,
    specs: 1,
    photos: 2,
    docs: 3,
    'spare-parts': 4,
    mro: 5,
    srm: 6,
    history: 7,
  };
  const TAB_INDEX_MAP = ['overview', 'specs', 'photos', 'docs', 'spare-parts', 'mro', 'srm', 'history'];

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
  const [editForm, setEditForm] = useState<any>({});
  const [editCustomFields, setEditCustomFields] = useState<Record<string, any>>({});

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
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
      const [eqRes, secRes] = await Promise.all([
        fetch(`/api/eps/equipment/${id}`),
        fetch('/api/eps/custom-sections'),
      ]);

      if (eqRes.ok) {
        const json = await eqRes.json();
        if (json.success && json.data) {
          setEquipment(json.data);
          setEditForm({
            name: json.data.name,
            inventoryNumber: json.data.inventoryNumber || '',
            serialNumber: json.data.serialNumber || '',
            manufacturer: json.data.manufacturer || '',
            model: json.data.model || '',
            location: json.data.location || '',
            status: json.data.status,
            commissionDate: json.data.commissionDate ? json.data.commissionDate.split('T')[0] : '',
          });
          setEditCustomFields(json.data.customFields || {});
        }
      }

      if (secRes.ok) {
        const secJson = await secRes.json();
        if (secJson.success && secJson.data) {
          setSections(secJson.data.sections || []);
          setUnassignedFields(secJson.data.unassignedFields || []);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки паспорта оборудования', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => {
    fetchEquipmentAndMeta();
  }, [fetchEquipmentAndMeta]);

  const fetchAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/eps/equipment/${id}/audit`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setAuditLogs(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const key = TAB_INDEX_MAP[newValue] || 'overview';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', key);
      router.replace(`/eps/${id}?${params.toString()}`);
    }
    if (newValue === 7) {
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
      let proposedData: any = null;
      if (createApprovalType === 'STATUS_CHANGE') {
        proposedData = { targetStatus: createApprovalTargetStatus };
      } else if (createApprovalType === 'DECOMMISSIONING') {
        proposedData = { targetStatus: 'DECOMMISSIONED' };
      } else if (createApprovalType === 'COMMISSIONING') {
        proposedData = { targetStatus: 'ACTIVE' };
      }

      const res = await fetch('/api/eps/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: id,
          type: createApprovalType,
          title: createApprovalTitle,
          description: createApprovalDescription,
          proposedData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Заявка на согласование создана', { variant: 'success' });
        setCreateApprovalModalOpen(false);
        setCreateApprovalTitle('');
        setCreateApprovalDescription('');
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания заявки', { variant: 'error' });
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
      const res = await fetch(`/api/eps/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          customFields: editCustomFields,
          submitForApproval,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (submitForApproval) {
          enqueueSnackbar('Изменения паспорта отправлены на согласование', { variant: 'success' });
        } else {
          enqueueSnackbar('Паспорт оборудования сохранен', { variant: 'success' });
        }
        setEditModalOpen(false);
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения', { variant: 'error' });
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
          const res = await fetch(`/api/eps/equipment/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            enqueueSnackbar('Оборудование удалено', { variant: 'info' });
            router.push('/eps');
          } else {
            enqueueSnackbar(data.error || 'Ошибка удаления', { variant: 'error' });
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
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('equipmentId', id);
      fd.append('docType', docType);
      fd.append('description', docDescription);

      const res = await fetch('/api/eps/documents', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Документ успешно прикреплен', { variant: 'success' });
        setDocModalOpen(false);
        setSelectedFile(null);
        setDocDescription('');
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar(data.error || 'Ошибка загрузки документа', { variant: 'error' });
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
          const res = await fetch(`/api/eps/documents/${documentId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            enqueueSnackbar('Документ успешно удален', { variant: 'info' });
            fetchEquipmentAndMeta();
          } else {
            enqueueSnackbar(data.error || 'Ошибка удаления', { variant: 'error' });
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

  const healthScore = useMemo(() => {
    if (!equipment) return 100;
    if (equipment.status === 'DECOMMISSIONED') return 10;
    if (equipment.status === 'UNDER_REPAIR') return 45;
    if (equipment.status === 'IN_STORAGE') return 75;
    const openIssues = (equipment.jiraIssues || []).filter((i: any) => i.status !== 'Closed' && i.status !== 'Resolved').length;
    const plansCount = (equipment.maintenancePlans || []).length;
    return Math.max(50, Math.min(100, 95 - openIssues * 10 + (plansCount > 0 ? 5 : 0)));
  }, [equipment]);

  const lifecycleEvents: LifecycleEvent[] = useMemo(() => {
    if (!equipment) return [];
    const evts: LifecycleEvent[] = [];

    // Commissioning event
    if (equipment.commissionDate) {
      evts.push({
        id: `commissioning-${equipment.id}`,
        type: 'COMMISSIONING',
        title: 'Ввод единицы оборудования в эксплуатацию',
        description: `Оборудование «${equipment.name}» (инв. № ${equipment.inventoryNumber || 'Б/Н'}) введено в эксплуатацию на площадке ${equipment.location || 'Основная'}.`,
        date: equipment.commissionDate,
        author: 'Главный механик',
      });
    }

    // Maintenance events
    (equipment.maintenancePlans || []).forEach((mp: any) => {
      evts.push({
        id: `mro-${mp.id}`,
        type: 'MAINTENANCE',
        title: `Регламент ТО: ${mp.title || 'Периодическое обслуживание'}`,
        description: `Периодичность: каждые ${mp.intervalDays || 30} дн. Статус регламента: ${mp.status || 'Активен'}.`,
        date: mp.nextDueDate || mp.createdAt,
        metadata: {
          'Интервал (дней)': mp.intervalDays || 30,
          'Статус регламента': mp.status || 'ACTIVE',
        },
      });
    });

    // Spare parts replacements
    (equipment.spareParts || []).forEach((sp: any) => {
      evts.push({
        id: `wms-${sp.id}`,
        type: 'PARTS_REPLACED',
        title: `Установка/списание комплектующих: ${sp.nomenclature?.name || 'ТМЦ'}`,
        description: `Количество: ${sp.quantity || 1} ${sp.nomenclature?.unit || 'шт.'}. Установлено в узел оборудования.`,
        date: sp.installedAt || sp.createdAt,
        metadata: {
          'Артикул ТМЦ': sp.nomenclature?.sku || '—',
          'Количество': `${sp.quantity || 1} ${sp.nomenclature?.unit || 'шт.'}`,
        },
      });
    });

    // Jira / SRM Incidents
    (equipment.jiraIssues || []).forEach((issue: any) => {
      evts.push({
        id: `srm-${issue.id}`,
        type: 'INCIDENT',
        title: `Инцидент ServiceDesk: [${issue.jiraKey}] ${issue.summary}`,
        description: `Приоритет: ${issue.priority}. Статус: ${issue.status}.`,
        date: issue.createdDate,
        author: issue.reporter,
        metadata: {
          'Ключ заявки': issue.jiraKey,
          'Приоритет': issue.priority,
          'Статус': issue.status,
        },
        link: {
          label: 'Открыть заявку в Jira',
          href: issue.jiraUrl || '#',
        },
      });
    });

    // Audit changes
    (auditLogs || []).forEach((log: any) => {
      evts.push({
        id: `audit-${log.id}`,
        type: log.action === 'CREATE' ? 'COMMISSIONING' : 'AUDIT',
        title: `Аудит: ${AUDIT_ACTION_MAP[log.action]?.label || log.action} данных паспорта`,
        date: log.createdAt,
        author: log.user?.displayName || 'Системный сервис',
        description: `Зафиксированы изменения в структуре паспорта или атрибутов оборудования.`,
      });
    });

    // Sort descending by date
    return evts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [equipment, auditLogs]);

  if (loading || !equipment) {
    return <PageLoading text="Загрузка электронного паспорта оборудования..." />;
  }

  const statusInfo = EQUIPMENT_STATUS_MAP[equipment.status] || { label: equipment.status, color: 'default' };

  // Extracted custom fields
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
                startIcon={<EditIcon />}
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
            onChange={(val) => {
              setActiveTab(val);
              if (val === 6) fetchAudit();
            }}
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
                const res = await fetch(`/api/eps/equipment/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ submitForApproval: true }),
                });
                const data = await res.json();
                if (data.success) {
                  enqueueSnackbar('Паспорт оборудования отправлен на согласование', { variant: 'success' });
                  fetchEquipmentAndMeta();
                } else {
                  enqueueSnackbar(data.error || 'Ошибка', { variant: 'error' });
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

      {/* Upload Document Dialog */}
      <FormDialog
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Прикрепление документа"
        maxWidth="xs"
        loading={uploading}
        submitLabel={uploading ? 'Прикрепление...' : 'Прикрепить документ'}
        onSubmit={handleUploadDocument}
        submitDisabled={!selectedFile || uploading}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FileUploadDropzone
            files={selectedFile ? [selectedFile] : []}
            onChange={(files) => setSelectedFile(files[0] || null)}
            compact
            title="Перетащите файл документа или выберите"
            description="PDF, DOCX, XLSX, чертежи (до 15 МБ)"
          />

          <TextField
            select
            size="small"
            label="Тип документа"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            {Object.entries(DOCUMENT_TYPE_MAP).map(([k, label]) => (
              <MenuItem key={k} value={k}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            label="Примечание / Описание"
            value={docDescription}
            onChange={(e) => setDocDescription(e.target.value)}
            multiline
            rows={2}
          />
        </Box>
      </FormDialog>

      {/* Create Approval Request Dialog */}
      <FormDialog
        open={createApprovalModalOpen}
        onClose={() => setCreateApprovalModalOpen(false)}
        title="Создание заявки на согласование"
        icon={<FactCheckOutlinedIcon color="primary" />}
        maxWidth="sm"
        loading={submittingApproval}
        submitLabel={submittingApproval ? 'Отправка...' : 'Подать заявку'}
        onSubmit={handleCreateApproval}
        submitDisabled={!createApprovalTitle.trim() || submittingApproval}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Оборудование:
            </Typography>
            <Typography variant="subtitle2" fontWeight={700}>
              {equipment.name} • Инв. №: {equipment.inventoryNumber || 'Б/Н'}
            </Typography>
          </Paper>

          <TextField
            select
            size="small"
            label="Тип согласования"
            value={createApprovalType}
            onChange={(e) => setCreateApprovalType(e.target.value)}
            fullWidth
            required
          >
            {Object.entries(APPROVAL_TYPE_MAP).map(([k, label]) => (
              <MenuItem key={k} value={k}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          {createApprovalType === 'STATUS_CHANGE' && (
            <TextField
              select
              size="small"
              label="Целевой рабочий статус"
              value={createApprovalTargetStatus}
              onChange={(e) => setCreateApprovalTargetStatus(e.target.value)}
              fullWidth
              required
            >
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, info]) => (
                <MenuItem key={k} value={k}>
                  {info.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Тема заявки"
            value={createApprovalTitle}
            onChange={(e) => setCreateApprovalTitle(e.target.value)}
            size="small"
            fullWidth
            required
            placeholder="Например: Согласование акта списания в связи с износом"
          />

          <TextField
            label="Обоснование / Описание"
            value={createApprovalDescription}
            onChange={(e) => setCreateApprovalDescription(e.target.value)}
            multiline
            rows={3}
            size="small"
            fullWidth
            placeholder="Укажите подробную причину, номер служебной записки или дефектной ведомости..."
          />
        </Box>
      </FormDialog>

      {/* Image Lightbox Preview Modal */}
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
