'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import { EQUIPMENT_STATUS_MAP, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import { exportReportExcel, buildReportCsv, buildReportJson, downloadReportFile } from './report-export';
import {
  EmptyState,
  DataTableWrapper,
  ExportButton,
  ConfirmDialog,
  PageLoading,
} from '@/components/ui';
import ReportColumnBuilderDialog, { ReportColumn, IndustryPreset } from '@/components/eps/reports/ReportColumnBuilderDialog';
import ReportSaveTemplateDialog from '@/components/eps/reports/ReportSaveTemplateDialog';
import ReportDataTable from '@/components/eps/reports/ReportDataTable';
import ReportPresetsToolbar from '@/components/eps/reports/ReportPresetsToolbar';
import { ReportStatsCards } from '@/components/eps/reports/ReportStatsCards';
import { ReportFiltersToolbar } from '@/components/eps/reports/ReportFiltersToolbar';
import { applyReportPreset, applyReportTemplate, type ReportFilterState, type ReportSortState } from './report-template-handlers';

export interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  config: {
    selectedColumns: string[];
    filters?: any;
    sort?: any;
    title?: string;
  };
  isPublic: boolean;
  createdBy: {
    id: string;
    displayName: string;
  };
  createdAt: string;
}

const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: 'inv_1',
    name: 'Инвентаризационная опись (ИНВ-1)',
    columns: [
      'inventoryNumber',
      'name',
      'serialNumber',
      'manufacturer',
      'model',
      'location',
      'status',
      'commissionDate',
      'responsible_person_name',
    ],
  },
  {
    id: 'metrology',
    name: 'Метрология и поверка',
    columns: [
      'inventoryNumber',
      'name',
      'serialNumber',
      'manufacturer',
      'location',
      'calibration_interval',
      'clean_room_class',
      'is_unique',
    ],
  },
  {
    id: 'condition',
    name: 'Техническое состояние и износ',
    columns: [
      'inventoryNumber',
      'name',
      'status',
      'location',
      'actual_wear_percentage',
      'criticality',
      'mtbf_hours',
      'failure_risk_score',
    ],
  },
  {
    id: 'full_passport',
    name: 'Полная техническая сводка',
    columns: [
      'inventoryNumber',
      'name',
      'serialNumber',
      'manufacturer',
      'model',
      'country',
      'releaseYear',
      'commissionDate',
      'status',
      'location',
      'responsible_person_name',
      'criticality',
      'actual_wear_percentage',
    ],
  },
];

function ReportBuilderContent() {
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();

  const canAccessReports = user?.roles?.includes('admin') || hasPermission(PERMISSIONS.EPS_REPORTS_VIEW);
  const canManageTemplates = user?.roles?.includes('admin') || hasPermission(PERMISSIONS.EPS_REPORTS_MANAGE);

  const [availableColumns, setAvailableColumns] = useState<ReportColumn[]>([]);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([
    'inventoryNumber',
    'name',
    'serialNumber',
    'manufacturer',
    'model',
    'location',
    'status',
    'commissionDate',
    'criticality',
  ]);

  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('inventoryNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Presets & Templates
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [activePresetOrTemplateId, setActivePresetOrTemplateId] = useState<string | null>('full_passport');

  // Dialogs
  const [columnBuilderOpen, setColumnBuilderOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplatePublic, setNewTemplatePublic] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/eps/reports/templates');
      const json = await res.json();
      if (json.success && json.data) {
        setTemplates(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const generateReport = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/eps/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedColumns: selectedColumnKeys,
          filters: {
            status: statusFilter || undefined,
            search: searchQuery || undefined,
            manufacturer: manufacturerFilter || undefined,
            location: locationFilter || undefined,
            commissionDateFrom: dateFrom || undefined,
            commissionDateTo: dateTo || undefined,
          },
          sort: {
            field: sortField,
            order: sortOrder,
          },
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAvailableColumns(json.data.availableColumns);
        setRows(json.data.rows);
        setPage(1);
      } else {
        enqueueSnackbar(json.error || 'Ошибка загрузки данных отчета', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка формирования отчета', { variant: 'error' });
    } finally {
      setLoadingData(false);
    }
  }, [
    selectedColumnKeys,
    statusFilter,
    searchQuery,
    manufacturerFilter,
    locationFilter,
    dateFrom,
    dateTo,
    sortField,
    sortOrder,
    enqueueSnackbar,
  ]);

  useEffect(() => {
    if (canAccessReports) {
      fetchTemplates();
      generateReport();
    }
  }, [canAccessReports, fetchTemplates, generateReport]);

  const activeColumnsDef = useMemo(() => {
    const map = new Map(availableColumns.map((c) => [c.key, c]));
    return selectedColumnKeys
      .map((k) => map.get(k))
      .filter((c): c is ReportColumn => Boolean(c));
  }, [availableColumns, selectedColumnKeys]);

  const averageWear = useMemo(() => {
    if (rows.length === 0) return null;
    const wearVals = rows
      .map((r) => parseFloat(r.actual_wear_percentage))
      .filter((n) => !isNaN(n));
    if (wearVals.length === 0) return null;
    const avg = wearVals.reduce((a, b) => a + b, 0) / wearVals.length;
    return Math.round(avg);
  }, [rows]);

  const activeFilterCount =
    (statusFilter ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (manufacturerFilter ? 1 : 0) +
    (locationFilter ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const handleResetFilters = () => {
    setStatusFilter('');
    setSearchQuery('');
    setManufacturerFilter('');
    setLocationFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const handleToggleColumn = (key: string) => {
    setSelectedColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    setActivePresetOrTemplateId(null);
  };

  const handleToggleCategory = (category: string) => {
    const catCols = availableColumns.filter((c) => (c.category || 'Прочее') === category).map((c) => c.key);
    const allChecked = catCols.every((k) => selectedColumnKeys.includes(k));
    if (allChecked) {
      setSelectedColumnKeys((prev) => prev.filter((k) => !catCols.includes(k)));
    } else {
      setSelectedColumnKeys((prev) => Array.from(new Set([...prev, ...catCols])));
    }
    setActivePresetOrTemplateId(null);
  };

  const handleSelectAllColumns = () => {
    setSelectedColumnKeys(availableColumns.map((c) => c.key));
    setActivePresetOrTemplateId('all');
  };

  const handleApplyPreset = (preset: IndustryPreset) => {
    applyReportPreset(preset, setSelectedColumnKeys, setActivePresetOrTemplateId);
    enqueueSnackbar(`Применен пресет «${preset.name}»`, { variant: 'info' });
  };

  const handleApplyTemplate = (template: SavedTemplate) => {
    applyReportTemplate(
      template,
      setSelectedColumnKeys,
      (filters: ReportFilterState) => {
        setStatusFilter(filters.status);
        setSearchQuery(filters.search);
        setManufacturerFilter(filters.manufacturer);
        setLocationFilter(filters.location);
        setDateFrom(filters.dateFrom);
        setDateTo(filters.dateTo);
      },
      (sort: ReportSortState) => {
        setSortField(sort.field);
        setSortOrder(sort.order);
      },
      setActivePresetOrTemplateId,
    );
    enqueueSnackbar(`Загружен шаблон «${template.name}»`, { variant: 'success' });
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= selectedColumnKeys.length) return;
    const updated = [...selectedColumnKeys];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSelectedColumnKeys(updated);
  };

  const handleRemoveColumn = (key: string) => {
    setSelectedColumnKeys((prev) => prev.filter((k) => k !== key));
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      enqueueSnackbar('Укажите название шаблона', { variant: 'warning' });
      return;
    }
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/eps/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          description: newTemplateDesc.trim() || undefined,
          isPublic: newTemplatePublic,
          config: {
            selectedColumns: selectedColumnKeys,
            filters: {
              status: statusFilter,
              search: searchQuery,
              manufacturer: manufacturerFilter,
              location: locationFilter,
              commissionDateFrom: dateFrom,
              commissionDateTo: dateTo,
            },
            sort: { field: sortField, order: sortOrder },
          },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Шаблон успешно сохранен', { variant: 'success' });
        setSaveTemplateOpen(false);
        setNewTemplateName('');
        setNewTemplateDesc('');
        fetchTemplates();
      } else {
        enqueueSnackbar(json.error || 'Ошибка сохранения шаблона', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка сохранения шаблона', { variant: 'error' });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    try {
      const res = await fetch(`/api/eps/reports/templates/${deleteTemplateId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        enqueueSnackbar('Шаблон отчета удален', { variant: 'info' });
        if (activePresetOrTemplateId === `tmpl_${deleteTemplateId}`) {
          setActivePresetOrTemplateId(null);
        }
        setDeleteTemplateId(null);
        fetchTemplates();
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления шаблона', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка удаления шаблона', { variant: 'error' });
    }
  };

  const handleExportExcel = () => {
    if (rows.length === 0) {
      enqueueSnackbar('Нет данных для выгрузки', { variant: 'warning' });
      return;
    }

    const fileName = exportReportExcel(rows, activeColumnsDef);
    enqueueSnackbar(`Отчет успешно экспортирован: ${fileName}`, { variant: 'success' });
  };

  const handleExportCsv = () => {
    if (rows.length === 0) {
      enqueueSnackbar('Нет данных для выгрузки', { variant: 'warning' });
      return;
    }

    const csvContent = buildReportCsv(rows, activeColumnsDef);
    downloadReportFile(csvContent, `EPS_Ведомость_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    enqueueSnackbar('CSV файл успешно выгружен', { variant: 'success' });
  };

  const handleExportJson = () => {
    if (rows.length === 0) {
      enqueueSnackbar('Нет данных для выгрузки', { variant: 'warning' });
      return;
    }

    const jsonStr = buildReportJson(rows, activeColumnsDef);
    downloadReportFile(jsonStr, `EPS_Ведомость_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    enqueueSnackbar('JSON файл успешно выгружен', { variant: 'success' });
  };

  const paginatedRows = useMemo(() => {
    return rows.slice((page - 1) * pageSize, page * pageSize);
  }, [rows, page, pageSize]);

  if (!canAccessReports) {
    return (
      <Box sx={{ width: '100%', pb: 4 }}>
        <PageHeader
          title="EPS — Конструктор отчетов оборудования"
          subtitle="Интерактивный конструктор ведомостей, выборка параметров по паспортам и экспорт в Excel, CSV и JSON"
          breadcrumbs={[
            { label: 'Главная', href: '/' },
            { label: 'Оборудование', href: '/eps' },
            { label: 'Конструктор отчетов' },
          ]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет прав на просмотр и формирование отчетов (требуется право eps.reports.view)."
          icon={<AssessmentOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: 2 }}>
      <PageHeader
        title="EPS — Конструктор отчетов оборудования"
        subtitle="Интерактивный конструктор ведомостей, выборка параметров по паспортам и экспорт в Excel, CSV и JSON"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Конструктор отчетов' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ViewColumnOutlinedIcon />}
              onClick={() => setColumnBuilderOpen(true)}
              sx={{
                fontWeight: 600,
                borderRadius: '8px',
                height: 36,
                minHeight: 36,
              }}
            >
              Конструктор колонок ({selectedColumnKeys.length})
            </Button>
            <ExportButton
              formats={['xlsx', 'csv', 'json']}
              variant="contained"
              color="primary"
              label="Экспорт"
              disabled={rows.length === 0}
              onExport={(fmt) => {
                if (fmt === 'xlsx') handleExportExcel();
                else if (fmt === 'csv') handleExportCsv();
                else if (fmt === 'json') handleExportJson();
              }}
            />
          </Box>
        }
      />

      <ReportStatsCards
        rowsCount={rows.length}
        selectedColumnsCount={selectedColumnKeys.length}
        availableColumnsCount={availableColumns.length}
        averageWear={averageWear}
        templatesCount={templates.length}
        presetsCount={INDUSTRY_PRESETS.length}
        activeFilterCount={activeFilterCount}
        loading={loadingData && rows.length === 0}
        onOpenColumnBuilder={() => setColumnBuilderOpen(true)}
      />

      <ReportPresetsToolbar
        presets={INDUSTRY_PRESETS}
        templates={templates}
        activePresetOrTemplateId={activePresetOrTemplateId}
        canManageTemplates={canManageTemplates}
        onApplyPreset={handleApplyPreset}
        onApplyTemplate={handleApplyTemplate}
        onDeleteTemplate={setDeleteTemplateId}
        onSaveTemplate={() => setSaveTemplateOpen(true)}
      />

      {/* Report Data Table */}
      <DataTableWrapper
        loading={loadingData}
        total={rows.length}
        page={page - 1}
        pageSize={pageSize}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        empty={rows.length === 0 && !loadingData}
        emptyState={
          <EmptyState
            title="Нет данных по заданным фильтрам"
            description="Попробуйте изменить параметры выборки или сбросить активные фильтры."
            actionText="Сбросить фильтры"
            onAction={handleResetFilters}
          />
        }
        toolbar={
          <ReportFiltersToolbar
            activeFilterCount={activeFilterCount}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onReset={handleResetFilters}
            onSearchChange={(value) => { setSearchQuery(value); setPage(1); }}
            onStatusChange={(value) => { setStatusFilter(value); setPage(1); }}
            onDateFromChange={(value) => { setDateFrom(value); setPage(1); }}
            onDateToChange={(value) => { setDateTo(value); setPage(1); }}
          />
        }
      >
        <ReportDataTable
          rows={paginatedRows}
          activeColumnsDef={activeColumnsDef}
          page={page}
          pageSize={pageSize}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={(key) => {
            if (sortField === key) {
              setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
              setSortField(key);
              setSortOrder('asc');
            }
          }}
        />
      </DataTableWrapper>

      <ReportColumnBuilderDialog
        open={columnBuilderOpen}
        availableColumns={availableColumns}
        selectedColumnKeys={selectedColumnKeys}
        activePresetOrTemplateId={activePresetOrTemplateId}
        presets={INDUSTRY_PRESETS}
        onClose={() => setColumnBuilderOpen(false)}
        onApplyColumns={(cols) => {
          setSelectedColumnKeys(cols);
          setColumnBuilderOpen(false);
          generateReport();
        }}
        onApplyPreset={handleApplyPreset}
        onSelectAll={handleSelectAllColumns}
        onToggleColumn={handleToggleColumn}
        onToggleCategory={handleToggleCategory}
        onMoveColumn={handleMoveColumn}
        onRemoveColumn={handleRemoveColumn}
        onResetOrder={() => setSelectedColumnKeys(['inventoryNumber', 'name'])}
      />

      <ReportSaveTemplateDialog
        open={saveTemplateOpen}
        name={newTemplateName}
        description={newTemplateDesc}
        isPublic={newTemplatePublic}
        saving={savingTemplate}
        selectedColumnsCount={selectedColumnKeys.length}
        onClose={() => setSaveTemplateOpen(false)}
        onNameChange={setNewTemplateName}
        onDescriptionChange={setNewTemplateDesc}
        onPublicChange={setNewTemplatePublic}
        onSave={handleSaveTemplate}
      />

      <ConfirmDialog
        open={Boolean(deleteTemplateId)}
        title="Удалить шаблон отчета?"
        message="Вы уверены, что хотите безвозвратно удалить сохраненный шаблон?"
        confirmText="Удалить"
        variant="danger"
        onClose={() => setDeleteTemplateId(null)}
        onConfirm={handleDeleteTemplate}
      />
    </Box>
  );
}

export default function ReportBuilderPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка конструктора отчетов..." />}>
      <ReportBuilderContent />
    </Suspense>
  );
}
