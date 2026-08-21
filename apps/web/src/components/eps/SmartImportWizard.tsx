'use client';

import React, { useState, useRef } from 'react';
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
  action: 'CREATE' | 'IGNORE';
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
  const [missingFields, setMissingFields] = useState<MissingFieldItem[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, MissingFieldResolution>>({});
  const [availableSections, setAvailableSections] = useState<{ id: string; name: string }[]>([]);

  // Step 3: Conflict strategy & rows state
  const [conflictStrategy, setConflictStrategy] = useState<'UPSERT' | 'SKIP'>('UPSERT');
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'NEW' | 'COLLISION' | 'ERROR'>('ALL');
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [collisionCount, setCollisionCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
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
        setMissingFields(json.data.missingFields || []);
        setAvailableSections(json.data.availableSections || []);
        setValidatedRows(json.data.allRows || []);
        setTotalRowsCount(json.data.totalRows);
        setNewCount(json.data.newCount);
        setCollisionCount(json.data.collisionCount);
        setErrorCount(json.data.errorCount);

        const initialResolutions: Record<string, MissingFieldResolution> = {};
        (json.data.missingFields || []).forEach((mf: MissingFieldItem) => {
          initialResolutions[mf.header] = {
            header: mf.header,
            action: 'CREATE',
            name: mf.suggestedName,
            key: mf.suggestedKey,
            fieldType: mf.suggestedType,
            unit: mf.suggestedUnit || '',
            sectionId: '',
          };
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
    const updatedMapping = { ...columnMapping };
    Object.entries(resolutions).forEach(([header, res]) => {
      if (res.action === 'CREATE') {
        updatedMapping[header] = `custom_${res.key}`;
      } else {
        delete updatedMapping[header];
      }
    });
    setColumnMapping(updatedMapping);
    setActiveStep(2);
  };

  // Step 3: Execute Import
  const handleExecuteImport = async () => {
    setExecutingImport(true);

    const newFieldDefs = Object.values(resolutions)
      .filter((r) => r.action === 'CREATE')
      .map((r) => ({
        header: r.header,
        key: r.key,
        name: r.name,
        fieldType: r.fieldType,
        unit: r.unit || undefined,
        sectionId: r.sectionId || undefined,
      }));

    const ignoredHeaders = Object.values(resolutions)
      .filter((r) => r.action === 'IGNORE')
      .map((r) => r.header);

    try {
      const res = await fetch('/api/eps/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validatedRows,
          columnMapping,
          newFieldDefinitions: newFieldDefs,
          ignoredHeaders,
          conflictStrategy,
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
      {activeStep === 1 && (
        <Box>
          {missingFields.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <CriticalAlertBanner
                alerts={[
                  {
                    id: 'missing-fields-alert',
                    severity: 'INFO',
                    title: `Обнаружено новых колонок: ${missingFields.length}`,
                    description:
                      'В загруженном файле найдены колонки, которых пока нет в справочнике характеристик оборудования. Вы можете добавить их в систему как новые поля или пропустить.',
                  },
                ]}
              />
            </Box>
          )}

          {/* Missing Fields Cards */}
          {missingFields.length > 0 && (
            <Card sx={{ mb: 3, border: '1px solid #0284c7', borderRadius: '12px' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AddCircleOutlineIcon color="primary" sx={{ fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={700}>
                    Разрешение недостающих полей ({missingFields.length})
                  </Typography>
                </Box>

                <Grid container spacing={2.5}>
                  {missingFields.map((mf) => {
                    const res = resolutions[mf.header] || {
                      action: 'CREATE',
                      name: mf.suggestedName,
                      key: mf.suggestedKey,
                      fieldType: mf.suggestedType,
                      unit: '',
                      sectionId: '',
                    };

                    return (
                      <Grid item xs={12} key={mf.header}>
                        <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: res.action === 'CREATE' ? '#f0fdf4' : '#f8fafc', borderRadius: '8px' }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={3}>
                              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                                «{mf.header}»
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Примеры из файла: {mf.sampleValues.slice(0, 2).join(', ') || '—'}
                              </Typography>
                            </Grid>

                            <Grid item xs={12} md={3}>
                              <FormControl component="fieldset">
                                <RadioGroup
                                  row
                                  value={res.action}
                                  onChange={(e) => handleUpdateResolution(mf.header, { action: e.target.value as any })}
                                >
                                  <FormControlLabel value="CREATE" control={<Radio size="small" />} label="Добавить в справочник" />
                                  <FormControlLabel value="IGNORE" control={<Radio size="small" />} label="Игнорировать" />
                                </RadioGroup>
                              </FormControl>
                            </Grid>

                            {res.action === 'CREATE' && (
                              <>
                                <Grid item xs={12} sm={4} md={2}>
                                  <TextField
                                    label="Название поля"
                                    size="small"
                                    fullWidth
                                    value={res.name}
                                    onChange={(e) => handleUpdateResolution(mf.header, { name: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4} md={1.5}>
                                  <TextField
                                    select
                                    label="Тип данных"
                                    size="small"
                                    fullWidth
                                    value={res.fieldType}
                                    onChange={(e) => handleUpdateResolution(mf.header, { fieldType: e.target.value as any })}
                                  >
                                    <MenuItem value="TEXT">Текст</MenuItem>
                                    <MenuItem value="NUMBER">Число</MenuItem>
                                    <MenuItem value="DATE">Дата</MenuItem>
                                    <MenuItem value="BOOLEAN">Да/Нет</MenuItem>
                                  </TextField>
                                </Grid>
                                <Grid item xs={12} sm={4} md={1}>
                                  <TextField
                                    label="Ед. изм."
                                    size="small"
                                    fullWidth
                                    value={res.unit}
                                    placeholder="кВт, бар..."
                                    onChange={(e) => handleUpdateResolution(mf.header, { unit: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6} md={1.5}>
                                  <TextField
                                    select
                                    label="Раздел"
                                    size="small"
                                    fullWidth
                                    value={res.sectionId}
                                    onChange={(e) => handleUpdateResolution(mf.header, { sectionId: e.target.value })}
                                  >
                                    <MenuItem value="">Общий раздел</MenuItem>
                                    {availableSections.map((sec) => (
                                      <MenuItem key={sec.id} value={sec.id}>
                                        {sec.name}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                </Grid>
                              </>
                            )}
                          </Grid>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* All Mapped Columns Summary */}
          <Card sx={{ mb: 3, borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Итоговая карта сопоставления колонок
              </Typography>
              <DataTableWrapper total={fileHeaders.length} stickyHeader>
                <Table size="small" aria-label="Карта сопоставления колонок">
                  <TableHead sx={{ backgroundColor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Колонка в файле</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Статус распознавания</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Поле в EMS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fileHeaders.map((header) => {
                      const isMissing = missingFields.some((mf) => mf.header === header);
                      const res = resolutions[header];
                      const mappedKey = columnMapping[header];

                      return (
                        <TableRow key={header} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{header}</TableCell>
                          <TableCell>
                            {isMissing ? (
                              res?.action === 'CREATE' ? (
                                <StatusBadge status="ACTIVE" label="Будет создано новое поле" size="small" />
                              ) : (
                                <StatusBadge status="DECOMMISSIONED" label="Будет пропущено (Игнорируется)" size="small" />
                              )
                            ) : (
                              <StatusBadge status="ACTIVE" label="Распознано автоматически" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                            {isMissing ? (res?.action === 'CREATE' ? `${res.name} (${res.key})` : '—') : mappedKey}
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
            <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleProceedToCollisions} sx={{ fontWeight: 700, px: 3 }}>
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
                      backgroundColor: conflictStrategy === 'UPSERT' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
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
                      backgroundColor: conflictStrategy === 'SKIP' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
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
              onClick={handleExecuteImport}
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
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: '8px' }}>
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
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderRadius: '8px' }}>
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
    </Box>
  );
}
