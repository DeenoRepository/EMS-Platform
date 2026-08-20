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
  OutlinedInput,
  FormControlLabel,
  Switch,
  Divider,
  InputAdornment,
  Chip,
  Alert,
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
import { useSnackbar } from 'notistack';
import { FormDialog, StatusBadge, DatePickerField } from '@/components/ui';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';

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

export interface EquipmentWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newEquipmentId: string) => void;
}

export default function EquipmentWizardDialog({
  open,
  onClose,
  onSuccess,
}: EquipmentWizardDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  // Stepper State (0: Идентификация, 1: Технические параметры, 2: Классификация и статус)
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setName('');
      setInventoryNumber('');
      setSerialNumber('');
      setManufacturer('');
      setModel('');
      setLocation('');
      setStatus('ACTIVE');
      setCommissionDate(new Date().toISOString().split('T')[0]);
      setSelectedTagIds([]);

      // Load Metadata
      Promise.all([
        fetch('/api/eps/tags').then((r) => r.json()),
        fetch('/api/eps/custom-sections').then((r) => r.json()),
      ])
        .then(([tagsJson, sectionsJson]) => {
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
        })
        .catch(console.error);
    }
  }, [open]);

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
    setActiveStep((prev) => Math.min(prev + 1, 2));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

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
      };

      const res = await fetch('/api/eps/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data) {
        enqueueSnackbar('Паспорт оборудования успешно зарегистрирован в EPS', { variant: 'success' });
        onSuccess(data.data.id);
        onClose();
      } else {
        enqueueSnackbar(data.error || 'Ошибка при сохранении оборудования', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при регистрации оборудования', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Мастер регистрации оборудования"
      subtitle="Пошаговое создание паспорта станка или агрегата в реестре EPS"
      icon={<PrecisionManufacturingIcon />}
      maxWidth="md"
      steps={[
        '1. Идентификация и размещение',
        '2. Технические характеристики',
        '3. Классификация и ввод в эксплуатацию',
      ]}
      activeStep={activeStep}
      onStepChange={(step) => setActiveStep(step)}
      hideActions
    >
      <Box sx={{ mt: 1.5 }}>
        {/* STEP 0: Идентификация */}
        {activeStep === 0 && (
          <Stack spacing={2.5}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ mb: 0.5 }}>
                Основные реквизиты единицы оборудования
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Укажите официальное заводское наименование, инвентарные и серийные номера
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
                  helperText="Уникальный учетный номер предприятия"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Заводской / Серийный номер"
                  placeholder="GR-8842-A"
                  fullWidth
                  size="small"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  helperText="Номер на шильдике завода-изготовителя"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Завод-изготовитель"
                  placeholder="Grundfos, Siemens, etc."
                  fullWidth
                  size="small"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Модель / Модификация"
                  placeholder="NB 50-200/219"
                  fullWidth
                  size="small"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Место установки (Цех, участок, позиция)"
                  placeholder="Цех №1, Насосная станция, поз. Н-1"
                  fullWidth
                  size="small"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button
                variant="contained"
                onClick={handleNextStep}
                disabled={!name.trim()}
                sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}
              >
                Далее: Технические параметры →
              </Button>
            </Box>
          </Stack>
        )}

        {/* STEP 1: Технические параметры */}
        {activeStep === 1 && (
          <Stack spacing={2.5}>
            {sections.length === 0 && unassignedFields.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: '8px' }}>
                Кастомные технические разделы не настроены. Вы можете перейти к следующему шагу.
              </Alert>
            ) : (
              sections.map((sec) => (
                <Paper
                  key={sec.id}
                  elevation={0}
                  sx={{ p: 2, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                    {SECTION_ICONS[sec.icon || 'Bolt'] || <TuneIcon color="primary" />}
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
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {sec.fields.map((def) => renderFieldInput(def))}
                  </Grid>
                </Paper>
              ))
            )}

            {unassignedFields.length > 0 && (
              <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                  <TuneIcon color="primary" />
                  <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                    Дополнительные параметры
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {unassignedFields.map((def) => renderFieldInput(def))}
                </Grid>
              </Paper>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setActiveStep(0)} sx={{ fontWeight: 600 }}>
                ← Назад
              </Button>
              <Button
                variant="contained"
                onClick={handleNextStep}
                sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}
              >
                Далее: Классификация и статус →
              </Button>
            </Box>
          </Stack>
        )}

        {/* STEP 2: Классификация и статус */}
        {activeStep === 2 && (
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Текущий статус оборудования"
                  fullWidth
                  size="small"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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
                  size="small"
                  value={commissionDate}
                  onChange={(val) => setCommissionDate(val || '')}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small">
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

            {/* Summary Review */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ mb: 1.5 }}>
                Сводный паспорт оборудования к регистрации:
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={8}>
                  <Typography variant="caption" color="text.secondary">
                    Наименование:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#0f172a">
                    {name}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Статус:
                  </Typography>
                  <Box sx={{ mt: 0.25 }}>
                    <StatusBadge status={status} />
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Инв. номер:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a">
                    {inventoryNumber || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Серийный номер:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a">
                    {serialNumber || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Локация:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a">
                    {location || '—'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setActiveStep(1)} sx={{ fontWeight: 600 }}>
                ← Назад к параметрам
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleSubmit}
                disabled={isSubmitting || !name.trim()}
                sx={{ borderRadius: '8px', px: 4, fontWeight: 700 }}
              >
                {isSubmitting ? 'Регистрация...' : 'Зарегистрировать оборудование'}
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </FormDialog>
  );
}
