'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import { ReportColumn, SavedTemplate, INDUSTRY_PRESETS } from './types';

export function useReportBuilder() {
  const { enqueueSnackbar } = useSnackbar();

  // Columns & Data state
  const [availableColumns, setAvailableColumns] = useState<ReportColumn[]>([]);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([
    'inventoryNumber',
    'name',
    'serialNumber',
    'manufacturer',
    'model',
    'location',
    'status',
    'criticality',
    'actual_wear_percentage',
    'commissionDate',
  ]);
  const [columnBuilderOpen, setColumnBuilderOpen] = useState(false);
  const [searchQueryColumn, setSearchQueryColumn] = useState('');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination state for preview
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Templates state
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [activePresetOrTemplateId, setActivePresetOrTemplateId] = useState<string | null>(null);

  // Save template modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplatePublic, setNewTemplatePublic] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // Load available columns
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/api/eps/custom-sections');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const cols: ReportColumn[] = [];

            // 1. Base identity & status fields
            cols.push(
              { key: 'inventoryNumber', name: 'Инвентарный номер', category: 'Идентификация и учет' },
              { key: 'name', name: 'Наименование оборудования', category: 'Идентификация и учет' },
              { key: 'serialNumber', name: 'Заводской / Серийный номер', category: 'Идентификация и учет' },
              { key: 'manufacturer', name: 'Завод-изготовитель (Вендор)', category: 'Идентификация и учет' },
              { key: 'model', name: 'Модель / Марка', category: 'Идентификация и учет' },
              { key: 'location', name: 'Место установки (Цех / Участок)', category: 'Размещение и статус' },
              { key: 'status', name: 'Эксплуатационный статус', category: 'Размещение и статус' },
              { key: 'commissionDate', name: 'Дата ввода в эксплуатацию', category: 'Размещение и статус' }
            );

            // 2. Custom sections and fields
            for (const sec of json.data.sections || []) {
              for (const f of sec.fields || []) {
                cols.push({
                  key: f.key,
                  name: f.unit ? `${f.name} (${f.unit})` : f.name,
                  category: sec.name,
                  unit: f.unit,
                });
              }
            }

            // 3. System Counters
            cols.push(
              { key: 'documentsCount', name: 'Прикреплено документов (шт)', category: 'Связанные объекты' },
              { key: 'sparePartsCount', name: 'Позиций ЗИП / Комплектующих', category: 'Связанные объекты' },
              { key: 'maintenancePlansCount', name: 'Планов регламентного ТО', category: 'Связанные объекты' }
            );

            setAvailableColumns(cols);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки колонок отчета:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch saved templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/eps/reports/templates');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTemplates(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Execute report data fetch
  const generateReport = useCallback(async () => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (manufacturerFilter) params.append('manufacturer', manufacturerFilter);
      if (locationFilter) params.append('location', locationFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/eps/reports/generate?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setRows(json.data.rows || []);
          setPage(1);
        } else {
          enqueueSnackbar(json.error || 'Ошибка формирования отчета', { variant: 'error' });
        }
      }
    } catch {
      enqueueSnackbar('Ошибка сети при формировании отчета', { variant: 'error' });
    } finally {
      setLoadingData(false);
    }
  }, [statusFilter, searchQuery, manufacturerFilter, locationFilter, dateFrom, dateTo, enqueueSnackbar]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const activeColumnsDef = useMemo(() => {
    const colMap = new Map(availableColumns.map((c) => [c.key, c]));
    return selectedColumnKeys
      .map((k) => colMap.get(k))
      .filter((c): c is ReportColumn => Boolean(c));
  }, [availableColumns, selectedColumnKeys]);

  const sortedRows = useMemo(() => {
    if (!sortField) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ru')
        : String(bVal).localeCompare(String(aVal), 'ru');
    });
  }, [rows, sortField, sortOrder]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  // Apply Industry Preset
  const handleApplyPreset = useCallback((presetId: string) => {
    const preset = INDUSTRY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedColumnKeys(preset.columns);
    setActivePresetOrTemplateId(`preset_${presetId}`);
    enqueueSnackbar(`Применен пресет «${preset.name}»`, { variant: 'info' });
  }, [enqueueSnackbar]);

  // Apply Saved Custom Template
  const handleApplyTemplate = useCallback((template: SavedTemplate) => {
    if (template.config?.selectedColumns) {
      setSelectedColumnKeys(template.config.selectedColumns);
    }
    if (template.config?.filters) {
      const f = template.config.filters;
      if (f.status !== undefined) setStatusFilter(f.status);
      if (f.manufacturer !== undefined) setManufacturerFilter(f.manufacturer);
      if (f.location !== undefined) setLocationFilter(f.location);
    }
    setActivePresetOrTemplateId(`tmpl_${template.id}`);
    enqueueSnackbar(`Загружен шаблон «${template.name}»`, { variant: 'success' });
  }, [enqueueSnackbar]);

  // Save new template
  const handleSaveTemplate = useCallback(async () => {
    if (!newTemplateName.trim()) {
      enqueueSnackbar('Укажите наименование шаблона', { variant: 'warning' });
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
              manufacturer: manufacturerFilter,
              location: locationFilter,
            },
          },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Шаблон отчета сохранен', { variant: 'success' });
        setSaveModalOpen(false);
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
  }, [newTemplateName, newTemplateDesc, newTemplatePublic, selectedColumnKeys, statusFilter, manufacturerFilter, locationFilter, enqueueSnackbar, fetchTemplates]);

  // Delete saved template
  const confirmDeleteTemplate = useCallback(async () => {
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
  }, [deleteTemplateId, activePresetOrTemplateId, enqueueSnackbar, fetchTemplates]);

  // Export to Excel (.xlsx)
  const handleExportExcel = useCallback(() => {
    if (rows.length === 0) {
      enqueueSnackbar('Нет данных для выгрузки', { variant: 'warning' });
      return;
    }

    const headers = activeColumnsDef.map((c) => c.name);
    const exportData = sortedRows.map((r) => {
      const rowArr: any[] = [];
      activeColumnsDef.forEach((c) => {
        rowArr.push(r[c.key] ?? '—');
      });
      return rowArr;
    });

    const wsData = [headers, ...exportData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = activeColumnsDef.map((c, i) => {
      const maxContentLen = Math.max(
        c.name.length,
        ...exportData.slice(0, 50).map((row) => String(row[i] || '').length)
      );
      return { wch: Math.min(Math.max(maxContentLen + 3, 14), 50) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчет оборудования');

    const fileName = `EPS_Ведомость_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    enqueueSnackbar(`Отчет успешно экспортирован: ${fileName}`, { variant: 'success' });
  }, [rows, activeColumnsDef, sortedRows, enqueueSnackbar]);

  // Export to CSV
  const handleExportCsv = useCallback(() => {
    if (rows.length === 0) {
      enqueueSnackbar('Нет данных для выгрузки', { variant: 'warning' });
      return;
    }

    const headers = activeColumnsDef.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(';');
    const lines = sortedRows.map((r) => {
      return activeColumnsDef
        .map((c) => {
          const val = r[c.key] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(';');
    });

    const csvContent = '\uFEFF' + [headers, ...lines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EPS_Ведомость_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    enqueueSnackbar('CSV файл успешно выгружен', { variant: 'success' });
  }, [rows, activeColumnsDef, sortedRows, enqueueSnackbar]);

  // Export to JSON
  const handleExportJson = useCallback(() => {
    if (rows.length === 0) {
      enqueueSnackbar('Нет данных для выгрузки', { variant: 'warning' });
      return;
    }

    const exportRows = sortedRows.map((r) => {
      const obj: Record<string, any> = {};
      activeColumnsDef.forEach((c) => {
        obj[c.name] = r[c.key] ?? null;
      });
      return obj;
    });

    const jsonStr = JSON.stringify(exportRows, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EPS_Ведомость_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    enqueueSnackbar('JSON файл успешно выгружен', { variant: 'success' });
  }, [rows, sortedRows, activeColumnsDef, enqueueSnackbar]);

  return {
    availableColumns,
    selectedColumnKeys,
    columnBuilderOpen,
    searchQueryColumn,
    rows,
    sortedRows,
    paginatedRows,
    activeColumnsDef,
    loadingData,
    sortField,
    sortOrder,
    statusFilter,
    searchQuery,
    manufacturerFilter,
    locationFilter,
    dateFrom,
    dateTo,
    page,
    pageSize,
    templates,
    activePresetOrTemplateId,
    saveModalOpen,
    newTemplateName,
    newTemplateDesc,
    newTemplatePublic,
    savingTemplate,
    deleteTemplateId,
    setSelectedColumnKeys,
    setColumnBuilderOpen,
    setSearchQueryColumn,
    setSortField,
    setSortOrder,
    setStatusFilter,
    setSearchQuery,
    setManufacturerFilter,
    setLocationFilter,
    setDateFrom,
    setDateTo,
    setPage,
    setPageSize,
    setSaveModalOpen,
    setNewTemplateName,
    setNewTemplateDesc,
    setNewTemplatePublic,
    setDeleteTemplateId,
    generateReport,
    handleApplyPreset,
    handleApplyTemplate,
    handleSaveTemplate,
    confirmDeleteTemplate,
    handleExportExcel,
    handleExportCsv,
    handleExportJson,
  };
}
