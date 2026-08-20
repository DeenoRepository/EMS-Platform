'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Stack,
  Paper,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Divider,
  InputAdornment,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import TuneIcon from '@mui/icons-material/Tune';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldIcon from '@mui/icons-material/Shield';
import StraightenIcon from '@mui/icons-material/Straighten';
import SpeedIcon from '@mui/icons-material/Speed';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import { useSnackbar } from 'notistack';
import { StatusBadge, DatePickerField } from '@/components/ui';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';

export interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

export interface CustomFieldDef {
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

export interface CustomSectionDef {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldDef[];
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Category: <CategoryIcon color="primary" />,
  Speed: <SpeedIcon color="error" />,
  Shield: <ShieldIcon color="success" />,
  Engineering: <EngineeringIcon color="warning" />,
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="info" />,
  Straighten: <StraightenIcon color="secondary" />,
  Tune: <TuneIcon color="primary" />,
};

export const WIZARD_STEPS = [
  'Идентификация и размещение',
  'Технические характеристики',
  'Классификация и ввод в эксплуатацию',
  'Проверка и сохранение',
];

export interface EquipmentWizardFormProps {
  mode?: 'page' | 'dialog';
  onSuccess: (newEquipmentId: string) => void;
  onCancel?: () => void;
}

export function EquipmentWizardForm({
  mode = 'dialog',
  onSuccess,
  onCancel,
}: EquipmentWizardFormProps) {
  const { enqueueSnackbar } = useSnackbar();

  // Stepper State
  const [activeStep, setActiveStep] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [commissionDate, setCommissionDate] = useState(new Date().toISOString().split('T')[0]);

  // Tags & Custom Fields
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Dictionaries
  const [tags, setTags] = useState<TagItem[]>([]);
  const [sections, setSections] = useState<CustomSectionDef[]>([]);
  const [unassignedFields, setUnassignedFields] = useState<CustomFieldDef[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoadingMeta(true);
    // Single consolidated metadata fetch
    Promise.all([
      fetch('/api/eps/tags').then((r) => r.json()),
      fetch('/api/eps/custom-sections').then((r) => r.json()),
    ])
      .then(([tagsJson, sectionsJson]) => {
        if (tagsJson.success) setTags(tagsJson.data || []);
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
      })
      .catch((err) => {
        console.error('Ошибка загрузки метаданных EPS:', err);
        enqueueSnackbar('Ошибка загрузки справочников полей', { variant: 'error' });
      })
      .finally(() => setIsLoadingMeta(false));
  }, [enqueueSnackbar]);

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const renderFieldInput = (def: CustomFieldDef) => {
    if (def.fieldType === 'BOOLEAN') {
      return (
        <Grid item xs={12} sm={6} key={def.key}>
          <Paper variant="outlined" sx={{ p: 1.5, height: '100%', display: 'flex', alignItems: 'center', borderRadius: '8px' }}>
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
            size="small"
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
            rows={2}
            fullWidth
            size="small"
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
                      <Chip label={def.unit} size="small" variant="outlined" sx={{ fontWeight: 700, height: 22 }} />
                    </InputAdornment>
                  ),
                }
              : undefined
          }
          fullWidth
          size="small"
          required={def.isRequired}
          value={customFieldValues[def.key] || ''}
          onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
        />
      </Grid>
    );
  };

  const handleNextStep = () => {
    if (activeStep === 0) {
      if (!name.trim()) {
        enqueueSnackbar('Укажите наименование оборудования', { variant: 'warning' });
        return;
      }
    }
    setActiveStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  const handlePrevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSave = async (submitForApproval: boolean) => {
    if (!name.trim()) {
      enqueueSnackbar('Наименование оборудования обязательно', { variant: 'warning' });
      setActiveStep(0);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        inventoryNumber: inventoryNumber.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        location: location.trim() || undefined,
        status,
        commissionDate,
        tagIds: selectedTagIds,
        customFields: customFieldValues,
        asDraft: !submitForApproval,
        submitForApproval,
      };

      const res = await fetch('/api/eps/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data) {
        if (submitForApproval) {
          enqueueSnackbar('Паспорт сохранен и отправлен на согласование', { variant: 'success' });
        } else {
          enqueueSnackbar('Паспорт сохранен в черновик (виден только вам)', { variant: 'info' });
        }
        onSuccess(data.data.id);
      } else {
        enqueueSnackbar(data.error || 'Ошибка при сохранении оборудования', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при отправке данных', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMeta) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
        <CircularProgress size={36} color="primary" />
        <Typography variant="body2" color="text.secondary">
          Загрузка структуры полей паспорта оборудования...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Stepper Navigation (Visible in both Dialog and Page modes) */}
      <Paper
        elevation={0}
        sx={{
          p: mode === 'dialog' ? 1.75 : 2.5,
          mb: 2.5,
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          bgcolor: '#f8fafc',
        }}
      >
        <Stepper activeStep={activeStep} alternativeLabel>
          {WIZARD_STEPS.map((label, index) => (
            <Step
              key={label}
              onClick={() => {
                if (index < activeStep || (index === 1 && name.trim())) {
                  setActiveStep(index);
                }
              }}
              sx={{ cursor: 'pointer' }}
            >
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: mode === 'dialog' ? '0.75rem' : '0.8125rem',
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

      {/* Step Contents */}
      <Box sx={{ minHeight: 340 }}>
        {/* STEP 0: Идентификация */}
        {activeStep === 0 && (
          <Stack spacing={2.5}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ mb: 0.5 }}>
                Основные реквизиты единицы оборудования
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Укажите официальное наименование, инвентарные и серийные номера оборудования
              </Typography>
            </Paper>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Наименование оборудования *"
                  placeholder="например: Центробежный насос подачи охлаждающей воды"
                  required
                  fullWidth
                  size="small"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Инвентарный номер"
                  placeholder="EQ-2024-001"
                  fullWidth
                  size="small"
                  value={inventoryNumber}
                  onChange={(e) => setInventoryNumber(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Заводской / Серийный номер"
                  placeholder="SN-998234-A"
                  fullWidth
                  size="small"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Производитель (Бренд)"
                  placeholder="Siemens / Grundfos / KSB"
                  fullWidth
                  size="small"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Модель / Модификация"
                  placeholder="CR 15-3 / 11 кВт"
                  fullWidth
                  size="small"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Место установки (Цех, участок, позиция)"
                  placeholder="Цех №1, насосная станция оборотного водоснабжения, поз. Н-1"
                  fullWidth
                  size="small"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </Grid>
            </Grid>
          </Stack>
        )}

        {/* STEP 1: Технические параметры */}
        {activeStep === 1 && (
          <Stack spacing={3}>
            {sections.length === 0 && unassignedFields.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: '8px' }}>
                В системе пока не настроены динамические секции и кастомные поля. Вы можете продолжить создание оборудования.
              </Alert>
            ) : (
              <>
                {sections.map((sec) => (
                  <Paper
                    key={sec.id}
                    elevation={0}
                    sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      {sec.icon && SECTION_ICONS[sec.icon] ? (
                        SECTION_ICONS[sec.icon]
                      ) : (
                        <TuneIcon color="primary" sx={{ fontSize: 20 }} />
                      )}
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                          {sec.name}
                        </Typography>
                        {sec.description && (
                          <Typography variant="caption" color="text.secondary">
                            {sec.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Grid container spacing={2}>
                      {sec.fields.map(renderFieldInput)}
                    </Grid>
                  </Paper>
                ))}

                {unassignedFields.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ mb: 2 }}>
                      Дополнительные параметры
                    </Typography>
                    <Grid container spacing={2}>
                      {unassignedFields.map(renderFieldInput)}
                    </Grid>
                  </Paper>
                )}
              </>
            )}
          </Stack>
        )}

        {/* STEP 2: Классификация и ввод в эксплуатацию */}
        {activeStep === 2 && (
          <Stack spacing={2.5}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ mb: 0.5 }}>
                Статус жизненного цикла и метки классификации
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Назначьте теги технологической цепочки и укажите дату ввода в эксплуатацию
              </Typography>
            </Paper>

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="equipment-status-select-label">Статус оборудования</InputLabel>
                  <Select
                    labelId="equipment-status-select-label"
                    label="Статус оборудования"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, val]) => (
                      <MenuItem key={key} value={key}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusBadge status={key} />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePickerField
                  label="Дата ввода в эксплуатацию"
                  value={commissionDate}
                  onChange={(val) => setCommissionDate(val || '')}
                  size="small"
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} color="#334155" sx={{ mb: 1.25 }}>
                  Метки и теги оборудования
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', minHeight: 80, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {tags.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Теги пока не созданы в справочнике
                    </Typography>
                  ) : (
                    tags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <Chip
                          key={tag.id}
                          label={tag.name}
                          onClick={() => {
                            setSelectedTagIds((prev) =>
                              isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                            );
                          }}
                          color={isSelected ? 'primary' : 'default'}
                          variant={isSelected ? 'filled' : 'outlined'}
                          sx={{
                            fontWeight: 600,
                            borderRadius: '6px',
                            borderColor: tag.color || undefined,
                          }}
                        />
                      );
                    })
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        )}

        {/* STEP 3: Проверка и сводка */}
        {activeStep === 3 && (
          <Stack spacing={2.5}>
            <Alert severity="success" sx={{ borderRadius: '8px' }}>
              Все параметры заполнены. Проверьте сводные данные паспорта оборудования перед сохранением:
            </Alert>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px' }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
                {name || '—'}
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Инвентарный номер:</Typography>
                  <Typography variant="body2" fontWeight={600}>{inventoryNumber || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Серийный номер:</Typography>
                  <Typography variant="body2" fontWeight={600}>{serialNumber || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Производитель / Модель:</Typography>
                  <Typography variant="body2" fontWeight={600}>{`${manufacturer || '—'} ${model || ''}`}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Локация:</Typography>
                  <Typography variant="body2" fontWeight={600}>{location || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Статус:</Typography>
                  <Box sx={{ mt: 0.5 }}><StatusBadge status={status} /></Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Дата ввода:</Typography>
                  <Typography variant="body2" fontWeight={600}>{commissionDate || '—'}</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Custom Sections Review Cards */}
            {sections.map((sec) => {
              const secFilledFields = sec.fields.filter((f) => {
                const val = customFieldValues[f.key];
                return val !== undefined && val !== null && val !== '';
              });

              if (secFilledFields.length === 0) return null;

              return (
                <Paper key={sec.id} variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    {sec.icon && SECTION_ICONS[sec.icon] ? (
                      SECTION_ICONS[sec.icon]
                    ) : (
                      <TuneIcon color="primary" sx={{ fontSize: 18 }} />
                    )}
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                      {sec.name}
                    </Typography>
                  </Box>
                  <Grid container spacing={1.5}>
                    {secFilledFields.map((f) => {
                      const val = customFieldValues[f.key];
                      const displayVal = typeof val === 'boolean' ? (val ? 'Да' : 'Нет') : String(val);
                      return (
                        <Grid item xs={12} sm={6} key={f.key}>
                          <Typography variant="caption" color="text.secondary">
                            {f.name}:
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {displayVal}
                            </Typography>
                            {f.unit && (
                              <Chip
                                label={f.unit}
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                              />
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Footer Navigation & Dual Submit Buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 2.5,
          mt: 3,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onCancel && (
            <Button
              variant="text"
              onClick={onCancel}
              disabled={isSubmitting}
              sx={{ color: 'text.secondary', fontWeight: 600, height: 38 }}
            >
              Отмена
            </Button>
          )}
          {activeStep > 0 && (
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handlePrevStep}
              disabled={isSubmitting}
              sx={{
                height: 38,
                borderRadius: '8px',
                borderColor: '#e2e8f0',
                color: '#334155',
                px: 2,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Назад
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
          {activeStep < WIZARD_STEPS.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNextStep}
              disabled={isSubmitting}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                px: 2.5,
                backgroundColor: '#0284c7',
                '&:hover': { backgroundColor: '#0369a1' },
              }}
            >
              Далее
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => handleSave(false)}
                disabled={isSubmitting || !name.trim()}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  px: 2,
                }}
              >
                Сохранить в черновик
              </Button>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => handleSave(true)}
                disabled={isSubmitting || !name.trim()}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  px: 2.25,
                  backgroundColor: '#0284c7',
                  '&:hover': { backgroundColor: '#0369a1' },
                }}
              >
                Отправить на согласование
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default EquipmentWizardForm;
