'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Tabs,
  Tab,
  Grid,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Divider,
  Paper,
  InputAdornment,
  Switch,
  FormControlLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BuildIcon from '@mui/icons-material/Build';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldIcon from '@mui/icons-material/Shield';
import StraightenIcon from '@mui/icons-material/Straighten';
import SpeedIcon from '@mui/icons-material/Speed';
import TuneIcon from '@mui/icons-material/Tune';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/layout/PageHeader';
import { useParams, useRouter } from 'next/navigation';
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
  HealthScoreGauge,
  LifecycleTimeline,
  TrendSparkline,
  PageLoading,
  FormDialog,
  DataTableWrapper,
  NavTabsContainer,
  type LifecycleEvent,
} from '@/components/ui';

interface CustomFieldDef {
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

interface CustomSectionDef {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldDef[];
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="primary" />,
  Shield: <ShieldIcon color="success" />,
  Straighten: <StraightenIcon color="secondary" />,
  Speed: <SpeedIcon color="error" />,
};

interface EquipmentDetails {
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

export default function EquipmentPassportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [sections, setSections] = useState<CustomSectionDef[]>([]);
  const [unassignedFields, setUnassignedFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editCustomFields, setEditCustomFields] = useState<Record<string, any>>({});

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
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
  const [isPrimaryPhoto, setIsPrimaryPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // Status Quick Update
  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/eps/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Статус оборудования обновлен', { variant: 'success' });
        fetchEquipmentAndMeta();
      }
    } catch {
      enqueueSnackbar('Ошибка обновления статуса', { variant: 'error' });
    }
  };

  // Edit Submit
  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/eps/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          customFields: editCustomFields,
        }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Паспорт оборудования сохранен', { variant: 'success' });
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

  // Upload Photo
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('isPrimary', String(isPrimaryPhoto));

      const res = await fetch(`/api/eps/equipment/${id}/photos`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Фотография успешно добавлена', { variant: 'success' });
        setPhotoModalOpen(false);
        setSelectedFile(null);
        fetchEquipmentAndMeta();
      } else {
        enqueueSnackbar(data.error || 'Ошибка загрузки фото', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при загрузке фото', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Upload Document
  const handleUploadDocument = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('docType', docType);
      fd.append('description', docDescription);

      const res = await fetch(`/api/eps/equipment/${id}/documents`, {
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

  // Delete Photo
  const handleDeletePhoto = (photoId: string) => {
    setConfirmState({
      open: true,
      title: 'Удаление фотографии',
      message: 'Удалить эту фотографию оборудования?',
      onConfirm: async () => {
        try {
          await fetch(`/api/eps/equipment/${id}/photos?photoId=${photoId}`, { method: 'DELETE' });
          enqueueSnackbar('Фотография удалена', { variant: 'info' });
          fetchEquipmentAndMeta();
        } catch {
          enqueueSnackbar('Ошибка удаления', { variant: 'error' });
        } finally {
          setConfirmState((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  // Delete Document
  const handleDeleteDoc = (documentId: string) => {
    setConfirmState({
      open: true,
      title: 'Удаление документа',
      message: 'Удалить этот прикрепленный документ?',
      onConfirm: async () => {
        try {
          await fetch(`/api/eps/equipment/${id}/documents?documentId=${documentId}`, { method: 'DELETE' });
          enqueueSnackbar('Документ удален', { variant: 'info' });
          fetchEquipmentAndMeta();
        } catch {
          enqueueSnackbar('Ошибка удаления', { variant: 'error' });
        } finally {
          setConfirmState((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  if (loading || !equipment) {
    return <PageLoading text="Загрузка электронного паспорта оборудования..." />;
  }

  const statusInfo = EQUIPMENT_STATUS_MAP[equipment.status] || { label: equipment.status, color: 'default' };
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

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title={equipment.name}
        subtitle={`${equipment.manufacturer || ''} ${equipment.model || ''} • Инв. №: ${equipment.inventoryNumber || 'Б/Н'}`}
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: equipment.name },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/eps')}
            >
              К списку
            </Button>
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditModalOpen(true)}
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
      />

      {/* Top Overview & Reliability Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Текущий статус
                  </Typography>
                  <StatusBadge status={equipment.status} />
                </Box>

                {canEdit && (
                  <TextField
                    select
                    size="small"
                    label="Сменить статус"
                    value={equipment.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    sx={{ minWidth: 170 }}
                  >
                    {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                      <MenuItem key={key} value={key}>
                        {info.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Местоположение
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
                    {equipment.location || '—'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Заводской номер
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
                    {equipment.serialNumber || '—'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {equipment.tags.map(({ tag }) => (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    size="small"
                    variant="outlined"
                    sx={{
                      backgroundColor: tag.color ? `${tag.color}15` : undefined,
                      color: tag.color || 'inherit',
                      borderColor: tag.color || undefined,
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Quick Metrics Summary */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Дата ввода:</Typography>
                <Typography variant="body2" fontWeight={600}>{formatDate(equipment.commissionDate)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Прикреплено документов:</Typography>
                <Typography variant="body2" fontWeight={600}>{equipment.documents.length} файлов</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Регламентов ТО:</Typography>
                <Typography variant="body2" fontWeight={600}>{equipment.maintenancePlans.length} планов</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Установлено ТМЦ:</Typography>
                <Typography variant="body2" fontWeight={600}>{equipment.spareParts.length} позиций</Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <HealthScoreGauge
            score={healthScore}
            size="sm"
            title="Индекс технического состояния"
            subtitle="Надежность и готовность к работе"
            metrics={[
              { label: 'ТО', value: equipment.maintenancePlans.length, status: equipment.maintenancePlans.length > 0 ? 'good' : 'warning' },
              { label: 'Сбоев', value: (equipment.jiraIssues || []).length, status: (equipment.jiraIssues || []).length > 0 ? 'critical' : 'good' },
              { label: 'ТМЦ', value: equipment.spareParts.length, status: 'good' },
            ]}
          />
        </Grid>
      </Grid>

      {/* Navigation Tabs Bar */}
      <Box sx={{ mb: 3 }}>
        <NavTabsContainer
          value={activeTab}
          onChange={(val) => setActiveTab(val)}
          paper
          tabs={[
            { label: 'Паспорт (Общие сведения и разделы)', value: 0 },
            { label: 'Фотогалерея', value: 1, badge: equipment.photos.length },
            { label: 'Документация', value: 2, badge: equipment.documents.length },
            { label: 'Согласования', value: 3, badge: equipment.approvals?.length || 0 },
            { label: 'Запчасти WMS', value: 4, badge: equipment.spareParts.length },
            { label: 'ТО и Ремонт MRO', value: 5, badge: equipment.maintenancePlans.length },
            { label: 'Заявки Jira', value: 6, badge: equipment.jiraIssues?.length || 0 },
            { label: 'История изменений (Аудит)', value: 7 },
          ]}
        />
      </Box>

      {/* TAB 0: Паспорт (Общие сведения и кастомные разделы) */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Main Specifications Card */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <PrecisionManufacturingIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Основные технические реквизиты
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, width: '45%', color: 'text.secondary' }}>
                          Наименование
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{equipment.name}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Инвентарный номер</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{equipment.inventoryNumber || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Заводской / Серийный №</TableCell>
                        <TableCell>{equipment.serialNumber || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Производитель</TableCell>
                        <TableCell>{equipment.manufacturer || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Модель / Модификация</TableCell>
                        <TableCell>{equipment.model || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Дата ввода в эксплуатацию</TableCell>
                        <TableCell>{formatDate(equipment.commissionDate)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Место установки (Локация)</TableCell>
                        <TableCell>{equipment.location || '—'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Паспорт зарегистрировал</TableCell>
                        <TableCell>{equipment.createdBy?.displayName} ({formatDate(equipment.createdAt)})</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Custom Sections Cards */}
          <Grid item xs={12} lg={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {sections.map((sec) => (
                <Card key={sec.id}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      {SECTION_ICONS[sec.icon || 'Bolt'] || <TuneIcon color="primary" />}
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {sec.name}
                        </Typography>
                        {sec.description && (
                          <Typography variant="caption" color="text.secondary">
                            {sec.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {sec.fields.map((f) => {
                            const val = equipment.customFields?.[f.key];
                            const displayVal =
                              val === undefined || val === null || val === ''
                                ? '—'
                                : typeof val === 'boolean'
                                ? val
                                  ? 'Да'
                                  : 'Нет'
                                : String(val);

                            return (
                              <TableRow key={f.key}>
                                <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '50%' }}>
                                  {f.name}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>
                                  {displayVal}
                                  {val !== undefined && val !== null && val !== '' && f.unit && (
                                    <Chip
                                      label={f.unit}
                                      size="small"
                                      variant="outlined"
                                      sx={{ ml: 1, height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}

              {/* Unassigned Custom Fields if any */}
              {unassignedFields.length > 0 && (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <TuneIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Дополнительные параметры
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {unassignedFields.map((f) => {
                            const val = equipment.customFields?.[f.key];
                            const displayVal =
                              val === undefined || val === null || val === ''
                                ? '—'
                                : typeof val === 'boolean'
                                ? val
                                  ? 'Да'
                                  : 'Нет'
                                : String(val);

                            return (
                              <TableRow key={f.key}>
                                <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '50%' }}>
                                  {f.name}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>
                                  {displayVal} {f.unit && val ? f.unit : ''}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: Фотогалерея */}
      {activeTab === 1 && (
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Фотографии оборудования ({equipment.photos.length})
            </Typography>
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<AddPhotoAlternateIcon />}
                onClick={() => setPhotoModalOpen(true)}
              >
                Добавить фото
              </Button>
            )}
          </Box>

          {equipment.photos.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
              <AddPhotoAlternateIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">Фотографии отсутствуют</Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {equipment.photos.map((photo) => (
                <Grid item xs={12} sm={6} md={4} key={photo.id}>
                  <Card sx={{ position: 'relative', overflow: 'hidden' }}>
                    <Box
                      component="img"
                      src={`/api/files/${photo.filePath}`}
                      alt={photo.originalName}
                      sx={{
                        width: '100%',
                        height: 220,
                        objectFit: 'cover',
                        display: 'block',
                        cursor: 'pointer',
                      }}
                      onClick={() => setPreviewDocUrl(`/api/files/${photo.filePath}`)}
                    />
                    <Box
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" fontWeight={600} noWrap sx={{ display: 'block', maxWidth: 160 }}>
                          {photo.originalName}
                        </Typography>
                        {photo.isPrimary && (
                          <Chip
                            icon={<StarIcon fontSize="small" />}
                            label="Главное фото"
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                      {canEdit && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeletePhoto(photo.id)}
                          title="Удалить фото"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Card>
      )}

      {/* TAB 2: Документация */}
      {activeTab === 2 && (
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Документация и чертежи ({equipment.documents.length})
            </Typography>
            {hasPermission(PERMISSIONS.EPS_DOCUMENTS_UPLOAD) && (
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => setDocModalOpen(true)}
              >
                Прикрепить документ
              </Button>
            )}
          </Box>

          {equipment.documents.length === 0 ? (
            <EmptyState
              title="Документы не загружены"
              description="В паспорте оборудования пока нет прикрепленных руководств, чертежей и сертификатов."
              actionText={canEdit ? "Прикрепить документ" : undefined}
              onAction={canEdit ? () => setDocModalOpen(true) : undefined}
              minHeight={180}
            />
          ) : (
            <DataTableWrapper>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Имя файла</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Тип документа</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Описание</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Размер</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Загрузил</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Дата</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.documents.map((doc) => (
                    <TableRow key={doc.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {doc.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Версия {doc.version}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={DOCUMENT_TYPE_MAP[doc.docType] || doc.docType}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{doc.description || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{formatBytes(doc.fileSize)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{doc.uploadedBy?.displayName}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDate(doc.createdAt)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          component="a"
                          href={`/api/files/${doc.filePath}`}
                          target="_blank"
                          title="Просмотреть / Скачать"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteDoc(doc.id)}
                            title="Удалить"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableWrapper>
          )}
        </Card>
      )}

      {/* TAB 3: Согласования */}
      {activeTab === 3 && (
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Заявки на согласование ({equipment.approvals?.length || 0})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                История и статус заявок на ввод в эксплуатацию, списание и изменение характеристик
              </Typography>
            </Box>
            {hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT) && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateApprovalModalOpen(true)}
              >
                Создать заявку
              </Button>
            )}
          </Box>

          {(!equipment.approvals || equipment.approvals.length === 0) ? (
            <EmptyState
              title="Заявок на согласование нет"
              description="По данному оборудованию еще не зарегистрировано заявок на списание, вывод из эксплуатации или модернизацию."
              actionText={hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT) ? "Создать заявку" : undefined}
              onAction={hasPermission(PERMISSIONS.EPS_EQUIPMENT_EDIT) ? () => setCreateApprovalModalOpen(true) : undefined}
              minHeight={180}
            />
          ) : (
            <DataTableWrapper>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Тема заявки</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Тип согласования</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Инициатор</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Дата создания</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Решение / Согласующий</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.approvals.map((app) => {
                    const statusInfo = APPROVAL_STATUS_MAP[app.status] || { label: app.status, color: 'default' };
                    return (
                      <TableRow key={app.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {app.title}
                          </Typography>
                          {app.description && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {app.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={app.type}
                            label={APPROVAL_TYPE_MAP[app.type] || app.type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={app.status}
                            size="small"
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
                                {app.reviewer.displayName} ({formatDate(app.reviewedAt)})
                              </Typography>
                              {app.resolutionComment && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  «{app.resolutionComment}»
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              На рассмотрении
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableWrapper>
          )}
        </Card>
      )}

      {/* TAB 4: Запчасти (WMS) */}
      {activeTab === 4 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Совместимые запасные части и расходные материалы (WMS)
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Номенклатурные позиции склада, применяемые при ремонте и ТО этой единицы
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {equipment.spareParts.length === 0 ? (
            <EmptyState
              title="Нет привязанных запчастей"
              description="В номенклатурном справочнике WMS еще нет позиций, сопоставленных с данным типом оборудования."
              minHeight={180}
            />
          ) : (
            <DataTableWrapper>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Артикул</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Наименование номенклатуры</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ед. изм.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Остатки на складах</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.spareParts.map(({ nomenclature: nom }) => (
                    <TableRow key={nom.id} hover>
                      <TableCell>
                        <Chip label={nom.article || 'Б/А'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{nom.name}</TableCell>
                      <TableCell>{nom.unit}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {nom.stockItems.map((si, idx) => (
                            <StatusBadge
                              key={idx}
                              status={Number(si.quantity) > 0 ? 'NORMAL_STOCK' : 'OUT_OF_STOCK'}
                              label={`${si.warehouse.name}: ${si.quantity} ${nom.unit}`}
                              size="small"
                              variant="subtle"
                            />
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableWrapper>
          )}
        </Card>
      )}

      {/* TAB 5: ТО и Ремонт (MRO) */}
      {activeTab === 5 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Планы технического обслуживания и график ППР (MRO)
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {equipment.maintenancePlans.length === 0 ? (
            <EmptyState
              title="Планы ТО не назначены"
              description="Для данного оборудования еще не сформированы регламентные планы периодического обслуживания."
              minHeight={180}
            />
          ) : (
            equipment.maintenancePlans.map((plan) => (
              <Box key={plan.id} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                  {plan.name} ({plan.frequency})
                </Typography>
                <DataTableWrapper>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Задача</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Дата по графику</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {plan.schedules.map((sch) => {
                        return (
                          <TableRow key={sch.id}>
                            <TableCell sx={{ fontWeight: 500 }}>{sch.title}</TableCell>
                            <TableCell>{formatDate(sch.scheduledDate)}</TableCell>
                            <TableCell>
                              <StatusBadge status={sch.status} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </DataTableWrapper>
              </Box>
            ))
          )}
        </Card>
      )}

      {/* TAB 6: Заявки (SRM) */}
      {activeTab === 6 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Связанные заявки на ремонт и инциденты (SRM)
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Заявки, сопоставленные с данным оборудованием по инвентарному или серийному номеру
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {(!equipment.jiraIssues || equipment.jiraIssues.length === 0) ? (
            <EmptyState
              title="Связанных заявок не найдено"
              description="В системе SRM нет зарегистрированных обращений или инцидентов по данному оборудованию."
              minHeight={180}
            />
          ) : (
            <DataTableWrapper>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Ключ заявки</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Тема</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Приоритет</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Создана</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Решена</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.jiraIssues.map((issue) => (
                    <TableRow key={issue.id} hover>
                      <TableCell>
                        <Chip label={issue.issueKey} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{issue.summary}</TableCell>
                      <TableCell>
                        <StatusBadge status={issue.priority} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={issue.status} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDateTime(issue.createdDate)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDateTime(issue.resolvedDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableWrapper>
          )}
        </Card>
      )}

      {/* TAB 7: История изменений (Жизненный цикл и Аудит) */}
      {activeTab === 7 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Visual Lifecycle Timeline */}
          <LifecycleTimeline
            events={lifecycleEvents}
            title="Хронология полного жизненного цикла актива"
            loading={loadingAudit}
          />

          {/* Raw Audit Logs Table */}
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '1rem' }}>
              Системный журнал аудита изменений данных
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {loadingAudit ? (
              <PageLoading text="Загрузка журнала аудита изменений..." minHeight={180} />
            ) : auditLogs.length === 0 ? (
              <EmptyState
                title="Записей аудита не найдено"
                description="История изменений для данного оборудования еще не содержит записей."
                minHeight={180}
              />
            ) : (
              <DataTableWrapper>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 160 }}>Дата и время</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 180 }}>Пользователь</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 140 }}>Действие</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Детали изменений</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogs.map((log) => {
                      return (
                        <TableRow key={log.id} hover>
                          <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{formatDateTime(log.createdAt)}</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{log.user?.displayName || 'Система'}</TableCell>
                          <TableCell>
                            <StatusBadge status={log.action} />
                          </TableCell>
                          <TableCell>
                            <Box
                              component="pre"
                              sx={{
                                p: 1,
                                backgroundColor: '#f8fafc',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                m: 0,
                                maxHeight: 120,
                                overflow: 'auto',
                              }}
                            >
                              {JSON.stringify(log.changes, null, 2)}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </DataTableWrapper>
            )}
          </Card>
        </Box>
      )}

      {/* Edit Equipment Dialog with Custom Sections */}
      <FormDialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Редактирование паспорта оборудования"
        icon={<PrecisionManufacturingIcon color="primary" />}
        maxWidth="md"
        submitLabel="Сохранить изменения"
        onSubmit={handleSaveEdit}
        submitDisabled={!editForm.name}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Section 1: Basic specifications */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
              Основные параметры
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Наименование оборудования *"
                  fullWidth
                  size="small"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Инвентарный номер"
                  fullWidth
                  size="small"
                  value={editForm.inventoryNumber || ''}
                  onChange={(e) => setEditForm({ ...editForm, inventoryNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Заводской / Серийный номер"
                  fullWidth
                  size="small"
                  value={editForm.serialNumber || ''}
                  onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Производитель"
                  fullWidth
                  size="small"
                  value={editForm.manufacturer || ''}
                  onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Модель"
                  fullWidth
                  size="small"
                  value={editForm.model || ''}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Место установки (Локация)"
                  fullWidth
                  size="small"
                  value={editForm.location || ''}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Дата ввода в эксплуатацию"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                  value={editForm.commissioningDate ? editForm.commissioningDate.substring(0, 10) : ''}
                  onChange={(e) => setEditForm({ ...editForm, commissioningDate: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Критичность (A/B/C)"
                  select
                  fullWidth
                  size="small"
                  value={editForm.criticality || 'B'}
                  onChange={(e) => setEditForm({ ...editForm, criticality: e.target.value })}
                >
                  <MenuItem value="A">Класс A (Критическое)</MenuItem>
                  <MenuItem value="B">Класс B (Основное)</MenuItem>
                  <MenuItem value="C">Класс C (Вспомогательное)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Рабочий статус"
                  select
                  fullWidth
                  size="small"
                  value={editForm.status || 'OPERATIONAL'}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                    <MenuItem key={key} value={key}>
                      {info.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Section 2: Custom Sections Inputs */}
          {sections.map((sec) => (
            <Box key={sec.id}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
                {sec.name}
              </Typography>
              <Grid container spacing={2}>
                {sec.fields.map((f) => {
                  if (f.fieldType === 'BOOLEAN') {
                    return (
                      <Grid item xs={12} sm={6} key={f.key}>
                        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={Boolean(editCustomFields[f.key])}
                                onChange={(e) =>
                                  setEditCustomFields({ ...editCustomFields, [f.key]: e.target.checked })
                                }
                                color="primary"
                              />
                            }
                            label={<Typography variant="body2">{f.name}</Typography>}
                          />
                        </Paper>
                      </Grid>
                    );
                  }

                  if (f.fieldType === 'SELECT' && f.options && Array.isArray(f.options)) {
                    return (
                      <Grid item xs={12} sm={6} key={f.key}>
                        <TextField
                          select
                          label={f.name}
                          fullWidth
                          size="small"
                          value={editCustomFields[f.key] || ''}
                          onChange={(e) =>
                            setEditCustomFields({ ...editCustomFields, [f.key]: e.target.value })
                          }
                        >
                          <MenuItem value="">— Не выбрано —</MenuItem>
                          {f.options.map((opt: string) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    );
                  }

                  return (
                    <Grid item xs={12} sm={6} key={f.key}>
                      <TextField
                        label={f.name}
                        type={f.fieldType === 'NUMBER' ? 'number' : f.fieldType === 'DATE' ? 'date' : 'text'}
                        InputLabelProps={f.fieldType === 'DATE' ? { shrink: true } : undefined}
                        fullWidth
                        size="small"
                        value={editCustomFields[f.key] || ''}
                        onChange={(e) =>
                          setEditCustomFields({ ...editCustomFields, [f.key]: e.target.value })
                        }
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}
        </Box>
      </FormDialog>

      {/* Upload Photo Dialog */}
      <FormDialog
        open={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        title="Загрузка фотографии оборудования"
        maxWidth="xs"
        loading={uploading}
        submitLabel={uploading ? 'Загрузка...' : 'Загрузить фото'}
        onSubmit={handleUploadPhoto}
        submitDisabled={!selectedFile || uploading}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
            {selectedFile ? selectedFile.name : 'Выбрать фото с диска'}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </Button>
          <TextField
            select
            size="small"
            label="Сделать главным фото"
            value={isPrimaryPhoto ? 'true' : 'false'}
            onChange={(e) => setIsPrimaryPhoto(e.target.value === 'true')}
          >
            <MenuItem value="false">Нет</MenuItem>
            <MenuItem value="true">Да, сделать главным</MenuItem>
          </TextField>
        </Box>
      </FormDialog>

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
          <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
            {selectedFile ? selectedFile.name : 'Выбрать файл (PDF, DOCX, XLSX, Схемы)'}
            <input
              type="file"
              hidden
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </Button>

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
          <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: '#f8fafc' }}>
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
            label="Тип согласования *"
            value={createApprovalType}
            onChange={(e) => setCreateApprovalType(e.target.value)}
            fullWidth
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
              label="Целевой рабочий статус *"
              value={createApprovalTargetStatus}
              onChange={(e) => setCreateApprovalTargetStatus(e.target.value)}
              fullWidth
            >
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, info]) => (
                <MenuItem key={k} value={k}>
                  {info.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Тема заявки *"
            value={createApprovalTitle}
            onChange={(e) => setCreateApprovalTitle(e.target.value)}
            size="small"
            fullWidth
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
    </Box>
  );
}
