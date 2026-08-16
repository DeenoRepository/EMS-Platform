'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
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
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Tooltip,
  Divider,
  Paper,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Badge,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import TableChartIcon from '@mui/icons-material/TableChart';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkOutlinedIcon from '@mui/icons-material/BookmarkOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DataObjectIcon from '@mui/icons-material/DataObject';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import * as XLSX from 'xlsx';

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

export default function ReportBuilderPage() {
  const { enqueueSnackbar } = useSnackbar();

  // Columns & Data state
  const [availableColumns, setAvailableColumns] = useState<ReportColumn[]>([]);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([
    'name',
    'inventoryNumber',
    'serialNumber',
    'manufacturer',
    'model',
    'location',
    'status',
    'commissionDate',
  ]);
  const [searchQueryColumn, setSearchQueryColumn] = useState('');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination state for preview
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Templates state
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Save template modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplatePublic, setNewTemplatePublic] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/eps/reports/templates');
      const json = await res.json();
      if (json.success && json.data) {
        setTemplates(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTemplates(false);
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
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAvailableColumns(json.data.availableColumns);
        setRows(json.data.rows);
        setTotalCount(json.data.total);
        setPage(1);
      } else {
        enqueueSnackbar(json.error || 'Ошибка загрузки данных отчета', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка формирования отчета', { variant: 'error' });
    } finally {
      setLoadingData(false);
    }
  }, [selectedColumnKeys, statusFilter, searchQuery, manufacturerFilter, locationFilter, dateFrom, dateTo, enqueueSnackbar]);

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
  };

  // Reset to default columns
  const handleResetColumns = () => {
    setSelectedColumnKeys([
      'name',
      'inventoryNumber',
      'serialNumber',
      'manufacturer',
      'model',
      'location',
      'status',
      'commissionDate',
    ]);
  };

  // Apply saved template
  const handleApplyTemplate = (tmpl: SavedTemplate) => {
    setActiveTemplateId(tmpl.id);
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
  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Вы уверены, что хотите удалить этот шаблон отчета?')) return;

    try {
      const res = await fetch(`/api/eps/reports/templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        enqueueSnackbar('Шаблон отчета удален', { variant: 'info' });
        if (activeTemplateId === id) setActiveTemplateId(null);
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

    const selectedColsDef = availableColumns.filter((c) => selectedColumnKeys.includes(c.key));

    const headers = selectedColsDef.map((c) => c.name);
    const exportData = rows.map((r) => {
      const rowArr: any[] = [];
      selectedColsDef.forEach((c) => {
        rowArr.push(r[c.key] ?? '—');
      });
      return rowArr;
    });

    const wsData = [headers, ...exportData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Dynamic column widths
    ws['!cols'] = selectedColsDef.map((c, i) => {
      const maxContentLen = Math.max(
        c.name.length,
        ...exportData.slice(0, 30).map((row) => String(row[i] || '').length)
      );
      return { wch: Math.min(Math.max(maxContentLen + 3, 14), 50) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчет оборудования');

    const fileName = `EPS_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    enqueueSnackbar(`Отчет успешно экспортирован: ${fileName}`, { variant: 'success' });
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (rows.length === 0) {
      enqueueSnackbar('Нет данных для выгрузки', { variant: 'warning' });
      return;
    }

    const selectedColsDef = availableColumns.filter((c) => selectedColumnKeys.includes(c.key));
    const headers = selectedColsDef.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(';');
    const lines = rows.map((r) => {
      return selectedColsDef
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
    link.download = `EPS_Report_${new Date().toISOString().slice(0, 10)}.csv`;
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

    const selectedColsDef = availableColumns.filter((c) => selectedColumnKeys.includes(c.key));
    const exportRows = rows.map((r) => {
      const obj: Record<string, any> = {};
      selectedColsDef.forEach((c) => {
        obj[c.name] = r[c.key] ?? null;
      });
      return obj;
    });

    const jsonStr = JSON.stringify(exportRows, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EPS_Report_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    enqueueSnackbar('JSON файл успешно выгружен', { variant: 'success' });
  };

  // Visible columns definitions for table header
  const activeColumnsDef = useMemo(() => {
    return availableColumns.filter((c) => selectedColumnKeys.includes(c.key));
  }, [availableColumns, selectedColumnKeys]);

  // Paginated rows for preview
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title="EPS — Конструктор отчетов оборудования"
        subtitle="Интерактивный конструктор выборок данных, характеристик и сводных ведомостей с экспортом в Excel, CSV и JSON"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Конструктор отчетов' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<BookmarkAddOutlinedIcon />}
              onClick={() => setSaveModalOpen(true)}
              sx={{ fontWeight: 600 }}
            >
              Сохранить шаблон
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              sx={{ fontWeight: 600 }}
            >
              Экспорт в Excel (.xlsx)
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCsv}
              sx={{ fontWeight: 600 }}
            >
              CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<DataObjectIcon />}
              onClick={handleExportJson}
              sx={{ fontWeight: 600 }}
            >
              JSON
            </Button>
          </Box>
        }
      />

      {/* Saved Presets / Templates Quick Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: '#f8fafc', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookmarkOutlinedIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700}>
              Готовые шаблоны отчетов:
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label="Стандартный паспорт"
              variant={activeTemplateId === null ? 'filled' : 'outlined'}
              color={activeTemplateId === null ? 'primary' : 'default'}
              onClick={handleResetColumns}
              clickable
              size="small"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label="Все характеристики (Полный отчет)"
              variant="outlined"
              onClick={handleSelectAllColumns}
              clickable
              size="small"
              sx={{ fontWeight: 600 }}
            />
            {templates.map((tmpl) => (
              <Chip
                key={tmpl.id}
                label={`${tmpl.name} (${tmpl.createdBy?.displayName || 'Система'})`}
                variant={activeTemplateId === tmpl.id ? 'filled' : 'outlined'}
                color={activeTemplateId === tmpl.id ? 'primary' : 'default'}
                onClick={() => handleApplyTemplate(tmpl)}
                onDelete={(e) => handleDeleteTemplate(tmpl.id, e)}
                clickable
                size="small"
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column: Column Picker & Filter Drawer */}
        <Grid item xs={12} lg={4}>
          {/* Column Selector Accordions */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ViewColumnOutlinedIcon color="primary" sx={{ fontSize: 22 }} />
                  <Typography variant="h6" fontWeight={700}>
                    Состав колонок ({selectedColumnKeys.length})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" onClick={handleSelectAllColumns}>
                    Все
                  </Button>
                  <Button size="small" color="inherit" onClick={handleResetColumns}>
                    Сброс
                  </Button>
                </Box>
              </Box>

              {/* Instant Column Search Filter */}
              <TextField
                size="small"
                fullWidth
                placeholder="Поиск по колонкам и параметрам..."
                value={searchQueryColumn}
                onChange={(e) => setSearchQueryColumn(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQueryColumn ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQueryColumn('')}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ mb: 2 }}
              />

              <Typography variant="caption" color="text.secondary" paragraph>
                Отметьте необходимые поля и разделы характеристик для включения в отчет
              </Typography>

              <Divider sx={{ mb: 2 }} />

              {Object.entries(filteredColumnsByCategory).map(([category, cols]) => {
                const catKeys = cols.map((c) => c.key);
                const checkedCount = catKeys.filter((k) => selectedColumnKeys.includes(k)).length;
                const isAllChecked = checkedCount === catKeys.length;
                const isIndeterminate = checkedCount > 0 && checkedCount < catKeys.length;

                return (
                  <Accordion
                    key={category}
                    defaultExpanded={category === 'Основные реквизиты'}
                    expanded={searchQueryColumn.trim() ? true : undefined}
                    disableGutters
                    sx={{ mb: 1, border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
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
                          <Typography variant="subtitle2" fontWeight={700}>
                            {category}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${checkedCount} / ${cols.length}`}
                          size="small"
                          color={checkedCount > 0 ? 'primary' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 2 }}>
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
            </CardContent>
          </Card>

          {/* Filter Panel */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FilterAltOutlinedIcon color="primary" sx={{ fontSize: 22 }} />
                <Typography variant="h6" fontWeight={700}>
                  Фильтры выборки
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Поиск по названию / номерам"
                  size="small"
                  fullWidth
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Насос, INV-..., SN-..."
                />

                <TextField
                  select
                  label="Рабочий статус"
                  size="small"
                  fullWidth
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">Все статусы</MenuItem>
                  {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                    <MenuItem key={key} value={key}>
                      {info.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Производитель"
                  size="small"
                  fullWidth
                  value={manufacturerFilter}
                  onChange={(e) => setManufacturerFilter(e.target.value)}
                  placeholder="Например: Ливгидромаш"
                />

                <TextField
                  label="Место установки (Локация)"
                  size="small"
                  fullWidth
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Цех №1, Склад..."
                />

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField
                    label="Ввод в эксплуатацию с"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <TextField
                    label="по"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={generateReport}
                    startIcon={<RefreshIcon />}
                    sx={{ fontWeight: 600 }}
                  >
                    Применить
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      setStatusFilter('');
                      setSearchQuery('');
                      setManufacturerFilter('');
                      setLocationFilter('');
                      setDateFrom('');
                      setDateTo('');
                    }}
                  >
                    Сбросить
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Live Data Preview Table */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TableChartIcon color="primary" sx={{ fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={700}>
                    Предпросмотр таблицы отчета
                  </Typography>
                  <Chip
                    label={`Всего записей: ${totalCount}`}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Отображаются {activeColumnsDef.length} выбранных колонок
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {loadingData ? (
                <Box sx={{ p: 8, textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress />
                </Box>
              ) : rows.length === 0 ? (
                <Box sx={{ p: 8, textAlign: 'center', color: 'text.secondary', flex: 1 }}>
                  <TableChartIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                  <Typography variant="body2">Нет записей, соответствующих выбранным фильтрам</Typography>
                </Box>
              ) : (
                <>
                  <TableContainer sx={{ flex: 1, maxHeight: 650, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: '#f1f5f9', width: 48 }}>
                            №
                          </TableCell>
                          {activeColumnsDef.map((col) => (
                            <TableCell
                              key={col.key}
                              sx={{
                                fontWeight: 700,
                                backgroundColor: '#f1f5f9',
                                whiteSpace: 'nowrap',
                                fontSize: '0.8125rem',
                              }}
                            >
                              {col.name}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedRows.map((row, idx) => (
                          <TableRow key={row.id || idx} hover>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                              {(page - 1) * pageSize + idx + 1}
                            </TableCell>
                            {activeColumnsDef.map((col) => (
                              <TableCell key={col.key} sx={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                {col.key === 'status' ? (
                                  <Chip
                                    label={row.status}
                                    size="small"
                                    color={
                                      row.status === 'В работе'
                                        ? 'success'
                                        : row.status === 'На ремонте'
                                        ? 'warning'
                                        : 'default'
                                    }
                                    sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                                  />
                                ) : (
                                  row[col.key] ?? '—'
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Pagination */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Показано {Math.min(rows.length, (page - 1) * pageSize + 1)}–{Math.min(rows.length, page * pageSize)} из {totalCount}
                    </Typography>
                    <Pagination
                      count={Math.ceil(rows.length / pageSize)}
                      page={page}
                      onChange={(_, p) => setPage(p)}
                      color="primary"
                      size="small"
                    />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Template Dialog */}
      <Dialog open={saveModalOpen} onClose={() => setSaveModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Сохранение шаблона отчета</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Название шаблона *"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              fullWidth
              size="small"
              placeholder="Например: Инвентаризационная ведомость электроцеха"
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
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f8fafc' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                В шаблон будут сохранены:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                • Выбранные колонки ({selectedColumnKeys.length} шт.)
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                • Текущие параметры фильтрации
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveModalOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={!newTemplateName.trim() || savingTemplate}
          >
            {savingTemplate ? <CircularProgress size={20} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
