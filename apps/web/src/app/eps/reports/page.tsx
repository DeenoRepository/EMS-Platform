'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Divider,
  Paper,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TableChartIcon from '@mui/icons-material/TableChart';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkOutlinedIcon from '@mui/icons-material/BookmarkOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DataObjectIcon from '@mui/icons-material/DataObject';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SpeedIcon from '@mui/icons-material/Speed';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import LayersIcon from '@mui/icons-material/Layers';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import * as XLSX from 'xlsx';
import {
  EmptyState,
  DataTableWrapper,
  StatusBadge,
  SearchInput,
  ExportButton,
  DatePickerField,
  ConfirmDialog,
  FormDialog,
  StatCard,
  FilterToolbar,
} from '@/components/ui';

interface ReportColumn {
  key: string;
  name: string;
  category: string;
  unit?: string | null;
}

interface SavedTemplate {
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

// Industry Standard Presets
const INDUSTRY_PRESETS = [
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
    name: 'Техсостояние и износ',
    columns: [
      'inventoryNumber',
      'name',
      'status',
      'criticality',
      'actual_wear_percentage',
      'is_critical_path',
      'is_imported',
      'maintenance_periodicity',
    ],
  },
  {
    id: 'mro_plans',
    name: 'Регламенты ТОиР и ППР',
    columns: [
      'inventoryNumber',
      'name',
      'location',
      'maintenance_periodicity',
      'maintenancePlansCount',
      'sparePartsCount',
      'documentsCount',
    ],
  },
];

export default function ReportBuilderPage() {
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

  // Delete template state
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // Fetch templates
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

  // Generate / fetch report dataset
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
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  // Group columns by category
  const columnsByCategory = useMemo(() => {
    const map: Record<string, ReportColumn[]> = {};
    availableColumns.forEach((col) => {
      const cat = col.category || 'Прочее';
      if (!map[cat]) map[cat] = [];
      map[cat].push(col);
    });
    return map;
  }, [availableColumns]);

  // Filter columns by column search query
  const filteredColumnsByCategory = useMemo(() => {
    if (!searchQueryColumn.trim()) return columnsByCategory;
    const query = searchQueryColumn.toLowerCase().trim();
    const result: Record<string, ReportColumn[]> = {};

    Object.entries(columnsByCategory).forEach(([category, cols]) => {
      const matched = cols.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.key.toLowerCase().includes(query) ||
          (c.unit && c.unit.toLowerCase().includes(query)) ||
          category.toLowerCase().includes(query)
      );
      if (matched.length > 0) {
        result[category] = matched;
      }
    });

    return result;
  }, [columnsByCategory, searchQueryColumn]);

  // Active columns definitions ordered by selectedColumnKeys
  const activeColumnsDef = useMemo(() => {
    const map = new Map(availableColumns.map((c) => [c.key, c]));
    return selectedColumnKeys
      .map((k) => map.get(k))
      .filter((c): c is ReportColumn => Boolean(c));
  }, [availableColumns, selectedColumnKeys]);

  // KPIs calculation
  const averageWear = useMemo(() => {
    const wearValues = rows
      .map((r) => {
        const val = r.actual_wear_percentage;
        if (!val || val === '—') return null;
        const num = parseFloat(String(val).replace('%', '').trim());
        return isNaN(num) ? null : num;
      })
      .filter((v): v is number => v !== null);

    if (wearValues.length === 0) return null;
    const sum = wearValues.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / wearValues.length);
  }, [rows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (statusFilter) count++;
    if (manufacturerFilter) count++;
    if (locationFilter) count++;
    if (dateFrom || dateTo) count++;
    return count;
  }, [searchQuery, statusFilter, manufacturerFilter, locationFilter, dateFrom, dateTo]);

  // Client-side sorting for instant feedback
  const sortedRows = useMemo(() => {
    if (!sortField) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      if (aVal === bVal) return 0;
      if (aVal === '—') return 1;
      if (bVal === '—') return -1;
      const comp = String(aVal).localeCompare(String(bVal), 'ru', { numeric: true });
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [rows, sortField, sortOrder]);

  // Paginated rows for preview
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  // Column reordering
  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const newKeys = [...selectedColumnKeys];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newKeys.length) return;
    const temp = newKeys[index];
    newKeys[index] = newKeys[targetIndex];
    newKeys[targetIndex] = temp;
    setSelectedColumnKeys(newKeys);
  };

  // Toggle single column
  const handleToggleColumn = (key: string) => {
    setSelectedColumnKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) {
          enqueueSnackbar('Необходимо оставить хотя бы одну колонку', { variant: 'warning' });
          return prev;
        }
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Toggle whole category
  const handleToggleCategory = (category: string) => {
    const catCols = columnsByCategory[category] || [];
    const catKeys = catCols.map((c) => c.key);
    const allSelected = catKeys.every((k) => selectedColumnKeys.includes(k));

    if (allSelected) {
      const remaining = selectedColumnKeys.filter((k) => !catKeys.includes(k));
      if (remaining.length === 0) {
        enqueueSnackbar('Необходимо оставить хотя бы одну колонку', { variant: 'warning' });
        return;
      }
      setSelectedColumnKeys(remaining);
    } else {
      const union = Array.from(new Set([...selectedColumnKeys, ...catKeys]));
      setSelectedColumnKeys(union);
    }
  };

  // Select all columns
  const handleSelectAllColumns = () => {
    setSelectedColumnKeys(availableColumns.map((c) => c.key));
    setActivePresetOrTemplateId('all');
  };

  // Reset filters
  const handleResetFilters = () => {
    setStatusFilter('');
    setSearchQuery('');
    setManufacturerFilter('');
    setLocationFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // Apply Industry Preset
  const handleApplyPreset = (preset: (typeof INDUSTRY_PRESETS)[0]) => {
    setActivePresetOrTemplateId(preset.id);
    setSelectedColumnKeys(preset.columns);
    enqueueSnackbar(`Применен пресет колонок: «${preset.name}»`, { variant: 'info' });
  };

  // Apply saved template
  const handleApplyTemplate = (tmpl: SavedTemplate) => {
    setActivePresetOrTemplateId(`tmpl_${tmpl.id}`);
    if (tmpl.config.selectedColumns && tmpl.config.selectedColumns.length > 0) {
      setSelectedColumnKeys(tmpl.config.selectedColumns);
    }
    if (tmpl.config.filters) {
      setStatusFilter(tmpl.config.filters.status || '');
      setSearchQuery(tmpl.config.filters.search || '');
      setManufacturerFilter(tmpl.config.filters.manufacturer || '');
      setLocationFilter(tmpl.config.filters.location || '');
      setDateFrom(tmpl.config.filters.commissionDateFrom || '');
      setDateTo(tmpl.config.filters.commissionDateTo || '');
    }
    enqueueSnackbar(`Применен шаблон: «${tmpl.name}»`, { variant: 'info' });
  };

  // Save new template
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
              status: statusFilter || undefined,
              search: searchQuery || undefined,
              manufacturer: manufacturerFilter || undefined,
              location: locationFilter || undefined,
              commissionDateFrom: dateFrom || undefined,
              commissionDateTo: dateTo || undefined,
            },
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        enqueueSnackbar('Шаблон отчета успешно сохранен', { variant: 'success' });
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
  };

  // Delete saved template
  const confirmDeleteTemplate = async () => {
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

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
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
  };

  // Export to CSV
  const handleExportCsv = () => {
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
  };

  // Export to JSON
  const handleExportJson = () => {
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
  };

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto', pb: 4 }}>
      {/* ─── Page Header ─── */}
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
                borderColor: 'grey.400',
                color: 'text.primary',
                '&:hover': { borderColor: 'text.disabled', backgroundColor: 'background.default' },
              }}
            >
              Конструктор колонок ({selectedColumnKeys.length})
            </Button>
            <ExportButton
              formats={['xlsx', 'csv']}
              variant="contained"
              color="primary"
              label="Экспорт"
              disabled={rows.length === 0}
              onExport={(fmt) => {
                if (fmt === 'xlsx') handleExportExcel();
                else if (fmt === 'csv') handleExportCsv();
              }}
            />
            <Button
              variant="text"
              startIcon={<DataObjectIcon />}
              onClick={handleExportJson}
              disabled={rows.length === 0}
              sx={{ fontWeight: 600, color: 'text.disabled' }}
            >
              JSON
            </Button>
          </Box>
        }
      />

      {/* ─── Top KPI Metric Overview Cards ─── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Строк в ведомости"
            value={rows.length}
            subtitle={activeFilterCount > 0 ? `Фильтров активно: ${activeFilterCount}` : 'Полная выборка'}
            icon={<PrecisionManufacturingIcon sx={{ fontSize: 22 }} />}
            accentColor="#0284c7"
            iconColor="#0284c7"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            loading={loadingData && rows.length === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Выбрано колонок"
            value={`${selectedColumnKeys.length} из ${availableColumns.length || 38}`}
            subtitle="Полей в формируемой таблице"
            icon={<LayersIcon sx={{ fontSize: 22 }} />}
            accentColor="#7c3aed"
            iconColor="#7c3aed"
            iconBgColor="rgba(124, 58, 237, 0.08)"
            onClick={() => setColumnBuilderOpen(true)}
            loading={loadingData && rows.length === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Средний износ"
            value={averageWear !== null ? `${averageWear}%` : '—'}
            subtitle="По отфильтрованному списку"
            icon={<SpeedIcon sx={{ fontSize: 22 }} />}
            accentColor={
              averageWear !== null && averageWear > 70
                ? '#ef4444'
                : averageWear !== null && averageWear > 30
                ? '#f59e0b'
                : '#10b981'
            }
            iconColor={
              averageWear !== null && averageWear > 70
                ? '#ef4444'
                : averageWear !== null && averageWear > 30
                ? '#f59e0b'
                : '#10b981'
            }
            iconBgColor={
              averageWear !== null && averageWear > 70
                ? 'error.light'
                : averageWear !== null && averageWear > 30
                ? 'warning.light'
                : 'success.light'
            }
            loading={loadingData && rows.length === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Шаблоны отчетов"
            value={templates.length + INDUSTRY_PRESETS.length}
            subtitle={`${INDUSTRY_PRESETS.length} системных, ${templates.length} пользовательских`}
            icon={<AssignmentTurnedInIcon sx={{ fontSize: 22 }} />}
            accentColor="#059669"
            iconColor="#059669"
            iconBgColor="rgba(5, 150, 105, 0.08)"
            loading={loadingData && rows.length === 0}
          />
        </Grid>
      </Grid>
      {/* ─── 100% Full-Width Report Preview Table with Standard FilterToolbar ─── */}
      <DataTableWrapper
        loading={loadingData}
        page={page - 1}
        pageSize={pageSize}
        total={sortedRows.length}
        onPageChange={(_, p) => setPage(p + 1)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        pageSizeOptions={[15, 25, 50, 100]}
        stickyHeader
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            actions={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 150,
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все статусы</MenuItem>
                  {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {info.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  size="small"
                  placeholder="Производитель..."
                  value={manufacturerFilter}
                  onChange={(e) => {
                    setManufacturerFilter(e.target.value);
                    setPage(1);
                  }}
                  sx={{
                    minWidth: 150,
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                    },
                  }}
                />

                <TextField
                  size="small"
                  placeholder="Локация (цех/склад)..."
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setPage(1);
                  }}
                  sx={{
                    minWidth: 150,
                    backgroundColor: 'background.paper',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      height: 36,
                      '& fieldset': { borderColor: 'divider' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                    },
                  }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DatePickerField
                    size="small"
                    placeholder="Ввод с"
                    value={dateFrom}
                    onChange={(val) => {
                      setDateFrom(val || '');
                      setPage(1);
                    }}
                    sx={{ width: 130 }}
                  />
                  <DatePickerField
                    size="small"
                    placeholder="по"
                    value={dateTo}
                    onChange={(val) => {
                      setDateTo(val || '');
                      setPage(1);
                    }}
                    sx={{ width: 130 }}
                  />
                </Box>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
              <SearchInput
                placeholder="Поиск по названию, инв. №, серийному №..."
                value={searchQuery}
                onSearch={(val) => {
                  setSearchQuery(val);
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
        }
        empty={sortedRows.length === 0 && !loadingData}
        emptyState={
          <EmptyState
            paper
            icon={<TableChartIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
            title="Нет записей для формирования ведомости"
            description="По заданным критериям фильтрации оборудование не найдено. Измените параметры поиска или сбросьте фильтры."
            actionText="Сбросить фильтры"
            onAction={handleResetFilters}
          />
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              <TableCell sx={{ fontWeight: 700, width: 56, fontSize: '0.6875rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                № П/П
              </TableCell>
              {activeColumnsDef.map((col) => (
                <TableCell
                  key={col.key}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    color: 'text.disabled',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <TableSortLabel
                    active={sortField === col.key}
                    direction={sortField === col.key ? sortOrder : 'asc'}
                    onClick={() => {
                      if (sortField === col.key) {
                        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField(col.key);
                        setSortOrder('asc');
                      }
                    }}
                  >
                    {col.name}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.map((row, idx) => (
              <TableRow key={row.id || idx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ color: 'text.disabled', fontSize: '0.75rem', fontWeight: 600 }}>
                  {(page - 1) * pageSize + idx + 1}
                </TableCell>
                {activeColumnsDef.map((col) => (
                  <TableCell key={col.key} sx={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                    {col.key === 'status' ? (
                      <StatusBadge status={row.status || 'ACTIVE'} />
                    ) : col.key === 'criticality' && row.criticality !== '—' ? (
                      <Chip
                        label={row.criticality}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.6875rem',
                          height: 22,
                          backgroundColor:
                            row.criticality.includes('A')
                              ? 'error.light'
                              : row.criticality.includes('B')
                              ? 'warning.light'
                              : '#e0f2fe',
                          color:
                            row.criticality.includes('A')
                              ? 'error.main'
                              : row.criticality.includes('B')
                              ? 'warning.main'
                              : 'primary.main',
                        }}
                      />
                    ) : col.key === 'actual_wear_percentage' && row.actual_wear_percentage !== '—' ? (
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          fontSize: '0.8125rem',
                          color:
                            parseFloat(row.actual_wear_percentage) > 70
                              ? 'error.main'
                              : parseFloat(row.actual_wear_percentage) > 30
                              ? 'warning.main'
                              : 'success.main',
                        }}
                      >
                        {row.actual_wear_percentage}
                      </Typography>
                    ) : (
                      row[col.key] ?? '—'
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* ─── Modal Column Matrix & Order Builder Dialog ─── */}
      <FormDialog
        open={columnBuilderOpen}
        onClose={() => setColumnBuilderOpen(false)}
        title="Конструктор колонок и состава ведомости"
        icon={<ViewColumnOutlinedIcon color="primary" />}
        maxWidth="md"
        submitLabel="Применить состав колонок"
        onSubmit={() => {
          setColumnBuilderOpen(false);
          enqueueSnackbar(`Выбрано ${selectedColumnKeys.length} колонок`, { variant: 'success' });
        }}
      >
        {/* Industry Presets inside Dialog */}
        <Box sx={{ mb: 2, pt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
            Готовые пресеты ведомостей:
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {INDUSTRY_PRESETS.map((preset) => (
              <Chip
                key={preset.id}
                label={preset.name}
                variant={activePresetOrTemplateId === preset.id ? 'filled' : 'outlined'}
                color={activePresetOrTemplateId === preset.id ? 'primary' : 'default'}
                onClick={() => handleApplyPreset(preset)}
                clickable
                size="small"
                sx={{ fontWeight: 600, borderRadius: '6px', fontSize: '0.75rem' }}
              />
            ))}
            <Chip
              label="Все параметры"
              variant={activePresetOrTemplateId === 'all' ? 'filled' : 'outlined'}
              color={activePresetOrTemplateId === 'all' ? 'primary' : 'default'}
              onClick={handleSelectAllColumns}
              clickable
              size="small"
              sx={{ fontWeight: 600, borderRadius: '6px', fontSize: '0.75rem' }}
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2.5}>
          {/* Left Column: Categorized Available Fields */}
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                Доступные характеристики ({availableColumns.length})
              </Typography>
              <Button size="small" onClick={handleSelectAllColumns} sx={{ fontSize: '0.75rem' }}>
                Выбрать все
              </Button>
            </Box>

            <Box sx={{ mb: 1.5 }}>
              <SearchInput
                size="small"
                fullWidth
                placeholder="Поиск характеристик..."
                value={searchQueryColumn}
                onSearch={(val) => setSearchQueryColumn(val)}
                delay={100}
              />
            </Box>

            <Box sx={{ maxHeight: 380, overflowY: 'auto', pr: 0.5 }}>
              {Object.entries(filteredColumnsByCategory).map(([category, cols]) => {
                const catKeys = cols.map((c) => c.key);
                const checkedCount = catKeys.filter((k) => selectedColumnKeys.includes(k)).length;
                const isAllChecked = checkedCount === catKeys.length;
                const isIndeterminate = checkedCount > 0 && checkedCount < catKeys.length;

                return (
                  <Accordion
                    key={category}
                    defaultExpanded={category === 'Основные реквизиты' || category === 'Классификаторы'}
                    expanded={searchQueryColumn.trim() ? true : undefined}
                    disableGutters
                    sx={{
                      mb: 1,
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px !important',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Checkbox
                            size="small"
                            checked={isAllChecked}
                            indeterminate={isIndeterminate}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCategory(category);
                            }}
                          />
                          <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                            {category}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${checkedCount}/${cols.length}`}
                          size="small"
                          color={checkedCount > 0 ? 'primary' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: '0.6875rem', height: 20 }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1, px: 2 }}>
                      <Grid container spacing={0.5}>
                        {cols.map((col) => (
                          <Grid item xs={12} key={col.key}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  size="small"
                                  checked={selectedColumnKeys.includes(col.key)}
                                  onChange={() => handleToggleColumn(col.key)}
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                                  {col.name}
                                </Typography>
                              }
                              sx={{ m: 0 }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          </Grid>

          {/* Right Column: Ordered Selected Columns */}
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                Порядок колонок в отчете ({selectedColumnKeys.length})
              </Typography>
              <Button
                size="small"
                color="error"
                onClick={() => setSelectedColumnKeys(['inventoryNumber', 'name'])}
                sx={{ fontSize: '0.75rem' }}
              >
                Сброс
              </Button>
            </Box>

            <Paper
              variant="outlined"
              sx={{
                maxHeight: 430,
                overflowY: 'auto',
                p: 0.5,
                backgroundColor: 'background.default',
                borderRadius: '8px',
              }}
            >
              <List dense sx={{ p: 0 }}>
                {activeColumnsDef.map((col, index) => (
                  <ListItem
                    key={col.key}
                    sx={{
                      backgroundColor: 'background.paper',
                      mb: 0.75,
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      py: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ width: 22, color: 'text.disabled', fontWeight: 700 }}
                    >
                      {index + 1}.
                    </Typography>
                    <ListItemText
                      primary={col.name}
                      primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 600, noWrap: true }}
                      secondary={col.category}
                      secondaryTypographyProps={{ fontSize: '0.6875rem' }}
                    />
                    <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <IconButton
                        size="small"
                        disabled={index === 0}
                        onClick={() => handleMoveColumn(index, 'up')}
                        title="Поднять выше"
                        sx={{ p: 0.25 }}
                      >
                        <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={index === activeColumnsDef.length - 1}
                        onClick={() => handleMoveColumn(index, 'down')}
                        title="Опустить ниже"
                        sx={{ p: 0.25 }}
                      >
                        <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleToggleColumn(col.key)}
                        title="Удалить из отчета"
                        sx={{ p: 0.25 }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </FormDialog>

      {/* ─── Save Template Modal Dialog ─── */}
      <FormDialog
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Сохранение шаблона ведомости"
        icon={<BookmarkAddOutlinedIcon color="primary" />}
        maxWidth="sm"
        loading={savingTemplate}
        submitLabel={savingTemplate ? 'Сохранение...' : 'Сохранить шаблон'}
        onSubmit={handleSaveTemplate}
        submitDisabled={!newTemplateName.trim() || savingTemplate}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Название шаблона *"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            fullWidth
            size="small"
            placeholder="Например: Инвентаризационная ведомость цеха №1"
          />
          <TextField
            label="Описание шаблона"
            value={newTemplateDesc}
            onChange={(e) => setNewTemplateDesc(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
            placeholder="Краткое назначение отчета..."
          />
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default', borderRadius: '8px' }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              В шаблон будут сохранены:
            </Typography>
            <Typography variant="body2" fontWeight={600} color="#0f172a">
              • Выбранные колонки ({selectedColumnKeys.length} шт.) в текущем порядке
            </Typography>
            <Typography variant="body2" fontWeight={600} color="#0f172a">
              • Текущие параметры фильтрации ({activeFilterCount > 0 ? `${activeFilterCount} акт.` : 'без фильтров'})
            </Typography>
          </Paper>
          <FormControlLabel
            control={
              <Checkbox
                checked={newTemplatePublic}
                onChange={(e) => setNewTemplatePublic(e.target.checked)}
              />
            }
            label="Сделать шаблон общедоступным для всех инженеров"
          />
        </Box>
      </FormDialog>

      {/* ─── Confirm Delete Template Dialog ─── */}
      <ConfirmDialog
        open={Boolean(deleteTemplateId)}
        title="Удаление шаблона отчета"
        message="Вы уверены, что хотите удалить этот сохраненный шаблон отчета?"
        variant="danger"
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDeleteTemplate}
        onClose={() => setDeleteTemplateId(null)}
      />
    </Box>
  );
}
