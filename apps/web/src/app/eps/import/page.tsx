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
  TableContainer,
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
  Alert,
  AlertTitle,
  Tooltip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';

interface MissingFieldItem {
  header: string;
  suggestedName: string;
  suggestedKey: string;
  suggestedType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  suggestedUnit: string | null;
  sampleValues: any[];
}

interface MissingFieldResolution {
  header: string;
  action: 'CREATE' | 'IGNORE';
  name: string;
  key: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT';
  unit: string;
  sectionId: string;
}

interface ValidatedRow {
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

export default function SmartImportPage() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Step 1: Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
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

        // Initialize resolutions for missing fields (default to CREATE)
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
    // Apply resolved custom fields to columnMapping
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

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title="EPS — Интеллектуальный импорт оборудования"
        subtitle="Пошаговый мастер загрузки данных из Excel и CSV с автоматическим разрешением новых полей и контролем дубликатов"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Импорт данных' },
        ]}
      />

      {/* Stepper Bar */}
      <Card sx={{ mb: 3 }}>
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

      {/* ========================================================================= */}
      {/* STEP 0: Загрузка файла и выбор источника */}
      {/* ========================================================================= */}
      {activeStep === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '2px dashed #0284c7',
                    borderRadius: 3,
                    p: 6,
                    textAlign: 'center',
                    width: '100%',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(2, 132, 199, 0.02)',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(2, 132, 199, 0.06)',
                      borderColor: '#0369a1',
                    },
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {selectedFile ? selectedFile.name : 'Выберите или перетащите файл таблицы'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Поддерживаются форматы Excel (.xlsx, .xls) и CSV с разделителями
                  </Typography>
                  {selectedFile && (
                    <Chip
                      label={`Размер: ${(selectedFile.size / 1024).toFixed(1)} КБ`}
                      color="primary"
                      size="small"
                      sx={{ mt: 2, fontWeight: 600 }}
                    />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
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
            <Card sx={{ height: '100%' }}>
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
                  sx={{ py: 1.5, mb: 3, fontWeight: 600 }}
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

      {/* ========================================================================= */}
      {/* STEP 1: Сопоставление колонок и недостающие поля */}
      {/* ========================================================================= */}
      {activeStep === 1 && (
        <Box>
          {missingFields.length > 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle sx={{ fontWeight: 700 }}>
                Обнаружено новых колонок: {missingFields.length}
              </AlertTitle>
              В загруженном файле найдены колонки, которых пока нет в справочнике характеристик оборудования. Вы можете добавить их в систему как новые поля или пропустить.
            </Alert>
          )}

          {/* Missing Fields Cards */}
          {missingFields.length > 0 && (
            <Card sx={{ mb: 3, border: '1px solid #0284c7' }}>
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
                        <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: res.action === 'CREATE' ? '#f0fdf4' : '#f8fafc' }}>
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
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Итоговая карта сопоставления колонок
              </Typography>
              <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
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
                                <Chip label="Будет создано новое поле" size="small" color="success" />
                              ) : (
                                <Chip label="Будет пропущено (Игнорируется)" size="small" />
                              )
                            ) : (
                              <Chip label="Распознано автоматически" size="small" color="primary" variant="outlined" />
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
              </TableContainer>
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

      {/* ========================================================================= */}
      {/* STEP 2: Проверка коллизий и предпросмотр */}
      {/* ========================================================================= */}
      {activeStep === 2 && (
        <Box>
          {/* Conflict Strategy Selector */}
          <Card sx={{ mb: 3 }}>
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
                      border: conflictStrategy === 'UPSERT' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      backgroundColor: conflictStrategy === 'UPSERT' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Radio checked={conflictStrategy === 'UPSERT'} />
                      <Typography variant="subtitle1" fontWeight={700}>
                        Обновлять существующие записи (Upsert)
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                      При совпадении инвентарного или серийного номера характеристики оборудования в базе будут обновлены новыми данными из файла.
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
                      border: conflictStrategy === 'SKIP' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      backgroundColor: conflictStrategy === 'SKIP' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Radio checked={conflictStrategy === 'SKIP'} />
                      <Typography variant="subtitle1" fontWeight={700}>
                        Пропускать существующие записи (Skip)
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                      Совпадающие единицы оборудования не перезаписываются. Создаются только абсолютно новые записи.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Validation Metrics (Clickable Filters) */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card
                onClick={() => setPreviewFilter((prev) => (prev === 'NEW' ? 'ALL' : 'NEW'))}
                sx={{
                  p: 2,
                  borderLeft: '4px solid #16a34a',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: previewFilter === 'NEW' ? 'rgba(22, 163, 74, 0.08)' : '#ffffff',
                  boxShadow: previewFilter === 'NEW' ? '0 0 0 2px #16a34a' : undefined,
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  НОВЫХ ЗАПИСЕЙ {previewFilter === 'NEW' && '• [АКТИВЕН]'}
                </Typography>
                <Typography variant="h5" fontWeight={800} color="success.main">
                  {newCount}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card
                onClick={() => setPreviewFilter((prev) => (prev === 'COLLISION' ? 'ALL' : 'COLLISION'))}
                sx={{
                  p: 2,
                  borderLeft: '4px solid #d97706',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: previewFilter === 'COLLISION' ? 'rgba(217, 119, 6, 0.08)' : '#ffffff',
                  boxShadow: previewFilter === 'COLLISION' ? '0 0 0 2px #d97706' : undefined,
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  ОБНАРУЖЕНО ДУБЛИКАТОВ / КОЛЛИЗИЙ {previewFilter === 'COLLISION' && '• [АКТИВЕН]'}
                </Typography>
                <Typography variant="h5" fontWeight={800} color="warning.main">
                  {collisionCount}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card
                onClick={() => setPreviewFilter((prev) => (prev === 'ERROR' ? 'ALL' : 'ERROR'))}
                sx={{
                  p: 2,
                  borderLeft: '4px solid #dc2626',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: previewFilter === 'ERROR' ? 'rgba(220, 38, 38, 0.08)' : '#ffffff',
                  boxShadow: previewFilter === 'ERROR' ? '0 0 0 2px #dc2626' : undefined,
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  ОШИБОК ВАЛИДАЦИИ {previewFilter === 'ERROR' && '• [АКТИВЕН]'}
                </Typography>
                <Typography variant="h5" fontWeight={800} color="error.main">
                  {errorCount}
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Pre-flight Data Preview Table with Filter Bar */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Предпросмотр данных перед импортом ({validatedRows.filter((r) => previewFilter === 'ALL' || r.status === previewFilter).length} из {totalRowsCount})
                </Typography>

                {/* Filter Chips */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label={`Все (${totalRowsCount})`}
                    variant={previewFilter === 'ALL' ? 'filled' : 'outlined'}
                    color={previewFilter === 'ALL' ? 'primary' : 'default'}
                    onClick={() => setPreviewFilter('ALL')}
                    clickable
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label={`Новые (${newCount})`}
                    variant={previewFilter === 'NEW' ? 'filled' : 'outlined'}
                    color={previewFilter === 'NEW' ? 'success' : 'default'}
                    onClick={() => setPreviewFilter('NEW')}
                    clickable
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label={`Коллизии (${collisionCount})`}
                    variant={previewFilter === 'COLLISION' ? 'filled' : 'outlined'}
                    color={previewFilter === 'COLLISION' ? 'warning' : 'default'}
                    onClick={() => setPreviewFilter('COLLISION')}
                    clickable
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  {errorCount > 0 && (
                    <Chip
                      label={`Ошибки (${errorCount})`}
                      variant={previewFilter === 'ERROR' ? 'filled' : 'outlined'}
                      color={previewFilter === 'ERROR' ? 'error' : 'default'}
                      onClick={() => setPreviewFilter('ERROR')}
                      clickable
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>
              </Box>

              <TableContainer sx={{ maxHeight: 500, border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#f1f5f9' }}>Строка</TableCell>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#f1f5f9' }}>Статус проверки</TableCell>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#f1f5f9' }}>Наименование</TableCell>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#f1f5f9' }}>Инв. номер</TableCell>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#f1f5f9' }}>Серийный номер</TableCell>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#f1f5f9' }}>Производитель</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validatedRows
                      .filter((r) => previewFilter === 'ALL' || r.status === previewFilter)
                      .slice(0, 100)
                      .map((row) => (
                        <TableRow key={row.rowIndex} hover>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{row.rowIndex}</TableCell>
                          <TableCell>
                            {row.status === 'NEW' && (
                              <Chip label="Новая запись" size="small" color="success" sx={{ fontWeight: 600 }} />
                            )}
                            {row.status === 'COLLISION' && (
                              <Chip
                                label={conflictStrategy === 'UPSERT' ? 'Коллизия ➔ Будет обновлена' : 'Коллизия ➔ Будет пропущена'}
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                            {row.status === 'ERROR' && (
                              <Tooltip title={row.statusMessage}>
                                <Chip label="Ошибка валидации" size="small" color="error" sx={{ fontWeight: 600 }} />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.data['Наименование оборудования *'] || row.data['Наименование'] || row.data['name'] || '—'}</TableCell>
                          <TableCell>{row.data['Инвентарный номер'] || row.data['inventoryNumber'] || '—'}</TableCell>
                          <TableCell>{row.data['Заводской / Серийный номер'] || row.data['serialNumber'] || '—'}</TableCell>
                          <TableCell>{row.data['Производитель'] || row.data['manufacturer'] || '—'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(1)}>
              Назад к сопоставлению
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={executingImport}
              onClick={handleExecuteImport}
              endIcon={executingImport ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              sx={{ fontWeight: 700, px: 4, py: 1.2 }}
            >
              {executingImport ? 'Выполняется импорт данных...' : 'Запустить импорт оборудования'}
            </Button>
          </Box>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Результаты и отчет об импорте */}
      {/* ========================================================================= */}
      {activeStep === 3 && importResults && (
        <Card>
          <CardContent sx={{ p: 5, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Импорт успешно завершен!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Данные обработаны и зафиксированы в едином журнале аудита платформы
            </Typography>

            <Grid container spacing={3} sx={{ mt: 3, mb: 4, maxWidth: 900, mx: 'auto' }}>
              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#f0fdf4', borderColor: '#86efac' }}>
                  <Typography variant="caption" color="success.main" fontWeight={700} display="block">
                    СОЗДАНО НОВЫХ
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mt: 0.5 }}>
                    {importResults.createdCount}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#eff6ff', borderColor: '#93c5fd' }}>
                  <Typography variant="caption" color="primary.main" fontWeight={700} display="block">
                    ОБНОВЛЕНО
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
                    {importResults.updatedCount}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                    ПРОПУЩЕНО
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.secondary" sx={{ mt: 0.5 }}>
                    {importResults.skippedCount}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={3}>
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#faf5ff', borderColor: '#d8b4fe' }}>
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
              <Alert severity="warning" sx={{ mb: 4, maxWidth: 900, mx: 'auto', textAlign: 'left' }}>
                <AlertTitle sx={{ fontWeight: 700 }}>Предупреждения при импорте ({importResults.errors.length}):</AlertTitle>
                {importResults.errors.slice(0, 5).map((e, idx) => (
                  <Typography key={idx} variant="caption" display="block">
                    Строка {e.row}: {e.error}
                  </Typography>
                ))}
              </Alert>
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
