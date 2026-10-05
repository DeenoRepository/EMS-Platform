'use client';

import React, { useState, useRef, useMemo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Divider,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Autocomplete,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import {
  DataTableWrapper,
  StatusBadge,
  FileUploadDropzone,
  CriticalAlertBanner,
  ConfirmDialog,
} from '@/components/ui';

export interface MissingFieldItem {
  header: string;
  suggestedName: string;
  suggestedKey: string;
  suggestedType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  suggestedUnit: string | null;
  sampleValues: any[];
}

export interface MissingFieldResolution {
  header: string;
  action: 'CREATE' | 'MAP_EXISTING' | 'IGNORE';
  mappedExistingKey?: string;
  name: string;
  key: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT';
  unit: string;
  sectionId: string;
}

export interface ValidatedRow {
  rowIndex: number;
  status: 'NEW' | 'COLLISION' | 'ERROR';
  statusMessage: string;
  existingMatch?: { id: string; name: string; inventoryNumber?: string; status: string };
  data: Record<string, any>;
}

const STEPS = [
  'Загрузка файла',
  'Сопоставление колонок и недостающие поля',
  'Проверка коллизий и предпросмотр',
  'Результаты импорта',
];

const BASE_SYSTEM_FIELDS = [
  { key: 'name', name: 'Наименование оборудования', unit: null, isRequired: true, group: 'Основные реквизиты' },
  { key: 'inventoryNumber', name: 'Инвентарный номер', unit: null, isRequired: false, group: 'Основные реквизиты' },
  { key: 'serialNumber', name: 'Заводской / Серийный номер', unit: null, isRequired: false, group: 'Основные реквизиты' },
  { key: 'manufacturer', name: 'Предприятие-изготовитель', unit: null, isRequired: false, group: 'Основные реквизиты' },
  { key: 'model', name: 'Модель / Типоразмер', unit: null, isRequired: false, group: 'Основные реквизиты' },
  { key: 'location', name: 'Место установки (локация)', unit: null, isRequired: false, group: 'Основные реквизиты' },
  { key: 'status', name: 'Эксплуатационный статус', unit: null, isRequired: false, group: 'Основные реквизиты' },
  { key: 'commissionDate', name: 'Дата ввода в эксплуатацию', unit: null, isRequired: false, group: 'Основные реквизиты' },
  { key: 'externalId', name: 'Внутренний ID / 1C ERP', unit: null, isRequired: false, group: 'Основные реквизиты' },
];

export function SmartImportWizard() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [activeStep, setActiveStep] = useState(0);

  // Step 1: Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Step 2: Mapping & Missing fields state
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [primaryKeyHeader, setPrimaryKeyHeader] = useState<string>('');
  const [nameHeader, setNameHeader] = useState<string>('');
  const [missingFields, setMissingFields] = useState<MissingFieldItem[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, MissingFieldResolution>>({});
  const [availableSections, setAvailableSections] = useState<{ id: string; name: string }[]>([]);
  const [catalogFields, setCatalogFields] = useState<{ key: string; name: string; unit?: string | null; section?: { name: string } | null }[]>([]);

  const allAvailableTargetFields = useMemo(() => {
    const list: Array<{
      key: string;
      name: string;
      unit: string | null;
      isRequired: boolean;
      group: string;
    }> = [...BASE_SYSTEM_FIELDS];

    catalogFields.forEach((cf) => {
      if (!list.some((item) => item.key === cf.key)) {
        list.push({
          key: cf.key,
          name: cf.name,
          unit: cf.unit || null,
          isRequired: false,
          group: cf.section?.name ? `Раздел: ${cf.section.name}` : 'Справочник полей',
        });
      }
    });

    return list;
  }, [catalogFields]);

  // Step 3: Conflict strategy & rows state
  const [conflictStrategy, setConflictStrategy] = useState<'UPSERT' | 'SKIP' | 'FULL_REPLACE'>('UPSERT');
  const [fullReplaceDialogOpen, setFullReplaceDialogOpen] = useState(false);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'NEW' | 'COLLISION' | 'ERROR'>('ALL');
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [collisionCount, setCollisionCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [duplicateExternalIds, setDuplicateExternalIds] = useState<{ id: string; count: number }[]>([]);
  const [executingImport, setExecutingImport] = useState(false);

  // Step 4: Results state
  const [importResults, setImportResults] = useState<{
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errorCount: number;
    newCustomFieldsCreated: number;
    errors: { row: number; error: string }[];
  } | null>(null);

  // Download Sample Template
  const handleDownloadTemplate = () => {
    window.open('/api/eps/import/template', '_blank');
  };

  // Step 1: Analyze File
  const handleAnalyzeFile = async () => {
    if (!selectedFile) {
      enqueueSnackbar('Пожалуйста, выберите файл для импорта', { variant: 'warning' });
      return;
    }

    setAnalyzing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/eps/import/analyze', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data) {
        setFileHeaders(json.data.fileHeaders);
        setColumnMapping(json.data.mappedColumns || {});
        // Auto-detect primary key column
        const foundPk = (json.data.fileHeaders || []).find((h: string) => {
          const l = h.toLowerCase();
          return l.includes('инв') || l.includes('id') || l.includes('идентифик') || l.includes('серийн') || l.includes('номер');
        }) || (json.data.fileHeaders?.[0] || '');
        setPrimaryKeyHeader(foundPk);

        // Auto-detect equipment name column
        const foundName = (json.data.fileHeaders || []).find((h: string) => {
          const l = h.toLowerCase();
          return l.includes('наименование') || l.includes('название') || l.includes('оборудование') || l.includes('name') || l.includes('title');
        }) || (json.data.fileHeaders?.[1] || json.data.fileHeaders?.[0] || '');
        setNameHeader(foundName);
        if (foundName) {
          json.data.mappedColumns = json.data.mappedColumns || {};
          json.data.mappedColumns[foundName] = 'name';
        }
        setMissingFields(json.data.missingFields || []);
        setAvailableSections(json.data.availableSections || []);
        if (json.data.catalogFields) {
          setCatalogFields(json.data.catalogFields);
        } else {
          // Fallback fetch catalog fields if not provided in analyze
          fetch('/api/eps/custom-fields')
            .then((r) => r.json())
            .then((cfJson) => {
              if (cfJson.success && cfJson.data) setCatalogFields(cfJson.data);
            })
            .catch(() => {});
        }
        setValidatedRows(json.data.allRows || []);
        setTotalRowsCount(json.data.totalRows);
        setNewCount(json.data.newCount);
        setCollisionCount(json.data.collisionCount);
        setErrorCount(json.data.errorCount);
        setDuplicateExternalIds(json.data.duplicateExternalIds || []);

        const initialResolutions: Record<string, MissingFieldResolution> = {};
        (json.data.missingFields || []).forEach((mf: any) => {
          initialResolutions[mf.header] = {
            header: mf.header,
            action: 'CREATE',
            name: mf.suggestedName,
            key: mf.suggestedKey,
            fieldType: mf.suggestedType,
            unit: mf.suggestedUnit || '',
            sectionId: mf.sectionId || '',
            ...(mf.suggestedSectionName ? { sectionName: mf.suggestedSectionName } : {}),
            ...(mf.suggestedSectionCode ? { sectionCode: mf.suggestedSectionCode } : {}),
          } as any;
        });
        setResolutions(initialResolutions);

        setActiveStep(1);
        enqueueSnackbar('Файл успешно проанализирован', { variant: 'success' });
      } else {
        enqueueSnackbar(json.error || 'Ошибка анализа файла', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка при загрузке файла', { variant: 'error' });
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 2: Handle resolution update
  const handleUpdateResolution = (header: string, updates: Partial<MissingFieldResolution>) => {
    setResolutions((prev) => ({
      ...prev,
      [header]: {
        ...prev[header],
        ...updates,
      },
    }));
  };

  // Step 2 -> Step 3
  const handleProceedToCollisions = () => {
    if (!primaryKeyHeader) {
      enqueueSnackbar('Пожалуйста, укажите колонку уникального ID оборудования', { variant: 'warning' });
      return;
    }
    let effectiveName = nameHeader;
    if (!effectiveName) {
      effectiveName = Object.keys(columnMapping).find((h) => columnMapping[h] === 'name') ||
        Object.keys(resolutions).find((h) => resolutions[h]?.mappedExistingKey === 'name') || '';
      if (effectiveName) setNameHeader(effectiveName);
    }
    if (!effectiveName) {
      enqueueSnackbar('Пожалуйста, укажите колонку с наименованием оборудования', { variant: 'warning' });
      return;
    }
    const updatedMapping = { ...columnMapping };
    Object.entries(resolutions).forEach(([header, res]) => {
      if (res.action === 'CREATE') {
        updatedMapping[header] = `custom_${res.key}`;
      } else if (res.action === 'MAP_EXISTING' && res.mappedExistingKey) {
        updatedMapping[header] = res.mappedExistingKey.startsWith('custom_') || [
          'name', 'inventoryNumber', 'serialNumber', 'manufacturer', 'model', 'location', 'status', 'commissionDate', 'externalId'
        ].includes(res.mappedExistingKey)
          ? res.mappedExistingKey
          : `custom_${res.mappedExistingKey}`;
      } else {
        delete updatedMapping[header];
      }
    });

    // Recalculate duplicate external IDs based on the user-selected primary key column
    const idCounts = new Map<string, number>();
    validatedRows.forEach((row) => {
      const rowData = row.data || row;
      const rawId = String(rowData[primaryKeyHeader] || '').trim();
      if (rawId) {
        idCounts.set(rawId, (idCounts.get(rawId) || 0) + 1);
      }
    });
    const dupes = Array.from(idCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));
    setDuplicateExternalIds(dupes);

    setColumnMapping(updatedMapping);
    setActiveStep(2);
  };

  // Step 3: Execute Import
  const handleExecuteImport = async (confirmedFullReplace = false) => {
    if (conflictStrategy === 'FULL_REPLACE' && duplicateExternalIds.length > 0) {
      enqueueSnackbar('В файле есть повторяющиеся ID оборудования', { variant: 'error' });
      return;
    }
    if (conflictStrategy === 'FULL_REPLACE' && !confirmedFullReplace) {
      setFullReplaceDialogOpen(true);
      return;
    }
    setExecutingImport(true);

    const newFieldDefs = Object.values(resolutions)
      .filter((r) => r.action === 'CREATE')
      .map((r: any) => ({
        header: r.header,
        key: r.key,
        name: r.name,
        fieldType: r.fieldType,
        unit: r.unit || undefined,
        sectionId: r.sectionId || undefined,
        sectionName: r.sectionName || undefined,
        sectionCode: r.sectionCode || undefined,
      }));

    const ignoredHeaders = Object.values(resolutions)
      .filter((r) => r.action === 'IGNORE')
      .map((r) => r.header);

    // Ensure final mapping includes all MAP_EXISTING choices
    const finalMapping = { ...columnMapping };
    Object.entries(resolutions).forEach(([header, res]) => {
      if (res.action === 'CREATE') {
        finalMapping[header] = `custom_${res.key}`;
      } else if (res.action === 'MAP_EXISTING' && res.mappedExistingKey) {
        finalMapping[header] = res.mappedExistingKey.startsWith('custom_') || [
          'name', 'inventoryNumber', 'serialNumber', 'manufacturer', 'model', 'location', 'status', 'commissionDate', 'externalId'
        ].includes(res.mappedExistingKey)
          ? res.mappedExistingKey
          : `custom_${res.mappedExistingKey}`;
      } else if (res.action === 'IGNORE') {
        delete finalMapping[header];
      }
    });

    try {
      const res = await fetch('/api/eps/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validatedRows,
          columnMapping: finalMapping,
          newFieldDefinitions: newFieldDefs,
          ignoredHeaders,
          conflictStrategy,
          fullReplaceConfirmed: confirmedFullReplace,
          primaryKeyHeader,
          nameHeader,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setImportResults(json.data);
        setActiveStep(3);
        enqueueSnackbar('Импорт данных успешно завершен!', { variant: 'success' });
      } else {
        enqueueSnackbar(json.error || 'Ошибка выполнения импорта', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Сетевая ошибка выполнения импорта', { variant: 'error' });
    } finally {
      setExecutingImport(false);
    }
  };

  const filteredPreviewRows = validatedRows.filter((r) => {
    if (previewFilter === 'ALL') return true;
    return r.status === previewFilter;
  });

  return (
    <Box>
      {/* Stepper Card */}
      <Card sx={{ mb: 3, borderRadius: '12px' }}>
        <CardContent sx={{ py: 2.5 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label, idx) => (
              <Step key={label} completed={activeStep > idx}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* ─── STEP 0: Загрузка файла ─── */}
      {activeStep === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%', borderRadius: '12px' }}>
              <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ width: '100%' }}>
                  <FileUploadDropzone
                    accept=".xlsx,.xls,.csv"
                    files={selectedFile ? [selectedFile] : []}
                    onChange={(files) => setSelectedFile(files[0] || null)}
                    title="Выберите или перетащите файл реестра оборудования"
                    description="Поддерживаются книги Excel (.xlsx, .xls) и таблицы CSV (до 15 МБ)"
                  />
                </Box>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    size="large"
                    disabled={!selectedFile || analyzing}
                    onClick={handleAnalyzeFile}
                    endIcon={analyzing ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
                    sx={{ px: 4, py: 1.2, fontWeight: 700 }}
                  >
                    {analyzing ? 'Анализ структуры...' : 'Анализировать структуру файла'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: '12px' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Эталонный шаблон
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Скачайте подготовленный файл с актуальным перечнем колонок и пользовательских полей вашего предприятия:
                </Typography>

                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<FileDownloadIcon />}
                  onClick={handleDownloadTemplate}
                  sx={{ py: 1.5, mb: 3, fontWeight: 600, borderRadius: '8px' }}
                >
                  Скачать шаблон Excel (.xlsx)
                </Button>

                <Divider sx={{ mb: 2.5 }} />

                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Особенности умного импорта:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 18, mt: 0.2 }} />
                    <Typography variant="caption">
                      <strong>Авто-определение полей:</strong> распознаются русские и английские названия колонок.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 18, mt: 0.2 }} />
                    <Typography variant="caption">
                      <strong>Новые характеристики:</strong> неизвестные колонки можно в 1 клик добавить в справочник.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 18, mt: 0.2 }} />
                    <Typography variant="caption">
                      <strong>Защита от дублей:</strong> система сверит инвентарные номера с БД и предложит обновить или пропустить.
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ─── STEP 1: Сопоставление колонок и недостающие поля ─── */}
      {/* ─── STEP 1: Ручное сопоставление колонок файла с полями справочника ─── */}
      {activeStep === 1 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <CriticalAlertBanner
              alerts={[
                {
                  id: 'mapping-guide-alert',
                  severity: 'INFO',
                  title: `Колонок в загруженном файле: ${fileHeaders.length}`,
                  description:
                    'Назначьте для каждой колонки файла соответствующее поле из справочника характеристик оборудования или выберите действие (создать новое поле или игнорировать колонку).',
                },
              ]}
            />
          </Box>

          {/* Primary Key & Equipment Name Selection Card */}
          <Card sx={{ mb: 3, borderRadius: '12px', border: '1px solid #0284c7', bgcolor: 'rgba(2, 132, 199, 0.02)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
                Ключевые колонки идентификации оборудования
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Укажите ключевые колонки файла для уникального ID и наименования. По уникальному ID отслеживаются коллизии и дубликаты, а наименование является обязательным реквизитом карточки паспорта.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label="Уникальный ID оборудования *"
                    value={primaryKeyHeader}
                    onChange={(e) => setPrimaryKeyHeader(e.target.value)}
                    helperText={primaryKeyHeader ? `Выбрана колонка: «${primaryKeyHeader}»` : 'Обязательно выберите колонку уникального ID'}
                    error={!primaryKeyHeader}
                  >
                    {fileHeaders.map((header) => (
                      <MenuItem key={header} value={header}>
                        {header}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label="Наименование оборудования *"
                    value={nameHeader}
                    onChange={(e) => {
                      const newNameHeader = e.target.value;
                      setNameHeader(newNameHeader);
                      if (newNameHeader) {
                        setColumnMapping((prev) => ({
                          ...prev,
                          [newNameHeader]: 'name',
                        }));
                        handleUpdateResolution(newNameHeader, {
                          action: 'MAP_EXISTING',
                          mappedExistingKey: 'name',
                          name: 'Наименование оборудования',
                          key: 'name',
                        });
                      }
                    }}
                    helperText={nameHeader ? `Выбрана колонка: «${nameHeader}»` : 'Обязательно выберите колонку наименования'}
                    error={!nameHeader}
                  >
                    {fileHeaders.map((header) => (
                      <MenuItem key={header} value={header}>
                        {header}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Table: Full manual column mapping */}
          <Card sx={{ mb: 3, borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Сопоставление колонок файла со справочником
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Выберите поле из справочника оборудования для каждой колонки файла
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const cleared: Record<string, string> = {};
                    setColumnMapping(cleared);
                    const resetRes: Record<string, MissingFieldResolution> = {};
                    fileHeaders.forEach((h) => {
                      resetRes[h] = {
                        header: h,
                        action: 'IGNORE',
                        name: h,
                        key: h.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                        fieldType: 'TEXT',
                        unit: '',
                        sectionId: '',
                      };
                    });
                    setResolutions(resetRes);
                  }}
                >
                  Сбросить все назначения
                </Button>
              </Box>

              <DataTableWrapper total={fileHeaders.length} stickyHeader>
                <Table size="small" aria-label="Таблица сопоставления колонок">
                  <TableHead sx={{ backgroundColor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: '25%' }}>Колонка в файле</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '20%' }}>Примеры значений</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '25%' }}>Действие</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '30%' }}>Целевое поле в EMS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fileHeaders.map((header) => {
                      const res = resolutions[header] || {
                        header,
                        action: columnMapping[header] ? 'MAP_EXISTING' : 'IGNORE',
                        mappedExistingKey: columnMapping[header] || '',
                        name: header,
                        key: header.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                        fieldType: 'TEXT',
                        unit: '',
                        sectionId: '',
                      };

                      // Get sample values for this column from validatedRows
                      const sampleVals = validatedRows
                        .slice(0, 3)
                        .map((r) => r.data?.[header])
                        .filter((v) => v !== undefined && v !== null && v !== '')
                        .slice(0, 2);

                      return (
                        <TableRow key={header} hover>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                            «{header}»
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                            {sampleVals.length > 0 ? sampleVals.join(', ') : '—'}
                          </TableCell>
                          <TableCell>
                            <FormControl component="fieldset">
                              <RadioGroup
                                row
                                value={res.action}
                                onChange={(e) => {
                                  const act = e.target.value as any;
                                  handleUpdateResolution(header, { action: act });
                                  if (act === 'IGNORE') {
                                    setColumnMapping((prev) => {
                                      const next = { ...prev };
                                      delete next[header];
                                      return next;
                                    });
                                  }
                                }}
                              >
                                <FormControlLabel value="MAP_EXISTING" control={<Radio size="small" />} label="Из справочника" />
                                <FormControlLabel value="CREATE" control={<Radio size="small" />} label="Новое" />
                                <FormControlLabel value="IGNORE" control={<Radio size="small" />} label="Игнор" />
                              </RadioGroup>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            {res.action === 'MAP_EXISTING' && (
                              <TextField
                                select
                                size="small"
                                fullWidth
                                label="Выберите поле из справочника"
                                value={res.mappedExistingKey || columnMapping[header] || ''}
                                onChange={(e) => {
                                  const selectedKey = e.target.value;
                                  const matched = catalogFields.find((cf) => cf.key === selectedKey);
                                  handleUpdateResolution(header, {
                                    action: 'MAP_EXISTING',
                                    mappedExistingKey: selectedKey,
                                    name: matched ? matched.name : header,
                                    key: selectedKey,
                                  });
                                  setColumnMapping((prev) => ({
                                    ...prev,
                                    [header]: selectedKey,
                                  }));
                                }}
                                SelectProps={{ displayEmpty: true }}
                              >
                                <MenuItem value="">— Не назначено —</MenuItem>
                                {allAvailableTargetFields.map((cf: { key: string; name: string; unit: string | null; isRequired: boolean; group: string }) => (
                                  <MenuItem key={cf.key} value={cf.key}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: cf.key === 'name' ? 700 : 500 }}>
                                        {cf.name} {cf.key === 'name' ? '*' : ''}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                        {cf.key} {cf.unit ? `[${cf.unit}]` : ''} • {cf.group}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </TextField>
                            )}

                            {res.action === 'CREATE' && (
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                  label="Название"
                                  size="small"
                                  value={res.name}
                                  onChange={(e) => handleUpdateResolution(header, { name: e.target.value })}
                                  sx={{ flex: '1 1 120px' }}
                                />
                                <TextField
                                  select
                                  label="Тип"
                                  size="small"
                                  value={res.fieldType}
                                  onChange={(e) => handleUpdateResolution(header, { fieldType: e.target.value as any })}
                                  sx={{ width: 100 }}
                                >
                                  <MenuItem value="TEXT">Текст</MenuItem>
                                  <MenuItem value="NUMBER">Число</MenuItem>
                                  <MenuItem value="DATE">Дата</MenuItem>
                                  <MenuItem value="BOOLEAN">Да/Нет</MenuItem>
                                </TextField>
                                <TextField
                                  select
                                  label="Раздел"
                                  size="small"
                                  value={res.sectionId}
                                  onChange={(e) => handleUpdateResolution(header, { sectionId: e.target.value })}
                                  sx={{ flex: '1 1 140px' }}
                                >
                                  <MenuItem value="">Общий раздел</MenuItem>
                                  {availableSections.map((sec) => (
                                    <MenuItem key={sec.id} value={sec.id}>
                                      {sec.name}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Box>
                            )}

                            {res.action === 'IGNORE' && (
                              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                Колонка будет пропущена при импорте
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </DataTableWrapper>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(0)}>
              Назад к выбору файла
            </Button>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={handleProceedToCollisions}
              sx={{ fontWeight: 700, px: 3 }}
            >
              Продолжить к проверке коллизий
            </Button>
          </Box>
        </Box>
      )}

      {/* ─── STEP 2: Проверка коллизий и предпросмотр ─── */}
      {activeStep === 2 && (
        <Box>
          <Card sx={{ mb: 3, borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Стратегия разрешения коллизий и дубликатов
              </Typography>
              {duplicateExternalIds.length > 0 && (
                <CriticalAlertBanner
                  alerts={[{
                    id: 'duplicate-external-ids',
                    severity: 'CRITICAL',
                    title: `Повторяющиеся ID оборудования: ${duplicateExternalIds.length}`,
                    description: duplicateExternalIds.slice(0, 5).map((item) => `${item.id} (${item.count} раза)`).join(', '),
                    count: duplicateExternalIds.length,
                  }]}
                />
              )}
              <Typography variant="caption" color="text.secondary" paragraph>
                Выберите действие при совпадении инвентарного или заводского номера с уже существующим оборудованием в базе
              </Typography>

                <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper
                    variant="outlined"
                    onClick={() => setConflictStrategy('UPSERT')}
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      borderRadius: '8px',
                      border: conflictStrategy === 'UPSERT' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      backgroundColor: conflictStrategy === 'UPSERT' ? 'rgba(2, 132, 199, 0.04)' : 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Radio checked={conflictStrategy === 'UPSERT'} size="small" />
                      <Typography variant="subtitle1" fontWeight={700} color={conflictStrategy === 'UPSERT' ? 'primary' : 'inherit'}>
                        Обновить существующие паспорта (UPSERT)
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                      При совпадении инвентарного номера данные карточки будут перезаписаны новыми значениями из файла.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper
                    variant="outlined"
                    onClick={() => setConflictStrategy('SKIP')}
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      borderRadius: '8px',
                      border: conflictStrategy === 'SKIP' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      backgroundColor: conflictStrategy === 'SKIP' ? 'rgba(2, 132, 199, 0.04)' : 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Radio checked={conflictStrategy === 'SKIP'} size="small" />
                      <Typography variant="subtitle1" fontWeight={700} color={conflictStrategy === 'SKIP' ? 'primary' : 'inherit'}>
                        Пропустить дубликаты (SKIP)
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                      Существующие карточки оборудования останутся без изменений, будут добавлены только новые единицы.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    variant="outlined"
                    onClick={() => setConflictStrategy('FULL_REPLACE')}
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: conflictStrategy === 'FULL_REPLACE' ? 'error.main' : 'divider',
                      backgroundColor: conflictStrategy === 'FULL_REPLACE' ? 'error.50' : 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Radio checked={conflictStrategy === 'FULL_REPLACE'} size="small" color="error" />
                      <Typography variant="subtitle1" fontWeight={700} color={conflictStrategy === 'FULL_REPLACE' ? 'error.main' : 'inherit'}>
                        Полностью заменить реестр
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                      Удалить существующее оборудование и связанные EPS-данные, затем загрузить записи из файла. Пользователи, склады и номенклатура сохранятся.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Collisions Table */}
          <Card sx={{ mb: 3, borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Предпросмотр данных ({totalRowsCount} строк)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Результаты автоматической проверки строк перед загрузкой в систему
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={`Все (${totalRowsCount})`}
                    color={previewFilter === 'ALL' ? 'primary' : 'default'}
                    onClick={() => setPreviewFilter('ALL')}
                    clickable
                    size="small"
                  />
                  <Chip
                    label={`Новые (${newCount})`}
                    color={previewFilter === 'NEW' ? 'success' : 'default'}
                    onClick={() => setPreviewFilter('NEW')}
                    clickable
                    size="small"
                  />
                  <Chip
                    label={`Коллизии (${collisionCount})`}
                    color={previewFilter === 'COLLISION' ? 'warning' : 'default'}
                    onClick={() => setPreviewFilter('COLLISION')}
                    clickable
                    size="small"
                  />
                  {errorCount > 0 && (
                    <Chip
                      label={`Ошибки (${errorCount})`}
                      color={previewFilter === 'ERROR' ? 'error' : 'default'}
                      onClick={() => setPreviewFilter('ERROR')}
                      clickable
                      size="small"
                    />
                  )}
                </Box>
              </Box>

              <DataTableWrapper total={filteredPreviewRows.length} stickyHeader maxHeight={420}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 48 }}>Стр.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Статус</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Наименование</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Инв. №</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Серийный №</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Производитель</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Локация</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPreviewRows.slice(0, 100).map((row) => (
                      <TableRow key={row.rowIndex} hover>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{row.rowIndex}</TableCell>
                        <TableCell>
                          {row.status === 'NEW' ? (
                            <StatusBadge status="ACTIVE" label="Новый объект" size="small" />
                          ) : row.status === 'COLLISION' ? (
                            <StatusBadge status="PENDING" label="Совпадение инв. №" size="small" />
                          ) : (
                            <StatusBadge status="ERROR" label="Ошибка данных" size="small" />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{row.data.name || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8125rem' }}>{row.data.inventoryNumber || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8125rem' }}>{row.data.serialNumber || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8125rem' }}>{row.data.manufacturer || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8125rem' }}>{row.data.location || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableWrapper>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(1)}>
              Назад к сопоставлению
            </Button>
            <Button
              variant="contained"
              size="large"
              disabled={executingImport || totalRowsCount === 0}
              onClick={() => handleExecuteImport()}
              endIcon={executingImport ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              sx={{ fontWeight: 700, px: 4 }}
            >
              {executingImport ? 'Выполнение импорта...' : `Импортировать ${totalRowsCount} записей`}
            </Button>
          </Box>
        </Box>
      )}

      {/* ─── STEP 3: Результаты и отчет об импорте ─── */}
      {activeStep === 3 && importResults && (
        <Card sx={{ borderRadius: '12px' }}>
          <CardContent sx={{ p: 5, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Импорт успешно завершен!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Данные обработаны и зафиксированы в едином реестре оборудования и журнале аудита платформы
            </Typography>

            <Grid container spacing={3} sx={{ mt: 3, mb: 4, maxWidth: 900, mx: 'auto' }}>
              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: 'success.light', borderColor: '#86efac', borderRadius: '8px' }}>
                  <Typography variant="caption" color="success.main" fontWeight={700} display="block">
                    СОЗДАНО НОВЫХ
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mt: 0.5 }}>
                    {importResults.createdCount}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#eff6ff', borderColor: '#93c5fd', borderRadius: '8px' }}>
                  <Typography variant="caption" color="primary.main" fontWeight={700} display="block">
                    ОБНОВЛЕНО
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
                    {importResults.updatedCount}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: 'background.default', borderColor: 'grey.400', borderRadius: '8px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                    ПРОПУЩЕНО
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.secondary" sx={{ mt: 0.5 }}>
                    {importResults.skippedCount}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#faf5ff', borderColor: '#d8b4fe', borderRadius: '8px' }}>
                  <Typography variant="caption" color="secondary.main" fontWeight={700} display="block">
                    НОВЫХ ПОЛЕЙ
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="secondary.main" sx={{ mt: 0.5 }}>
                    {importResults.newCustomFieldsCreated}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {importResults.errors && importResults.errors.length > 0 && (
              <Box sx={{ mb: 4, maxWidth: 900, mx: 'auto' }}>
                <CriticalAlertBanner
                  alerts={[
                    {
                      id: 'import-errors-alert',
                      severity: 'WARNING',
                      title: `Предупреждения при импорте (${importResults.errors.length}):`,
                      description: importResults.errors.slice(0, 5).map((e) => `Строка ${e.row}: ${e.error}`).join('; '),
                      count: importResults.errors.length,
                    },
                  ]}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<FormatListBulletedIcon />}
                onClick={() => router.push('/eps')}
                sx={{ px: 4, py: 1.2, fontWeight: 700 }}
              >
                Перейти в реестр оборудования
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<AutorenewIcon />}
                onClick={() => {
                  setSelectedFile(null);
                  setActiveStep(0);
                  setImportResults(null);
                }}
                sx={{ px: 3, py: 1.2, fontWeight: 600 }}
              >
                Загрузить еще один файл
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={fullReplaceDialogOpen}
        title="Полная замена реестра оборудования"
        subtitle="Текущие EPS-записи будут удалены"
        message="Будут удалены карточки оборудования и каскадно связанные документы, фотографии, теги, планы ТО и согласования. Пользователи, склады, номенклатура и складские операции сохранятся."
        variant="danger"
        confirmText="Заменить реестр"
        confirmWord="ЗАМЕНИТЬ"
        confirmWordPlaceholder="Введите ЗАМЕНИТЬ"
        countdownSeconds={3}
        onClose={() => setFullReplaceDialogOpen(false)}
        onConfirm={() => {
          setFullReplaceDialogOpen(false);
          void handleExecuteImport(true);
        }}
        loading={executingImport}
      />
    </Box>
  );
}
