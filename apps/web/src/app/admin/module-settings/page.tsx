'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Switch,
  CircularProgress,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldIcon from '@mui/icons-material/Shield';
import StraightenIcon from '@mui/icons-material/Straighten';
import SpeedIcon from '@mui/icons-material/Speed';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import {
  StatCard,
  DataTableWrapper,
  EmptyState,
  ConfirmDialog,
  PageLoading,
  FormDialog,
  StatusBadge,
} from '@/components/ui';

interface CustomFieldItem {
  id: string;
  sectionId: string | null;
  key: string;
  name: string;
  fieldType: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  unit: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options: string[] | null;
  sortOrder: number;
}

interface CustomSectionItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldItem[];
}

interface TagItem {
  id: string;
  name: string;
  color: string;
  equipmentCount: number;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Текстовое поле',
  TEXTAREA: 'Многострочный текст',
  NUMBER: 'Числовое значение',
  DATE: 'Дата',
  SELECT: 'Выпадающий список',
  BOOLEAN: 'Флаг (Да/Нет)',
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="primary" />,
  Shield: <ShieldIcon color="success" />,
  Straighten: <StraightenIcon color="secondary" />,
  Speed: <SpeedIcon color="error" />,
};

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const PRESET_COLORS = ['#0284c7', '#0f766e', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#475569'];

const MODULE_KEYS = ['eps', 'wms', 'srm', 'mro'];

const MODULE_META: Record<string, { title: string; subtitle: string; breadcrumb: string; name: string }> = {
  eps: {
    title: 'Настройки модуля — Паспортизация (EPS)',
    subtitle: 'Управление техническими разделами, пользовательскими полями и классификаторами оборудования',
    breadcrumb: 'Паспортизация (EPS)',
    name: 'Паспортизация оборудования (EPS)',
  },
  wms: {
    title: 'Настройки модуля — Складской учёт (WMS)',
    subtitle: 'Управление параметрами складских остатков и номенклатуры',
    breadcrumb: 'Складской учёт (WMS)',
    name: 'Складской учёт (WMS)',
  },
  srm: {
    title: 'Настройки модуля — Система подачи заявок (SRM)',
    subtitle: 'Управление параметрами синхронизации инцидентов и внешних интеграций ServiceDesk',
    breadcrumb: 'Система подачи заявок (SRM)',
    name: 'Система подачи заявок (SRM)',
  },
  mro: {
    title: 'Настройки модуля — ТО и Ремонт (MRO)',
    subtitle: 'Управление технологическими картами, регламентами и графиками ППР',
    breadcrumb: 'ТО и Ремонт (MRO)',
    name: 'ТО и Ремонт (MRO)',
  },
};

function ModuleSettingsContent() {
  const { enqueueSnackbar } = useSnackbar();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const getInitialTab = () => {
    switch (tabParam) {
      case 'wms':
        return 1;
      case 'srm':
        return 2;
      case 'mro':
        return 3;
      default:
        return 0;
    }
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (tabParam === 'wms') setActiveTab(1);
    else if (tabParam === 'srm') setActiveTab(2);
    else if (tabParam === 'mro') setActiveTab(3);
    else if (tabParam === 'eps') setActiveTab(0);
  }, [tabParam]);

  // EPS Metadata State
  const [sections, setSections] = useState<CustomSectionItem[]>([]);
  const [unassignedFields, setUnassignedFields] = useState<CustomFieldItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loadingEps, setLoadingEps] = useState(true);

  // Section Modal State
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionEditingId, setSectionEditingId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionCode, setSectionCode] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');
  const [sectionIcon, setSectionIcon] = useState('Bolt');
  const [sectionSort, setSectionSort] = useState(0);
  const [savingSection, setSavingSection] = useState(false);

  // Field Modal State
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [fieldTargetSectionId, setFieldTargetSectionId] = useState<string>('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('TEXT');
  const [fieldUnit, setFieldUnit] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [optionsStr, setOptionsStr] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [savingField, setSavingField] = useState(false);

  // Tag Modal State
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#0284c7');
  const [savingTag, setSavingTag] = useState(false);

  // Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    loading?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const fetchEpsData = useCallback(async () => {
    setLoadingEps(true);
    try {
      const [sRes, tRes] = await Promise.all([
        fetch('/api/eps/custom-sections'),
        fetch('/api/eps/tags'),
      ]);
      if (sRes.ok && tRes.ok) {
        const [sJson, tJson] = await Promise.all([sRes.json(), tRes.json()]);
        if (sJson.success && sJson.data) {
          setSections(sJson.data.sections || []);
          setUnassignedFields(sJson.data.unassignedFields || []);
        }
        if (tJson.success) setTags(tJson.data);
      }
    } catch {
      enqueueSnackbar('Ошибка загрузки настроек EPS', { variant: 'error' });
    } finally {
      setLoadingEps(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchEpsData();
  }, [fetchEpsData]);

  // Open Create Section Modal
  const handleOpenCreateSection = () => {
    setSectionEditingId(null);
    setSectionName('');
    setSectionCode('');
    setSectionDesc('');
    setSectionIcon('Bolt');
    setSectionSort(sections.length + 1);
    setSectionDialogOpen(true);
  };

  // Open Edit Section Modal
  const handleOpenEditSection = (s: CustomSectionItem) => {
    setSectionEditingId(s.id);
    setSectionName(s.name);
    setSectionCode(s.code);
    setSectionDesc(s.description || '');
    setSectionIcon(s.icon || 'Bolt');
    setSectionSort(s.sortOrder);
    setSectionDialogOpen(true);
  };

  // Save Section (Create / Edit)
  const handleSaveSection = async () => {
    if (!sectionName.trim()) {
      enqueueSnackbar('Укажите название раздела', { variant: 'warning' });
      return;
    }
    setSavingSection(true);
    try {
      const method = sectionEditingId ? 'PATCH' : 'POST';
      const body = {
        id: sectionEditingId,
        name: sectionName.trim(),
        code: sectionCode.trim() || undefined,
        description: sectionDesc.trim() || null,
        icon: sectionIcon,
        sortOrder: Number(sectionSort) || 0,
      };

      const res = await fetch('/api/eps/custom-sections', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar(sectionEditingId ? 'Раздел обновлен' : 'Раздел создан', { variant: 'success' });
        setSectionDialogOpen(false);
        fetchEpsData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения раздела', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingSection(false);
    }
  };

  // Delete Section
  const handleDeleteSection = (s: CustomSectionItem) => {
    setDeleteConfirm({
      open: true,
      title: 'Удаление кастомного раздела',
      message: `Удалить кастомный раздел «${s.name}»? Привязанные поля будут сохранены как общие.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/eps/custom-sections?id=${s.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            enqueueSnackbar('Раздел удален', { variant: 'info' });
            setDeleteConfirm((prev) => ({ ...prev, open: false }));
            fetchEpsData();
          } else {
            enqueueSnackbar(data.error || 'Ошибка удаления', { variant: 'error' });
          }
        } catch {
          enqueueSnackbar('Ошибка сети', { variant: 'error' });
        }
      },
    });
  };

  // Open Create Field Modal
  const handleOpenCreateField = (sectionId?: string) => {
    setFieldTargetSectionId(sectionId || (sections[0]?.id || ''));
    setFieldKey('');
    setFieldName('');
    setFieldType('TEXT');
    setFieldUnit('');
    setIsRequired(false);
    setDefaultValue('');
    setOptionsStr('');
    setSortOrder(1);
    setFieldDialogOpen(true);
  };

  // Save Field
  const handleSaveField = async () => {
    if (!fieldKey.trim() || !fieldName.trim()) {
      enqueueSnackbar('Укажите ключ и название поля', { variant: 'warning' });
      return;
    }
    setSavingField(true);
    try {
      const options = fieldType === 'SELECT' ? optionsStr.split(',').map((o) => o.trim()).filter(Boolean) : undefined;
      const res = await fetch('/api/eps/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: fieldKey.trim(),
          name: fieldName.trim(),
          fieldType,
          unit: fieldUnit.trim() || null,
          sectionId: fieldTargetSectionId || null,
          isRequired,
          defaultValue: defaultValue.trim() || null,
          options,
          sortOrder: Number(sortOrder) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Кастомное поле сохранено', { variant: 'success' });
        setFieldDialogOpen(false);
        fetchEpsData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingField(false);
    }
  };

  // Delete Field
  const handleDeleteField = (f: CustomFieldItem) => {
    setDeleteConfirm({
      open: true,
      title: 'Удаление кастомного поля',
      message: `Удалить кастомное поле «${f.name}»?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/eps/custom-fields?id=${f.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            enqueueSnackbar('Поле удалено', { variant: 'info' });
            setDeleteConfirm((prev) => ({ ...prev, open: false }));
            fetchEpsData();
          } else {
            enqueueSnackbar(data.error || 'Ошибка удаления', { variant: 'error' });
          }
        } catch {
          enqueueSnackbar('Ошибка сети', { variant: 'error' });
        }
      },
    });
  };

  // Save Tag
  const handleSaveTag = async () => {
    if (!tagName.trim()) {
      enqueueSnackbar('Укажите название тега', { variant: 'warning' });
      return;
    }
    setSavingTag(true);
    try {
      const res = await fetch('/api/eps/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName.trim(), color: tagColor }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Тег создан', { variant: 'success' });
        setTagDialogOpen(false);
        setTagName('');
        fetchEpsData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingTag(false);
    }
  };

  const renderFieldTable = (fieldList: CustomFieldItem[]) => {
    if (fieldList.length === 0) {
      return (
        <EmptyState
          title="В этом разделе пока нет добавленных полей"
          description="Вы можете добавить кастомное поле с заданным типом данных и единицей измерения."
          actionText="Добавить поле"
          onAction={() => handleOpenCreateField()}
        />
      );
    }

    return (
      <DataTableWrapper total={fieldList.length} stickyHeader>
        <Table size="small" aria-label="Таблица пользовательских полей">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Название поля</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>Системный ключ</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>Тип данных</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 90 }}>Ед. изм.</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 110 }}>Обязательное</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Значение / Опции</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fieldList.map((f) => (
              <TableRow key={f.id} hover>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{f.name}</TableCell>
                <TableCell>
                  <Chip label={f.key} size="small" variant="outlined" sx={{ fontFamily: 'monospace', borderRadius: '4px', height: 20 }} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={f.fieldType} label={FIELD_TYPE_LABELS[f.fieldType] || f.fieldType} size="small" />
                </TableCell>
                <TableCell>
                  {f.unit ? <Chip label={f.unit} size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: '4px', height: 20 }} /> : '—'}
                </TableCell>
                <TableCell sx={{ fontSize: '0.8125rem' }}>{f.isRequired ? 'Да' : 'Нет'}</TableCell>
                <TableCell>
                  {f.fieldType === 'SELECT' && f.options ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {f.options.map((opt, i) => (
                        <Chip key={i} label={opt} size="small" variant="outlined" sx={{ borderRadius: '4px', height: 20 }} />
                      ))}
                    </Box>
                  ) : (
                    f.defaultValue || '—'
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => handleDeleteField(f)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>
    );
  };

  const MODULE_METADATA = [
    {
      title: 'Настройки модуля: Паспортизация (EPS)',
      subtitle: 'Конфигурация технических разделов, кастомных характеристик с единицами измерения и классификаторов',
      breadcrumb: 'Паспортизация (EPS)',
    },
    {
      title: 'Настройки модуля: Складской учёт (WMS)',
      subtitle: 'Конфигурация складов, стеллажных зон хранения и категорий номенклатуры',
      breadcrumb: 'Складской учёт (WMS)',
    },
    {
      title: 'Настройки модуля: Система подачи заявок (SRM)',
      subtitle: 'Настройки синхронизации с ServiceDesk (Jira, Redmine, 1C), маппинг полей и SLA',
      breadcrumb: 'Система подачи заявок (SRM)',
    },
    {
      title: 'Настройки модуля: ТО и Ремонт (MRO)',
      subtitle: 'Справочник регламентных работ, технологических карт и периодичностей ТО',
      breadcrumb: 'ТО и Ремонт (MRO)',
    },
  ];

  // Module Status State
  const MODULE_KEYS = ['eps', 'wms', 'srm', 'mro'] as const;
  const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>({
    eps: true,
    wms: true,
    srm: true,
    mro: true,
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchModuleStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setModuleStatus(json.data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchModuleStatus();
  }, [fetchModuleStatus]);

  const handleToggleModule = async (moduleId: string, newEnabled: boolean) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/modules/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, enabled: newEnabled }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setModuleStatus(json.data);
        enqueueSnackbar(`Модуль успешно ${newEnabled ? 'включен' : 'отключен'}`, {
          variant: newEnabled ? 'success' : 'info',
        });
      } else {
        enqueueSnackbar(json.error || 'Ошибка изменения статуса модуля', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при изменении статуса модуля', { variant: 'error' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const currentModuleKey = MODULE_KEYS[activeTab] || 'eps';
  const currentMeta = MODULE_META[currentModuleKey] || MODULE_META.eps;
  const currentModuleEnabled = moduleStatus[currentModuleKey] !== false;

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title={currentMeta.title}
        subtitle={currentMeta.subtitle}
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/users' },
          { label: 'Настройки модулей' },
          { label: currentMeta.breadcrumb },
        ]}
      />

      {/* Module Enable / Disable Control Banner */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          backgroundColor: currentModuleEnabled ? '#f8fafc' : '#fffbeb',
          borderColor: currentModuleEnabled ? '#e2e8f0' : '#fde68a',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <StatusBadge
            status={currentModuleEnabled ? 'ACTIVE' : 'INACTIVE'}
            label={currentModuleEnabled ? 'Модуль активен' : 'Модуль отключен'}
            size="small"
          />
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            {currentModuleEnabled
              ? 'Модуль включен и доступен в главном меню для операционной деятельности пользователей.'
              : 'Модуль отключен и скрыт из главного меню. Операционная функциональность заблокирована.'}
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={currentModuleEnabled}
              onChange={(e) => handleToggleModule(currentModuleKey, e.target.checked)}
              disabled={updatingStatus}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8125rem' }}>
              {currentModuleEnabled ? 'Включен' : 'Отключен'}
            </Typography>
          }
        />
      </Paper>

      {/* TAB 0: EPS — Разделы, Поля и Теги */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Main Column: Custom Sections with their Fields */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Кастомные разделы и поля паспорта оборудования
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Группировка технических параметров по тематическим разделам с единицами измерения
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleOpenCreateSection}
                    >
                      Добавить раздел
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenCreateField()}
                    >
                      Добавить поле
                    </Button>
                  </Box>
                </Box>
                <Divider sx={{ mb: 2.5 }} />

                {loadingEps ? (
                  <PageLoading text="Загрузка структуры разделов..." minHeight={160} size={28} />
                ) : sections.length === 0 ? (
                  <EmptyState
                    title="Разделы не созданы"
                    description="Кастомные разделы еще не созданы. Нажмите «Добавить раздел» для группировки полей."
                    minHeight={160}
                  />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sections.map((sec) => (
                      <Accordion key={sec.id} defaultExpanded variant="outlined" sx={{ borderRadius: '8px !important', overflow: 'hidden' }}>
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            px: 2.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {SECTION_ICONS[sec.icon || 'Bolt'] || <BoltIcon color="primary" />}
                              <Box>
                                <Typography variant="subtitle1" fontWeight={700}>
                                  {sec.name}
                                </Typography>
                                {sec.description && (
                                  <Typography variant="caption" color="text.secondary">
                                    {sec.description}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={`${sec.fields.length} полей`} size="small" />
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditSection(sec);
                                }}
                                title="Редактировать раздел"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSection(sec);
                                }}
                                title="Удалить раздел"
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          {renderFieldTable(sec.fields)}
                          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', backgroundColor: '#fafafa', borderTop: '1px solid #f1f5f9' }}>
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenCreateField(sec.id)}
                            >
                              Добавить поле в «{sec.name}»
                            </Button>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}

                    {/* Unassigned Fields Section if any */}
                    {unassignedFields.length > 0 && (
                      <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: '8px !important', overflow: 'hidden' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#fffbeb' }}>
                          <Typography variant="subtitle1" fontWeight={700} color="warning.dark">
                            Общие поля (без привязки к разделу)
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          {renderFieldTable(unassignedFields)}
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Side Column: Tags & Colors */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Теги и классификаторы
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Цветовые метки оборудования
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setTagName('');
                      setTagColor('#0284c7');
                      setTagDialogOpen(true);
                    }}
                  >
                    Создать тег
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {loadingEps ? (
                  <PageLoading text="Загрузка списка тегов..." minHeight={140} size={24} />
                ) : (
                  <DataTableWrapper total={tags.length} stickyHeader>
                    <Table size="small" aria-label="Таблица тегов оборудования">
                      <TableHead sx={{ backgroundColor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Тег</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Цвет</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Оборудование</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tags.map((t) => (
                          <TableRow key={t.id} hover>
                            <TableCell>
                              <StatusBadge
                                status={t.name}
                                label={t.name}
                                customColor={t.color}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: t.color }} />
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                  {t.color}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{t.equipmentCount} ед.</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableWrapper>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: WMS — Складской учёт */}
      {activeTab === 1 && (
        <Card sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Справочники склада (WMS)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Управление перечнем физических складов, материально ответственных лиц и структурой категорий номенклатуры
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Склады хранения
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" paragraph>
                  Центральный склад, Цех №1 (ЗиП), Склад ГСМ
                </Typography>
                <Button variant="outlined" size="small" startIcon={<AddIcon />}>
                  Добавить склад
                </Button>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Категории номенклатуры
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" paragraph>
                  Запасные части, Расходные материалы, Инструмент, Масла и смазки
                </Typography>
                <Button variant="outlined" size="small" startIcon={<AddIcon />}>
                  Добавить категорию
                </Button>
              </Card>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* TAB 2: SRM — Система подачи заявок */}
      {activeTab === 2 && (
        <Card sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Конфигурация системы подачи заявок и интеграций (SRM)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Маппинг полей инцидентов, статусов завершения и правил расчета метрик MTTR / MTBF
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5} sx={{ maxWidth: 720 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="Ключ проекта Jira" defaultValue="EMS" fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Поле инвентарного номера" defaultValue="customfield_10100" fullWidth size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="JQL фильтр инцидентов ТОиР" defaultValue="project = EMS AND issuetype in (Bug, Incident)" fullWidth size="small" />
            </Grid>
          </Grid>
        </Card>
      )}

      {/* TAB 3: MRO — ТО и Ремонт */}
      {activeTab === 3 && (
        <Card sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Шаблоны регламентов и чек-листов (MRO)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Электронные типовые бланки проверки узлов (замеры вибрации, уровня масла, давления, температуры)
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Button variant="contained" startIcon={<AddIcon />}>
            Создать шаблон чек-листа
          </Button>
        </Card>
      )}

      {/* Create / Edit Section Modal */}
      <FormDialog
        open={sectionDialogOpen}
        onClose={() => setSectionDialogOpen(false)}
        title={sectionEditingId ? 'Редактирование кастомного раздела' : 'Создание кастомного раздела'}
        maxWidth="sm"
        loading={savingSection}
        submitLabel={savingSection ? 'Сохранение...' : 'Сохранить раздел'}
        onSubmit={handleSaveSection}
        submitDisabled={savingSection || !sectionName}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Отображаемое название раздела"
            placeholder="например: Электротехнические характеристики"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            fullWidth
            size="small"
            required
          />
          {!sectionEditingId && (
            <TextField
              label="Системный код (латиницей)"
              placeholder="например: electrical_characteristics"
              value={sectionCode}
              onChange={(e) => setSectionCode(e.target.value)}
              fullWidth
              size="small"
              helperText="Оставьте пустым для автогенерации из названия"
            />
          )}
          <TextField
            label="Краткое описание"
            placeholder="Параметры мощности, напряжения, питающей сети"
            value={sectionDesc}
            onChange={(e) => setSectionDesc(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
          <TextField
            select
            label="Иконка раздела"
            value={sectionIcon}
            onChange={(e) => setSectionIcon(e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="Bolt">Электричество (Молния)</MenuItem>
            <MenuItem value="WaterDrop">Гидравлика (Капля)</MenuItem>
            <MenuItem value="Shield">Безопасность / Надежность (Щит)</MenuItem>
            <MenuItem value="Straighten">Габариты / Размеры (Линейка)</MenuItem>
            <MenuItem value="Speed">Скорость / Давление (Спидометр)</MenuItem>
          </TextField>
          <TextField
            label="Порядковый номер сортировки"
            type="number"
            value={sectionSort}
            onChange={(e) => setSectionSort(Number(e.target.value))}
            fullWidth
            size="small"
          />
        </Box>
      </FormDialog>

      {/* Create / Edit Custom Field Modal */}
      <FormDialog
        open={fieldDialogOpen}
        onClose={() => setFieldDialogOpen(false)}
        title="Добавление кастомного поля в паспорт"
        maxWidth="sm"
        loading={savingField}
        submitLabel={savingField ? 'Сохранение...' : 'Сохранить поле'}
        onSubmit={handleSaveField}
        submitDisabled={savingField || !fieldName || !fieldKey}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            select
            label="Целевой раздел паспорта"
            value={fieldTargetSectionId}
            onChange={(e) => setFieldTargetSectionId(e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="">— Общий (без раздела) —</MenuItem>
            {sections.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Отображаемое название поля"
            placeholder="например: Номинальная мощность"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            fullWidth
            size="small"
            required
          />

          <TextField
            label="Системный ключ (латиницей)"
            placeholder="например: nominal_power_kw"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
            fullWidth
            size="small"
            required
            helperText="Идентификатор поля в JSON-объекте оборудования"
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={7}>
              <TextField
                select
                label="Тип данных"
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
                fullWidth
                size="small"
              >
                {Object.entries(FIELD_TYPE_LABELS).map(([k, label]) => (
                  <MenuItem key={k} value={k}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={5}>
              <TextField
                label="Единица изм."
                placeholder="кВт, бар, В, кг, мм"
                value={fieldUnit}
                onChange={(e) => setFieldUnit(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          {fieldType === 'SELECT' && (
            <TextField
              label="Варианты (через запятую)"
              placeholder="220 В, 380 В, 6 кВ, 10 кВ"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              fullWidth
              size="small"
            />
          )}

          {fieldType !== 'BOOLEAN' && fieldType !== 'TEXTAREA' && (
            <TextField
              label="Значение по умолчанию"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              fullWidth
              size="small"
            />
          )}

          <TextField
            label="Порядковый номер внутри раздела"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            fullWidth
            size="small"
          />

          <FormControlLabel
            control={
              <Checkbox checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
            }
            label="Обязательно для заполнения в паспорте"
          />
        </Box>
      </FormDialog>

      {/* Create Tag Modal */}
      <FormDialog
        open={tagDialogOpen}
        onClose={() => setTagDialogOpen(false)}
        title="Создание тега оборудования"
        maxWidth="xs"
        loading={savingTag}
        submitLabel={savingTag ? 'Создание...' : 'Создать тег'}
        onSubmit={handleSaveTag}
        submitDisabled={savingTag || !tagName}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Название тега"
            placeholder="например: Взрывозащищенное"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            fullWidth
            size="small"
            required
          />
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Цвет бейджа:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((color) => (
                <Box
                  key={color}
                  onClick={() => setTagColor(color)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: tagColor === color ? '3px solid #0f172a' : '2px solid transparent',
                    transition: 'transform 0.1s ease',
                    '&:hover': { transform: 'scale(1.15)' },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </FormDialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        variant="danger"
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={deleteConfirm.onConfirm}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}

export default function ModuleSettingsPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка настроек разделов и полей..." />}>
      <ModuleSettingsContent />
    </Suspense>
  );
}
