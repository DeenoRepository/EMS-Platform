'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
  Paper,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Stack,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PlaceIcon from '@mui/icons-material/Place';
import TuneIcon from '@mui/icons-material/Tune';
import CategoryIcon from '@mui/icons-material/Category';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldIcon from '@mui/icons-material/Shield';
import StraightenIcon from '@mui/icons-material/Straighten';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PageHeader from '@/components/layout/PageHeader';
import { PageLoading, DatePickerField, StatusBadge } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { useSnackbar } from 'notistack';

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface CustomFieldDef {
  id: string;
  sectionId: string | null;
  key: string;
  name: string;
  fieldType: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  unit: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options?: string[];
}

interface CustomSectionDef {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldDef[];
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="primary" />,
  Shield: <ShieldIcon color="success" />,
  Straighten: <StraightenIcon color="secondary" />,
  Speed: <SpeedIcon color="error" />,
};

const WIZARD_STEPS = [
  '1. Идентификация и размещение',
  '2. Технические параметры и характеристики',
  '3. Классификация, статус и сводка',
];

export default function NewEquipmentPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingDefs, setLoadingDefs] = useState(true);

  // Available metadata
  const [tags, setTags] = useState<TagItem[]>([]);
  const [sections, setSections] = useState<CustomSectionDef[]>([]);
  const [unassignedFields, setUnassignedFields] = useState<CustomFieldDef[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    inventoryNumber: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    location: '',
    status: 'ACTIVE',
    commissionDate: new Date().toISOString().split('T')[0],
  });

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadMeta() {
      try {
        const [tagsRes, sectionsRes] = await Promise.all([
          fetch('/api/eps/tags'),
          fetch('/api/eps/custom-sections'),
        ]);

        if (tagsRes.ok && sectionsRes.ok) {
          const tagsJson = await tagsRes.json();
          const sectionsJson = await sectionsRes.json();

          if (tagsJson.success) setTags(tagsJson.data);
          if (sectionsJson.success && sectionsJson.data) {
            setSections(sectionsJson.data.sections || []);
            setUnassignedFields(sectionsJson.data.unassignedFields || []);

            const initialVals: Record<string, any> = {};
            const allFields: CustomFieldDef[] = [
              ...(sectionsJson.data.sections || []).flatMap((s: CustomSectionDef) => s.fields),
              ...(sectionsJson.data.unassignedFields || []),
            ];

            allFields.forEach((f) => {
              if (f.fieldType === 'BOOLEAN') {
                initialVals[f.key] = f.defaultValue === 'true';
              } else if (f.defaultValue) {
                initialVals[f.key] = f.defaultValue;
              }
            });
            setCustomFieldValues(initialVals);
          }
        }
      } catch {
        enqueueSnackbar('Ошибка загрузки метаданных', { variant: 'error' });
      } finally {
        setLoadingDefs(false);
      }
    }

    loadMeta();
  }, [enqueueSnackbar]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleNextStep = () => {
    if (activeStep === 0) {
      if (!formData.name.trim()) {
        enqueueSnackbar('Укажите наименование оборудования', { variant: 'warning' });
        return;
      }
    }
    setActiveStep((prev) => Math.min(prev + 1, 2));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderFieldInput = (def: CustomFieldDef) => {
    if (def.fieldType === 'BOOLEAN') {
      return (
        <Grid item xs={12} sm={6} key={def.key}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', borderRadius: '8px' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(customFieldValues[def.key])}
                  onChange={(e) => handleCustomFieldChange(def.key, e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" fontWeight={600}>
                  {def.name}
                </Typography>
              }
            />
          </Paper>
        </Grid>
      );
    }

    if (def.fieldType === 'SELECT' && def.options && Array.isArray(def.options)) {
      return (
        <Grid item xs={12} sm={6} key={def.key}>
          <TextField
            select
            label={def.name}
            fullWidth
            size="medium"
            required={def.isRequired}
            value={customFieldValues[def.key] || ''}
            onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
          >
            <MenuItem value="">— Не выбрано —</MenuItem>
            {def.options.map((opt: string) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      );
    }

    if (def.fieldType === 'TEXTAREA') {
      return (
        <Grid item xs={12} key={def.key}>
          <TextField
            label={def.name}
            multiline
            rows={3}
            fullWidth
            size="medium"
            required={def.isRequired}
            value={customFieldValues[def.key] || ''}
            onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
          />
        </Grid>
      );
    }

    return (
      <Grid item xs={12} sm={6} key={def.key}>
        <TextField
          label={def.name}
          type={def.fieldType === 'NUMBER' ? 'number' : def.fieldType === 'DATE' ? 'date' : 'text'}
          InputLabelProps={def.fieldType === 'DATE' ? { shrink: true } : undefined}
          InputProps={
            def.unit
              ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Chip label={def.unit} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                    </InputAdornment>
                  ),
                }
              : undefined
          }
          fullWidth
          size="medium"
          required={def.isRequired}
          value={customFieldValues[def.key] || ''}
          onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
        />
      </Grid>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      enqueueSnackbar('Укажите наименование оборудования', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        tagIds: selectedTagIds,
        customFields: customFieldValues,
      };

      const res = await fetch('/api/eps/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        enqueueSnackbar('Оборудование успешно зарегистрировано в системе', { variant: 'success' });
        router.push(`/eps/${data.data.id}`);
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка отправки данных', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1920, mx: 'auto' }}>
      <PageHeader
        title="Мастер регистрации оборудования"
        subtitle="Пошаговое заполнение паспорта оборудования и технических параметров"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Мастер создания' },
        ]}
        actions={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/eps')}
          >
            Назад к реестру
          </Button>
        }
      />

      {loadingDefs ? (
        <PageLoading text="Загрузка структуры полей паспорта оборудования..." />
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          {/* Stepper Header */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {WIZARD_STEPS.map((label, index) => (
                <Step key={label} onClick={() => setActiveStep(index)} sx={{ cursor: 'pointer' }}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontWeight: activeStep === index ? 700 : 500,
                        color: activeStep === index ? '#0284c7' : '#64748b',
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {/* STEP 0: Идентификация и размещение */}
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                {/* Section 1: Identification */}
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <PrecisionManufacturingIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Идентификация оборудования
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" paragraph>
                      Уникальные заводские и инвентарные реквизиты объекта учёта
                    </Typography>
                    <Divider sx={{ mb: 2.5 }} />

                    <Grid container spacing={2.5}>
                      <Grid item xs={12}>
                        <TextField
                          label="Наименование оборудования *"
                          placeholder="например: Центробежный насос подачи охлаждающей воды"
                          required
                          fullWidth
                          size="medium"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Инвентарный номер"
                          placeholder="EQ-2024-001"
                          fullWidth
                          size="medium"
                          value={formData.inventoryNumber}
                          onChange={(e) => handleInputChange('inventoryNumber', e.target.value)}
                          helperText="Уникальный учетный номер предприятия"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Заводской / Серийный номер"
                          placeholder="GR-8842-A"
                          fullWidth
                          size="medium"
                          value={formData.serialNumber}
                          onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                          helperText="Номер на шильдике завода-изготовителя"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Section 2: Manufacturer & Location */}
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <PlaceIcon color="secondary" />
                      <Typography variant="h6" fontWeight={700}>
                        Производитель и местоположение
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2.5 }} />

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Завод-изготовитель"
                          placeholder="Grundfos, Siemens, etc."
                          fullWidth
                          size="medium"
                          value={formData.manufacturer}
                          onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Модель / Модификация"
                          placeholder="NB 50-200/219"
                          fullWidth
                          size="medium"
                          value={formData.model}
                          onChange={(e) => handleInputChange('model', e.target.value)}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          label="Место установки (Цех, участок, позиция)"
                          placeholder="Цех №1, Насосная станция, поз. Н-1"
                          fullWidth
                          size="medium"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Sidebar Info */}
              <Grid item xs={12} lg={4}>
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ mb: 1 }}>
                      Подсказка по заполнению
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Укажите точное наименование агрегата согласно паспорту изделия. Инвентарный номер используется для автоматической маркировки и генерации QR-кодов.
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      endIcon={<ArrowForwardIcon />}
                      onClick={handleNextStep}
                      disabled={!formData.name.trim()}
                      sx={{ py: 1.25, fontWeight: 700 }}
                    >
                      Далее: Характеристики →
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* STEP 1: Технические параметры и кастомные разделы */}
          {activeStep === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                {sections.length === 0 && unassignedFields.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: '8px' }}>
                    Кастомные технические разделы не настроены. Перейдите к следующему шагу.
                  </Alert>
                ) : (
                  sections.map((sec) => (
                    <Card key={sec.id} sx={{ mb: 3 }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          {SECTION_ICONS[sec.icon || 'Bolt'] || <TuneIcon color="primary" />}
                          <Box>
                            <Typography variant="h6" fontWeight={700}>
                              {sec.name}
                            </Typography>
                            {sec.description && (
                              <Typography variant="caption" color="text.secondary">
                                {sec.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Divider sx={{ mb: 2.5 }} />

                        <Grid container spacing={2.5}>
                          {sec.fields.map((def) => renderFieldInput(def))}
                        </Grid>
                      </CardContent>
                    </Card>
                  ))
                )}

                {unassignedFields.length > 0 && (
                  <Card sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <TuneIcon color="primary" />
                        <Typography variant="h6" fontWeight={700}>
                          Дополнительные параметры
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2.5 }} />

                      <Grid container spacing={2.5}>
                        {unassignedFields.map((def) => renderFieldInput(def))}
                      </Grid>
                    </CardContent>
                  </Card>
                )}
              </Grid>

              {/* Navigation Sidebar */}
              <Grid item xs={12} lg={4}>
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ mb: 1 }}>
                      Шаг 2 из 3
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Заполните эксплуатационные характеристики оборудования для автоматического формирования регламентов ТОиР.
                    </Typography>
                    <Stack spacing={1.5}>
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        endIcon={<ArrowForwardIcon />}
                        onClick={handleNextStep}
                        sx={{ py: 1.25, fontWeight: 700 }}
                      >
                        Далее: Статус и теги →
                      </Button>
                      <Button variant="outlined" fullWidth onClick={handlePrevStep}>
                        ← Назад к идентификации
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* STEP 2: Классификация, статус и сводка */}
          {activeStep === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <CategoryIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Классификация и статус
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2.5 }} />

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          label="Текущий статус оборудования"
                          fullWidth
                          size="medium"
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                        >
                          {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                            <MenuItem key={key} value={key}>
                              {info.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <DatePickerField
                          label="Дата ввода в эксплуатацию"
                          fullWidth
                          size="medium"
                          value={formData.commissionDate}
                          onChange={(val) => handleInputChange('commissionDate', val || '')}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <FormControl fullWidth size="medium">
                          <InputLabel id="tags-select-label">Теги и классификаторы</InputLabel>
                          <Select
                            labelId="tags-select-label"
                            multiple
                            value={selectedTagIds}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedTagIds(typeof val === 'string' ? val.split(',') : val);
                            }}
                            input={<OutlinedInput label="Теги и классификаторы" />}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((tagId) => {
                                  const tag = tags.find((t) => t.id === tagId);
                                  return (
                                    <StatusBadge
                                      key={tagId}
                                      status={tag ? tag.name : tagId}
                                      label={tag ? tag.name : tagId}
                                      customColor={tag?.color || undefined}
                                      size="small"
                                      variant="outlined"
                                    />
                                  );
                                })}
                              </Box>
                            )}
                          >
                            {tags.map((tag) => (
                              <MenuItem key={tag.id} value={tag.id}>
                                {tag.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Summary Card */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="h6" fontWeight={700} color="#0f172a" sx={{ mb: 2 }}>
                    Сводная карточка создаваемого паспорта
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Наименование:
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                        {formData.name || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Инвентарный номер:
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="#0f172a">
                        {formData.inventoryNumber || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Статус:
                      </Typography>
                      <Box sx={{ mt: 0.25 }}>
                        <StatusBadge status={formData.status} />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Производитель / Модель:
                      </Typography>
                      <Typography variant="body2" color="#0f172a">
                        {formData.manufacturer || '—'} / {formData.model || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Локация:
                      </Typography>
                      <Typography variant="body2" color="#0f172a">
                        {formData.location || '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Submit Actions Sidebar */}
              <Grid item xs={12} lg={4}>
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ mb: 1 }}>
                      Завершение регистрации
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      После сохранения паспорт появится в реестре EPS и станет доступен для прикрепления чертежей, проведения ТО и списания запчастей.
                    </Typography>

                    <Stack spacing={1.5}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        disabled={saving || !formData.name.trim()}
                        sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem', backgroundColor: '#16a34a', '&:hover': { backgroundColor: '#15803d' } }}
                      >
                        {saving ? 'Сохранение...' : 'Зарегистрировать оборудование'}
                      </Button>
                      <Button variant="outlined" fullWidth onClick={handlePrevStep}>
                        ← Назад к характеристикам
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
}
