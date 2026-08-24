'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Divider,
  Paper,
  InputAdornment,
  Switch,
  FormControlLabel,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BuildIcon from '@mui/icons-material/Build';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldIcon from '@mui/icons-material/Shield';
import StraightenIcon from '@mui/icons-material/Straighten';
import SpeedIcon from '@mui/icons-material/Speed';
import CategoryIcon from '@mui/icons-material/Category';
import EngineeringIcon from '@mui/icons-material/Engineering';
import TuneIcon from '@mui/icons-material/Tune';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
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
  StatCard,
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
  FileUploadDropzone,
  DatePickerField,
  type LifecycleEvent,
} from '@/components/ui';
import { CreateServiceRequestDialog } from '@/components/srm';

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
  Category: <CategoryIcon color="primary" />,
  Speed: <SpeedIcon color="error" />,
  Shield: <ShieldIcon color="success" />,
  Engineering: <EngineeringIcon color="warning" />,
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="info" />,
  Straighten: <StraightenIcon color="secondary" />,
  Tune: <TuneIcon color="primary" />,
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
  const custom = equipment.customFields || {};
  const actualWear =
    custom.actual_wear_percentage !== undefined &&
    custom.actual_wear_percentage !== null &&
    custom.actual_wear_percentage !== ''
      ? Number(custom.actual_wear_percentage)
      : null;
  const criticality = custom.criticality || 'B';
  const okofCode = custom.okof_code || '';
  const okpd2Code = custom.okpd2_code || '';
  const procCode = custom.process_classifier_code || '';
  const eqGroup = custom.equipment_group || '';
  const eqType = custom.equipment_type || '';
  const maintPeriodicity = custom.maintenance_periodicity || '';
  const maintScheduleYear = custom.maintenance_schedule_year || '';
  const maintCount = custom.maintenance_count || '';
  const respPerson = custom.responsible_person_name || '';
  const extSysId = custom.external_system_id || '';
  const isCriticalPath = Boolean(custom.is_critical_path);
  const calibrationInt = custom.calibration_interval;
  const cleanRoom = custom.clean_room_class;
  const isUnique = custom.is_unique;
  const isImported = custom.is_imported;

  // Copy helper with feedback
  const handleCopy = (text: string, label: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    enqueueSnackbar(`${label} скопирован в буфер: ${text}`, {
      variant: 'info',
      autoHideDuration: 2200,
    });
  };

  const renderCustomFieldValue = (f: CustomFieldDef, val: any) => {
    if (val === undefined || val === null || val === '') {
      return <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>;
    }

    if (f.fieldType === 'BOOLEAN' || typeof val === 'boolean') {
      const boolVal = Boolean(val);
      let label = boolVal ? 'Да' : 'Нет';
      if (f.key.includes('import')) label = boolVal ? 'Да (Импорт)' : 'Нет (Отечественное)';
      else if (f.key.includes('unique')) label = boolVal ? 'Да (Уникальное)' : 'Нет (Серийное)';
      else if (f.key.includes('critical_path')) label = boolVal ? 'Да (Критический путь)' : 'Нет';

      return (
        <StatusBadge
          status={boolVal ? (f.key.includes('critical_path') ? 'ERROR' : 'SUCCESS') : 'DEFAULT'}
          label={label}
          size="small"
        />
      );
    }

    if (f.key === 'criticality' || f.key === 'kategoriya_kritichnosti') {
      const sVal = String(val);
      const isA = sVal === 'A' || sVal.includes('Высокая') || sVal.includes('А');
      const isB = sVal === 'B' || sVal.includes('Средняя') || sVal.includes('В');
      return (
        <StatusBadge
          status={isA ? 'ERROR' : isB ? 'WARNING' : 'INFO'}
          label={sVal.startsWith('Категория') ? sVal : `Категория ${sVal}`}
          size="small"
        />
      );
    }

    if (f.key === 'actual_wear_percentage' || f.key === 'fakticheskiy_protsent_iznosa' || (f.unit === '%' && !isNaN(Number(val)))) {
      const num = Number(val);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, maxWidth: 260 }}>
          <Typography variant="body2" fontWeight={700} sx={{ minWidth: 38 }}>
            {num}%
          </Typography>
          <Box sx={{ flexGrow: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, num))}
              color={num > 70 ? 'error' : num > 30 ? 'warning' : 'success'}
              sx={{ height: 7, borderRadius: 4 }}
            />
          </Box>
        </Box>
      );
    }

    if (f.key.includes('code') || f.key.includes('number') || f.key.includes('kod') || f.key.includes('nomer')) {
      return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Paper
            variant="outlined"
            sx={{
              px: 1,
              py: 0.2,
              fontFamily: 'monospace',
              fontWeight: 700,
              bgcolor: 'background.default',
              fontSize: '0.8125rem',
              borderRadius: '5px',
              color: 'text.primary',
              borderColor: 'grey.400',
              lineHeight: 1.4,
            }}
          >
            {String(val)}
          </Paper>
          <Tooltip title={`Скопировать ${f.name}`}>
            <IconButton
              size="small"
              sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
              onClick={() => handleCopy(String(val), f.name)}
            >
              <ContentCopyIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <Typography variant="body2" fontWeight={600}>
          {String(val)}
        </Typography>
        {f.unit && (
          <Chip
            label={f.unit}
            size="small"
            variant="outlined"
            sx={{ height: 19, fontSize: '0.65rem', fontWeight: 700 }}
          />
        )}
      </Box>
    );
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
            borderBottom: '2px solid #0f172a',
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

      {/* Top Overview KPI Panel (4x StatCards) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Статус актива"
            value={statusInfo.label}
            subtitle={equipment.location ? `Локация: ${equipment.location}` : `Ввод: ${formatDate(equipment.commissionDate)}`}
            icon={<PrecisionManufacturingIcon sx={{ fontSize: 24 }} />}
            accentColor="#0284c7"
            iconColor="#0284c7"
            iconBgColor="#e0f2fe"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Физический износ"
            value={actualWear !== null ? `${actualWear}%` : '—'}
            subtitle={
              actualWear !== null
                ? actualWear < 30
                  ? 'Состояние в норме'
                  : actualWear < 70
                  ? 'Умеренный износ'
                  : 'Критический износ'
                : 'Амортизация не задана'
            }
            icon={<SpeedIcon sx={{ fontSize: 24 }} />}
            accentColor={
              actualWear !== null && actualWear > 70
                ? '#ef4444'
                : actualWear !== null && actualWear > 30
                ? '#f59e0b'
                : '#10b981'
            }
            iconColor={
              actualWear !== null && actualWear > 70
                ? '#ef4444'
                : actualWear !== null && actualWear > 30
                ? '#f59e0b'
                : '#10b981'
            }
            iconBgColor={
              actualWear !== null && actualWear > 70
                ? 'error.light'
                : actualWear !== null && actualWear > 30
                ? 'warning.light'
                : 'success.light'
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Регламент ТОиР"
            value={maintPeriodicity || (equipment.maintenancePlans.length > 0 ? `${equipment.maintenancePlans.length} плана ТО` : 'По регламенту')}
            subtitle={maintScheduleYear ? `График: ${maintScheduleYear}` : 'График ППР 2026'}
            icon={<ShieldIcon sx={{ fontSize: 24 }} />}
            accentColor="#10b981"
            iconColor="#10b981"
            iconBgColor="#dcfce7"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Критичность актива"
            value={`Класс ${criticality}`}
            subtitle={equipment.spareParts.length > 0 ? `Запас ТМЦ: ${equipment.spareParts.length} поз.` : 'Категория надежности'}
            icon={<CategoryIcon sx={{ fontSize: 24 }} />}
            accentColor={criticality === 'A' ? '#ef4444' : criticality === 'B' ? '#f59e0b' : '#0ea5e9'}
            iconColor={criticality === 'A' ? '#ef4444' : criticality === 'B' ? '#f59e0b' : '#0ea5e9'}
            iconBgColor={criticality === 'A' ? 'error.light' : criticality === 'B' ? 'warning.light' : '#e0f2fe'}
          />
        </Grid>
      </Grid>

      {/* TAB 0: Паспорт (Сбалансированная инженерная сетка 5/7) */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* LEFT COLUMN (5/12): Идентификация, Размещение, Метрология, Надежность */}
          <Grid item xs={12} lg={5}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Card 1: Основные реквизиты и размещение */}
              <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <PrecisionManufacturingIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Основные реквизиты и размещение
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />

                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, width: '42%', color: 'text.secondary', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            Наименование
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            {equipment.name}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            Инвентарный номер
                          </TableCell>
                          <TableCell sx={{ py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            {equipment.inventoryNumber ? (
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    px: 1,
                                    py: 0.2,
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    bgcolor: 'background.default',
                                    fontSize: '0.8125rem',
                                    borderRadius: '5px',
                                    color: 'text.primary',
                                    borderColor: 'grey.400',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {equipment.inventoryNumber}
                                </Paper>
                                <Tooltip title="Скопировать инвентарный номер">
                                  <IconButton
                                    size="small"
                                    sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
                                    onClick={() => handleCopy(equipment.inventoryNumber || '', 'Инвентарный номер')}
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            Заводской / Серийный №
                          </TableCell>
                          <TableCell sx={{ py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            {equipment.serialNumber ? (
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    px: 1,
                                    py: 0.2,
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    bgcolor: 'background.default',
                                    fontSize: '0.8125rem',
                                    borderRadius: '5px',
                                    color: 'text.primary',
                                    borderColor: 'grey.400',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {equipment.serialNumber}
                                </Paper>
                                <Tooltip title="Скопировать серийный номер">
                                  <IconButton
                                    size="small"
                                    sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
                                    onClick={() => handleCopy(equipment.serialNumber || '', 'Серийный номер')}
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            Производитель (Бренд)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            {equipment.manufacturer || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            Модель / Модификация
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            {equipment.model || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            Место установки (Локация)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            {equipment.location || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            Ответственное лицо (МОЛ)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            {respPerson || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            Дата ввода в эксплуатацию
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                            {equipment.commissionDate ? formatDate(equipment.commissionDate) : <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: equipment.tags.length > 0 ? '1px solid #f1f5f9' : 0 }}>
                            Паспорт зарегистрировал
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: equipment.tags.length > 0 ? '1px solid #f1f5f9' : 0 }}>
                            {equipment.createdBy?.displayName} ({formatDate(equipment.createdAt)})
                          </TableCell>
                        </TableRow>
                        {equipment.tags.length > 0 && (
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: 0 }}>
                              Теги классификации
                            </TableCell>
                            <TableCell sx={{ py: 1, borderBottom: 0 }}>
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
                                      height: 22,
                                    }}
                                  />
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Card 2: Индекс технического состояния */}
              <HealthScoreGauge
                score={healthScore}
                size="sm"
                title="Индекс технического состояния"
                subtitle="Комплексная надежность и готовность актива"
                metrics={[
                  { label: 'Планы ТО', value: equipment.maintenancePlans.length, status: equipment.maintenancePlans.length > 0 ? 'good' : 'warning' },
                  { label: 'Инциденты', value: (equipment.jiraIssues || []).length, status: (equipment.jiraIssues || []).length > 0 ? 'critical' : 'good' },
                  { label: 'Запас ТМЦ', value: equipment.spareParts.length, status: 'good' },
                ]}
              />
            </Box>
          </Grid>

          {/* RIGHT COLUMN (7/12): Все технические разделы и характеристики */}
          <Grid item xs={12} lg={7}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Dynamic Custom Sections from Database */}
              {sections.map((sec) => (
                <Card key={sec.id} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      {SECTION_ICONS[sec.icon || 'Category'] || <CategoryIcon color="primary" />}
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
                    <Divider sx={{ mb: 1.5 }} />

                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {sec.fields.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} sx={{ py: 1.5, color: 'text.secondary', textAlign: 'center' }}>
                                В данном разделе пока нет настроенных характеристик
                              </TableCell>
                            </TableRow>
                          ) : (
                            sec.fields.map((f, fIdx) => {
                              const val = equipment.customFields?.[f.key];
                              const isLast = fIdx === sec.fields.length - 1;
                              return (
                                <TableRow key={f.key}>
                                  <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '42%', py: 1, borderBottom: isLast ? 0 : '1px solid #f1f5f9' }}>
                                    {f.name}
                                  </TableCell>
                                  <TableCell sx={{ py: 1, borderBottom: isLast ? 0 : '1px solid #f1f5f9' }}>
                                    {renderCustomFieldValue(f, val)}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}

              {/* Unassigned Custom Fields if any */}
              {unassignedFields.length > 0 && (
                <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <TuneIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Дополнительные параметры
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 1.5 }} />

                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {unassignedFields.map((f, uIdx) => {
                            const val = equipment.customFields?.[f.key];
                            const isLast = uIdx === unassignedFields.length - 1;
                            return (
                              <TableRow key={f.key}>
                                <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '42%', py: 1, borderBottom: isLast ? 0 : '1px solid #f1f5f9' }}>
                                  {f.name}
                                </TableCell>
                                <TableCell sx={{ py: 1, borderBottom: isLast ? 0 : '1px solid #f1f5f9' }}>
                                  {renderCustomFieldValue(f, val)}
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

      {/* TAB 1: Документация */}
      {activeTab === 1 && (
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
                        <StatusBadge
                          status={doc.docType}
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

      {/* TAB 2: Согласования */}
      {activeTab === 2 && (
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

      {/* TAB 3: Комплектующие и ЗИП */}
      {activeTab === 3 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Комплектующие, запасные части и ЗИП
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Номенклатурные позиции склада WMS, привязанные к обслуживанию и ремонту данной единицы оборудования
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {equipment.spareParts.length === 0 ? (
            <EmptyState
              title="Нет привязанных комплектующих и ЗИП"
              description="В номенклатурном справочнике склада еще нет позиций, сопоставленных с данным типом оборудования."
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

      {/* TAB 4: График ТОиР и ППР */}
      {activeTab === 4 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            График регламентного обслуживания и ППР (ТОиР)
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Планы периодического ТО, графики ППР и перечень технологических операций
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {equipment.maintenancePlans.length === 0 ? (
            <EmptyState
              title="Планы регламентного ТО не назначены"
              description="Для данного оборудования еще не сформированы регламентные карты и графики периодического обслуживания."
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

      {/* TAB 5: Журнал инцидентов и дефектов */}
      {activeTab === 5 && (
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 0.25 }}>
                Журнал инцидентов, дефектов и заявок на ремонт (SRM)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                История обращений, сервисных инцидентов и заявок на восстановление работоспособности
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              size="small"
              onClick={() => setOpenCreateSrmModal(true)}
              sx={{ fontWeight: 700, borderRadius: '8px' }}
            >
              Зафиксировать отказ / Заявка SRM
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {(!equipment.jiraIssues || equipment.jiraIssues.length === 0) ? (
            <EmptyState
              title="Зарегистрированных инцидентов и дефектов нет"
              description="В журнале сервисных заявок нет зарегистрированных инцидентов по данному оборудованию."
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
                    <TableCell sx={{ fontWeight: 600 }} align="right">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.jiraIssues.map((issue) => (
                    <TableRow key={issue.id} hover>
                      <TableCell>
                        <StatusBadge status="OPEN" label={issue.issueKey} variant="outlined" />
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
                      <TableCell align="right">
                        <Box sx={{ display: 'inline-flex', gap: 0.75 }}>
                          <Tooltip title="Создать наряд ТОиР в модуле MRO">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                const params = new URLSearchParams();
                                params.set('createSchedule', 'true');
                                params.set('equipmentId', equipment.id);
                                params.set('title', `Ремонт по инциденту ${issue.issueKey}: ${issue.summary}`);
                                params.set('notes', `Создано из журнала инцидентов SRM. Статус: ${issue.status}, приоритет: ${issue.priority}`);
                                router.push(`/mro?${params.toString()}`);
                              }}
                            >
                              <BuildCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Открыть в реестре SRM">
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/srm?tab=issues`)}
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      {/* TAB 6: История изменений (Жизненный цикл и Аудит) */}
      {activeTab === 6 && (
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
                                backgroundColor: 'background.default',
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
        actions={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Button
              variant="text"
              onClick={() => setEditModalOpen(false)}
              sx={{ color: 'text.secondary', fontWeight: 600 }}
            >
              Отмена
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => handleSaveEdit(false)}
                disabled={!editForm.name}
                sx={{ borderRadius: '8px', fontWeight: 600 }}
              >
                Сохранить в черновик
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleSaveEdit(true)}
                disabled={!editForm.name}
                sx={{ borderRadius: '8px', fontWeight: 700 }}
              >
                Отправить на согласование
              </Button>
            </Box>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Section 1: Basic specifications */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 2 }}>
              Основные параметры
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Наименование оборудования"
                  fullWidth
                  size="small"
                  required
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
                <DatePickerField
                  label="Дата ввода в эксплуатацию"
                  value={editForm.commissionDate ? editForm.commissionDate.substring(0, 10) : ''}
                  onChange={(val) => setEditForm({ ...editForm, commissionDate: val })}
                  size="small"
                  fullWidth
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
                <FormControl fullWidth size="small">
                  <InputLabel id="edit-status-label">Статус оборудования</InputLabel>
                  <Select
                    labelId="edit-status-label"
                    label="Статус оборудования"
                    value={editForm.status || 'ACTIVE'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    {Object.entries(EQUIPMENT_STATUS_MAP).map(([k]) => (
                      <MenuItem key={k} value={k}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusBadge status={k} />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Section 2: Custom Sections Inputs */}
          {sections.map((sec) => (
            <Box key={sec.id}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 2 }}>
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
