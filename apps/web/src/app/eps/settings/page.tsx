'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  Paper,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { useSearchParams, useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CategoryIcon from '@mui/icons-material/Category';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SpeedIcon from '@mui/icons-material/Speed';
import ShieldIcon from '@mui/icons-material/Shield';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import StraightenIcon from '@mui/icons-material/Straighten';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import PageHeader from '@/components/layout/PageHeader';
import { NavTabsContainer } from '@/components/layout/NavTabs';
import { useSnackbar } from 'notistack';
import {
  EmptyState,
  DataTableWrapper,
  FormDialog,
  ConfirmDialog,
  StatusBadge,
  StatCard,
} from '@/components/ui';
import { SmartImportWizard } from '@/components/eps/SmartImportWizard';

interface CustomFieldItem {
  id: string;
  sectionId: string | null;
  key: string;
  name: string;
  fieldType: string;
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
  Category: <CategoryIcon color="primary" />,
  Speed: <SpeedIcon color="error" />,
  Shield: <ShieldIcon color="success" />,
  Engineering: <EngineeringIcon color="warning" />,
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="info" />,
  Straighten: <StraightenIcon color="secondary" />,
};

const PRESET_COLORS = ['#0284c7', '#0f766e', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#475569'];

function EpsSettingsContent() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const getInitialTab = () => {
    switch (tabParam) {
      case 'tags':
        return 1;
      case 'import':
      case 'wizard':
        return 2;
      default:
        return 0;
    }
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (tabParam === 'tags') setActiveTab(1);
    else if (tabParam === 'import' || tabParam === 'wizard') setActiveTab(2);
    else if (tabParam === 'fields' || tabParam === 'sections') setActiveTab(0);
  }, [tabParam]);

  const handleTabChange = (_: React.SyntheticEvent, newTab: number) => {
    setActiveTab(newTab);
    const tabName = newTab === 1 ? 'tags' : newTab === 2 ? 'import' : 'fields';
    router.replace(`/eps/settings?tab=${tabName}`, { scroll: false });
  };

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

  // Section Handlers
  const handleOpenCreateSection = () => {
    setSectionEditingId(null);
    setSectionName('');
    setSectionCode('');
    setSectionDesc('');
    setSectionIcon('Bolt');
    setSectionSort(sections.length + 1);
    setSectionDialogOpen(true);
  };

  const handleOpenEditSection = (s: CustomSectionItem) => {
    setSectionEditingId(s.id);
    setSectionName(s.name);
    setSectionCode(s.code);
    setSectionDesc(s.description || '');
    setSectionIcon(s.icon || 'Bolt');
    setSectionSort(s.sortOrder);
    setSectionDialogOpen(true);
  };

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

  // Field Handlers
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
          options: options || null,
          sortOrder: Number(sortOrder) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Кастомное поле создано', { variant: 'success' });
        setFieldDialogOpen(false);
        fetchEpsData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения поля', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingField(false);
    }
  };

  const handleDeleteField = (f: CustomFieldItem) => {
    setDeleteConfirm({
      open: true,
      title: 'Удаление кастомного поля',
      message: `Удалить поле «${f.name}» (${f.key})? Данные поля в паспортах оборудования будут недоступны.`,
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

  // Tag Handlers
  const handleOpenCreateTag = () => {
    setTagName('');
    setTagColor('#0284c7');
    setTagDialogOpen(true);
  };

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
        body: JSON.stringify({
          name: tagName.trim(),
          color: tagColor,
        }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Тег создан', { variant: 'success' });
        setTagDialogOpen(false);
        fetchEpsData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания тега', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = (t: TagItem) => {
    setDeleteConfirm({
      open: true,
      title: 'Удаление тега',
      message: `Удалить тег «${t.name}»? Он будет откреплен от всех единиц оборудования (${t.equipmentCount} шт.).`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/eps/tags?id=${t.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            enqueueSnackbar('Тег удален', { variant: 'info' });
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

  const totalFieldsCount = useMemo(() => {
    const sectionFields = sections.reduce((acc, s) => acc + s.fields.length, 0);
    return sectionFields + unassignedFields.length;
  }, [sections, unassignedFields]);

  const renderFieldTable = (fields: CustomFieldItem[]) => {
    if (fields.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            В этом разделе пока нет добавленных полей
          </Typography>
        </Box>
      );
    }

    return (
      <Table size="small">
        <TableHead sx={{ backgroundColor: 'action.hover' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Ключ (код)</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Название поля</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Тип данных</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Ед. изм.</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Обязательное</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((f) => (
            <TableRow key={f.id} hover>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main', fontSize: '0.8125rem' }}>
                {f.key}
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{f.name}</TableCell>
              <TableCell>
                <Chip label={FIELD_TYPE_LABELS[f.fieldType] || f.fieldType} size="small" variant="outlined" />
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>{f.unit || '—'}</TableCell>
              <TableCell>
                {f.isRequired ? (
                  <Chip label="Да" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.6875rem' }} />
                ) : (
                  <Typography variant="caption" color="text.secondary">Нет</Typography>
                )}
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" color="error" onClick={() => handleDeleteField(f)} title="Удалить поле">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto', pb: 4 }}>
      {/* ─── Page Header with Integrated Seamless Tabs ─── */}
      <PageHeader
        title="EPS — Настройки модуля паспортизации"
        subtitle="Управление техническими разделами, пользовательскими полями паспорта, классификаторами и мастер импорта оборудования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Настройки модуля' },
        ]}
        tabs={
          <NavTabsContainer
            activeTab={activeTab}
            onChange={handleTabChange}
            tabs={[
              { label: 'Кастомные разделы и поля', icon: <LayersOutlinedIcon sx={{ fontSize: 18 }} /> },
              { label: 'Теги и классификаторы', icon: <LabelOutlinedIcon sx={{ fontSize: 18 }} /> },
              { label: 'Мастер импорта оборудования (Wizard)', icon: <FileUploadOutlinedIcon sx={{ fontSize: 18 }} /> },
            ]}
          />
        }
      />

      {/* ─── TAB 0: Кастомные разделы и поля ─── */}
      {activeTab === 0 && (
        <Box>
          {/* KPI Metrics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Всего разделов"
                value={sections.length}
                subtitle="Тематических групп параметров"
                icon={<CategoryIcon sx={{ fontSize: 22 }} />}
                accentColor="#0284c7"
                iconColor="#0284c7"
                iconBgColor="rgba(2, 132, 199, 0.08)"
                onClick={handleOpenCreateSection}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Пользовательских полей"
                value={totalFieldsCount}
                subtitle="Характеристик в паспортах"
                icon={<BoltIcon sx={{ fontSize: 22 }} />}
                accentColor="#7c3aed"
                iconColor="#7c3aed"
                iconBgColor="rgba(124, 58, 237, 0.08)"
                onClick={() => handleOpenCreateField()}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Тегов классификации"
                value={tags.length}
                subtitle="Меток для быстрой группировки"
                icon={<LocalOfferIcon sx={{ fontSize: 22 }} />}
                accentColor="#059669"
                iconColor="#059669"
                iconBgColor="rgba(5, 150, 105, 0.08)"
                onClick={() => setActiveTab(1)}
              />
            </Grid>
          </Grid>

          <Card sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Структура кастомных разделов паспорта
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
                    sx={{ fontWeight: 600, borderRadius: '8px' }}
                  >
                    Добавить раздел
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenCreateField()}
                    sx={{ fontWeight: 600, borderRadius: '8px' }}
                  >
                    Добавить поле
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {loadingEps ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Загрузка структуры разделов...</Typography>
                </Box>
              ) : sections.length === 0 ? (
                <EmptyState
                  title="Разделы не созданы"
                  description="Кастомные разделы еще не созданы. Нажмите «Добавить раздел» для группировки полей паспорта."
                  actionText="Добавить раздел"
                  onAction={handleOpenCreateSection}
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
                            <Chip label={`${sec.fields.length} полей`} size="small" sx={{ fontWeight: 600 }} />
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
                            sx={{ fontWeight: 600 }}
                          >
                            Добавить поле в «{sec.name}»
                          </Button>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}

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
        </Box>
      )}

      {/* ─── TAB 1: Теги и классификаторы ─── */}
      {activeTab === 1 && (
        <Card sx={{ borderRadius: '12px' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Теги и классификаторы оборудования
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Семантические метки для быстрой группировки, фильтрации и визуальной идентификации оборудования
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateTag}
                sx={{ fontWeight: 600, borderRadius: '8px' }}
              >
                Создать тег
              </Button>
            </Box>
            <Divider sx={{ mb: 2.5 }} />

            {loadingEps ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Загрузка тегов...</Typography>
              </Box>
            ) : tags.length === 0 ? (
              <EmptyState
                title="Теги не созданы"
                description="В системе пока нет тегов для маркировки оборудования. Нажмите «Создать тег» для добавления нового."
                actionText="Создать тег"
                onAction={handleOpenCreateTag}
                minHeight={160}
              />
            ) : (
              <Grid container spacing={2}>
                {tags.map((t) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={t.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: '10px',
                        borderLeft: `4px solid ${t.color}`,
                        backgroundColor: '#ffffff',
                        '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            backgroundColor: t.color,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={700} noWrap>
                            {t.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.equipmentCount || 0} ед. оборуд.
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDeleteTag(t)} title="Удалить тег">
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 2: Мастер импорта оборудования (Wizard) ─── */}
      {activeTab === 2 && (
        <SmartImportWizard />
      )}

      {/* ─── Section Modal Dialog ─── */}
      <FormDialog
        open={sectionDialogOpen}
        onClose={() => setSectionDialogOpen(false)}
        title={sectionEditingId ? 'Редактировать раздел' : 'Новый кастомный раздел'}
        onSubmit={handleSaveSection}
        loading={savingSection}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField
              label="Название раздела *"
              fullWidth
              size="small"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="например: Электротехнические параметры"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Системный код"
              fullWidth
              size="small"
              value={sectionCode}
              onChange={(e) => setSectionCode(e.target.value)}
              placeholder="например: electrical_params"
              helperText="Опционально (латиница)"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Иконка раздела"
              fullWidth
              size="small"
              value={sectionIcon}
              onChange={(e) => setSectionIcon(e.target.value)}
            >
              {Object.keys(SECTION_ICONS).map((iconName) => (
                <MenuItem key={iconName} value={iconName}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {SECTION_ICONS[iconName]}
                    <Typography variant="body2">{iconName}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Описание раздела"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={sectionDesc}
              onChange={(e) => setSectionDesc(e.target.value)}
              placeholder="Краткое назначение параметров этого раздела"
            />
          </Grid>
        </Grid>
      </FormDialog>

      {/* ─── Field Modal Dialog ─── */}
      <FormDialog
        open={fieldDialogOpen}
        onClose={() => setFieldDialogOpen(false)}
        title="Новое кастомное поле паспорта"
        onSubmit={handleSaveField}
        loading={savingField}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Ключ поля (код) *"
              fullWidth
              size="small"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="voltage_rating"
              helperText="Уникальный идентификатор (латиница)"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Название поля *"
              fullWidth
              size="small"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="Номинальное напряжение"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Тип данных"
              fullWidth
              size="small"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
            >
              {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Единица измерения"
              fullWidth
              size="small"
              value={fieldUnit}
              onChange={(e) => setFieldUnit(e.target.value)}
              placeholder="кВт, В, бар, об/мин..."
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Привязка к разделу"
              fullWidth
              size="small"
              value={fieldTargetSectionId}
              onChange={(e) => setFieldTargetSectionId(e.target.value)}
            >
              <MenuItem value="">Без привязки (Общее поле)</MenuItem>
              {sections.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Значение по умолчанию"
              fullWidth
              size="small"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
            />
          </Grid>
          {fieldType === 'SELECT' && (
            <Grid item xs={12}>
              <TextField
                label="Варианты выбора (через запятую)"
                fullWidth
                size="small"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                placeholder="Вариант 1, Вариант 2, Вариант 3"
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} color="primary" />}
              label="Обязательное поле для заполнения при создании оборудования"
            />
          </Grid>
        </Grid>
      </FormDialog>

      {/* ─── Tag Modal Dialog ─── */}
      <FormDialog
        open={tagDialogOpen}
        onClose={() => setTagDialogOpen(false)}
        title="Новый тег оборудования"
        onSubmit={handleSaveTag}
        loading={savingTag}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField
              label="Название тега *"
              fullWidth
              size="small"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="например: Взрывозащищенное, Критичный узел..."
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Выберите цвет:</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', my: 1 }}>
              {PRESET_COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setTagColor(c)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: tagColor === c ? '3px solid #0f172a' : '2px solid transparent',
                    boxShadow: tagColor === c ? '0 0 0 2px #94a3b8' : 'none',
                    transition: 'transform 0.1s',
                    '&:hover': { transform: 'scale(1.15)' },
                  }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </FormDialog>

      {/* ─── Confirm Delete Dialog ─── */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, open: false }))}
        onConfirm={deleteConfirm.onConfirm}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        confirmColor="error"
        confirmLabel="Удалить"
      />
    </Box>
  );
}

export default function EpsSettingsPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 4 }}><Typography>Загрузка настроек EPS...</Typography></Box>}>
      <EpsSettingsContent />
    </Suspense>
  );
}
