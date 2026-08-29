'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import PageHeader from '@/components/layout/PageHeader';
import { SmartImportWizard } from '@/components/eps/SmartImportWizard';
import { useSnackbar } from 'notistack';
import {
  ConfirmDialog,
  PageLoading,
  StatusBadge,
  NavTabsContainer,
} from '@/components/ui';

import { useSearchParams, useRouter } from 'next/navigation';
import {
  SectionDialog,
  FieldDialog,
  TagDialog,
  type CustomSectionItem,
  type CustomFieldItem,
} from '@/components/admin/ModuleSettingsDialogs';
import {
  ModuleSettingsEpsTab,
  type TagItem,
} from '@/components/admin/ModuleSettingsEpsTab';

const MODULE_KEYS = ['eps', 'wms', 'srm', 'mro'];

const MODULE_META: Record<string, { title: string; subtitle: string; breadcrumb: string; name: string }> = {
  eps: {
    title: 'Настройки модуля — Паспортизация (EPS)',
    subtitle: 'Управление структурой технических разделов, параметрами паспортов и метками классификации',
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const initialTab = useMemo(() => {
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
  }, [tabParam]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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
  const [tagColor, setTagColor] = useState('primary.main');
  const [savingTag, setSavingTag] = useState(false);

  // Module Status State
  const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>({
    eps: true,
    wms: true,
    srm: true,
    mro: true,
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    loading?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const fetchModuleSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/module-settings');
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
    fetchModuleSettings();
  }, [fetchEpsData, fetchModuleSettings]);

  const handleToggleModule = async (moduleKey: string, enabled: boolean) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/admin/module-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleKey, enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setModuleStatus((prev) => ({ ...prev, [moduleKey]: enabled }));
        enqueueSnackbar(`Модуль ${MODULE_META[moduleKey]?.name || moduleKey} ${enabled ? 'включен' : 'отключен'}`, {
          variant: enabled ? 'success' : 'info',
        });
      } else {
        enqueueSnackbar(data.error || 'Ошибка изменения статуса модуля', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    const key = MODULE_KEYS[index] || 'eps';
    router.push(`/admin/module-settings?tab=${key}`);
  };

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
      title: 'Удаление технического раздела',
      message: `Удалить технический раздел «${s.name}»? Привязанные характеристики будут сохранены как общие параметры.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/eps/custom-sections?id=${s.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            enqueueSnackbar('Технический раздел удален', { variant: 'info' });
            setDeleteConfirm((prev) => ({ ...prev, open: false }));
            fetchEpsData();
          } else {
            enqueueSnackbar(data.error || 'Ошибка удаления раздела', { variant: 'error' });
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
      enqueueSnackbar('Укажите системный ключ и наименование параметра', { variant: 'warning' });
      return;
    }
    setSavingField(true);
    try {
      const options = fieldType === 'SELECT' ? optionsStr.split(',').map((o) => o.trim()).filter(Boolean) : undefined;
      const res = await fetch('/api/eps/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: fieldTargetSectionId || null,
          key: fieldKey.trim(),
          name: fieldName.trim(),
          fieldType,
          unit: fieldUnit.trim() || null,
          isRequired,
          defaultValue: defaultValue.trim() || null,
          options,
          sortOrder: Number(sortOrder) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Параметр добавлен в паспорт', { variant: 'success' });
        setFieldDialogOpen(false);
        fetchEpsData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка сохранения параметра', { variant: 'error' });
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
      title: 'Удаление технического параметра',
      message: `Удалить параметр «${f.name}» (${f.key}) из структуры паспорта?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/eps/custom-fields?id=${f.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            enqueueSnackbar('Параметр удален', { variant: 'info' });
            setDeleteConfirm((prev) => ({ ...prev, open: false }));
            fetchEpsData();
          } else {
            enqueueSnackbar(data.error || 'Ошибка удаления параметра', { variant: 'error' });
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
      enqueueSnackbar('Укажите наименование метки', { variant: 'warning' });
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
        enqueueSnackbar('Метка создана', { variant: 'success' });
        setTagDialogOpen(false);
        fetchEpsData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания метки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setSavingTag(false);
    }
  };

  const currentModuleKey = MODULE_KEYS[activeTab] || 'eps';
  const currentModuleMeta = MODULE_META[currentModuleKey] || MODULE_META.eps;
  const currentModuleEnabled = moduleStatus[currentModuleKey] ?? true;

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        title={currentModuleMeta.title}
        subtitle={currentModuleMeta.subtitle}
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Администрирование', href: '/admin/settings' },
          { label: 'Модули системы', href: '/admin/module-settings' },
          { label: currentModuleMeta.breadcrumb },
        ]}
        tabs={
          <NavTabsContainer
            value={activeTab}
            onChange={handleTabChange}
            tabs={[
              { label: 'Паспортизация (EPS)', value: 0, icon: <PrecisionManufacturingIcon fontSize="small" /> },
              { label: 'Складской учёт (WMS)', value: 1, icon: <Inventory2Icon fontSize="small" /> },
              { label: 'Система заявок (SRM)', value: 2, icon: <AssessmentIcon fontSize="small" /> },
              { label: 'ТО и Ремонт (MRO)', value: 3, icon: <BuildCircleIcon fontSize="small" /> },
            ]}
          />
        }
      />

      {/* Global Module Toggle Banner */}
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
          backgroundColor: currentModuleEnabled ? 'background.default' : 'warning.light',
          borderColor: currentModuleEnabled ? 'divider' : 'warning.light',
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

      {/* TAB 0: EPS — Разделы, Поля, Теги */}
      {activeTab === 0 && (
        <ModuleSettingsEpsTab
          sections={sections}
          unassignedFields={unassignedFields}
          tags={tags}
          loadingEps={loadingEps}
          onOpenImport={() => setImportDialogOpen(true)}
          onOpenCreateSection={handleOpenCreateSection}
          onOpenEditSection={handleOpenEditSection}
          onDeleteSection={handleDeleteSection}
          onOpenCreateField={handleOpenCreateField}
          onDeleteField={handleDeleteField}
          onOpenCreateTag={() => {
            setTagName('');
            setTagColor('primary.main');
            setTagDialogOpen(true);
          }}
        />
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

      {/* Modal Dialog: Мастер импорта оборудования */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px', overflow: 'hidden' },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
            px: 3,
            borderBottom: '1px solid divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <FileUploadOutlinedIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Мастер импорта оборудования
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setImportDialogOpen(false)} aria-label="Закрыть модальное окно">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, backgroundColor: 'background.default' }}>
          <SmartImportWizard />
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <SectionDialog
        open={sectionDialogOpen}
        editingId={sectionEditingId}
        name={sectionName}
        code={sectionCode}
        desc={sectionDesc}
        icon={sectionIcon}
        sort={sectionSort}
        saving={savingSection}
        onClose={() => setSectionDialogOpen(false)}
        onNameChange={setSectionName}
        onCodeChange={setSectionCode}
        onDescChange={setSectionDesc}
        onIconChange={setSectionIcon}
        onSortChange={setSectionSort}
        onSave={handleSaveSection}
      />

      <FieldDialog
        open={fieldDialogOpen}
        sections={sections}
        targetSectionId={fieldTargetSectionId}
        fieldKey={fieldKey}
        name={fieldName}
        fieldType={fieldType}
        unit={fieldUnit}
        isRequired={isRequired}
        defaultValue={defaultValue}
        optionsStr={optionsStr}
        sortOrder={sortOrder}
        saving={savingField}
        onClose={() => setFieldDialogOpen(false)}
        onTargetSectionIdChange={setFieldTargetSectionId}
        onFieldKeyChange={setFieldKey}
        onNameChange={setFieldName}
        onFieldTypeChange={setFieldType}
        onUnitChange={setFieldUnit}
        onIsRequiredChange={setIsRequired}
        onDefaultValueChange={setDefaultValue}
        onOptionsStrChange={setOptionsStr}
        onSortOrderChange={setSortOrder}
        onSave={handleSaveField}
      />

      <TagDialog
        open={tagDialogOpen}
        tagName={tagName}
        tagColor={tagColor}
        saving={savingTag}
        onClose={() => setTagDialogOpen(false)}
        onTagNameChange={setTagName}
        onTagColorChange={setTagColor}
        onSave={handleSaveTag}
      />

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
