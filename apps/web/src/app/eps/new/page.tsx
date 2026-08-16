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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PlaceIcon from '@mui/icons-material/Place';
import TuneIcon from '@mui/icons-material/Tune';
import CategoryIcon from '@mui/icons-material/Category';
import PageHeader from '@/components/layout/PageHeader';
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
  key: string;
  name: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  isRequired: boolean;
  defaultValue: string | null;
  options?: string[];
}

export default function NewEquipmentPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [saving, setSaving] = useState(false);
  const [loadingDefs, setLoadingDefs] = useState(true);

  // Available metadata
  const [tags, setTags] = useState<TagItem[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);

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
        const [tagsRes, fieldsRes] = await Promise.all([
          fetch('/api/eps/tags'),
          fetch('/api/eps/custom-fields'),
        ]);

        if (tagsRes.ok && fieldsRes.ok) {
          const tagsJson = await tagsRes.json();
          const fieldsJson = await fieldsRes.json();

          if (tagsJson.success) setTags(tagsJson.data);
          if (fieldsJson.success) {
            setCustomFieldDefs(fieldsJson.data);
            const initialVals: Record<string, any> = {};
            fieldsJson.data.forEach((f: CustomFieldDef) => {
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
        title="Добавление единицы оборудования"
        subtitle="Регистрация нового паспорта оборудования в едином реестре EPS"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Новая единица' },
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
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Card>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Left Column (65% on FHD) */}
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
              <Card sx={{ mb: 3 }}>
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

              {/* Section 3: Dynamic Custom Fields */}
              {customFieldDefs.length > 0 && (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <TuneIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Технические параметры (Кастомные характеристики)
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" paragraph>
                      Параметры, сконфигурированные для паспортов оборудования
                    </Typography>
                    <Divider sx={{ mb: 2.5 }} />

                    <Grid container spacing={2.5}>
                      {customFieldDefs.map((def) => {
                        if (def.fieldType === 'BOOLEAN') {
                          return (
                            <Grid item xs={12} sm={6} key={def.key}>
                              <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center' }}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={Boolean(customFieldValues[def.key])}
                                      onChange={(e) => handleCustomFieldChange(def.key, e.target.checked)}
                                      color="primary"
                                    />
                                  }
                                  label={
                                    <Box>
                                      <Typography variant="body2" fontWeight={600}>
                                        {def.name}
                                      </Typography>
                                    </Box>
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

                        return (
                          <Grid item xs={12} sm={6} key={def.key}>
                            <TextField
                              label={def.name}
                              type={def.fieldType === 'NUMBER' ? 'number' : def.fieldType === 'DATE' ? 'date' : 'text'}
                              InputLabelProps={def.fieldType === 'DATE' ? { shrink: true } : undefined}
                              fullWidth
                              size="medium"
                              required={def.isRequired}
                              value={customFieldValues[def.key] || ''}
                              onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Right Column (35% on FHD) - Sticky Sidebar */}
            <Grid item xs={12} lg={4}>
              <Box sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <CategoryIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Классификация и статус
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2.5 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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

                      <TextField
                        label="Дата ввода в эксплуатацию"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        size="medium"
                        value={formData.commissionDate}
                        onChange={(e) => handleInputChange('commissionDate', e.target.value)}
                      />

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
                                  <Chip
                                    key={tagId}
                                    label={tag ? tag.name : tagId}
                                    size="small"
                                    sx={{
                                      backgroundColor: tag?.color ? `${tag.color}20` : undefined,
                                      color: tag?.color || 'inherit',
                                    }}
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
                    </Box>
                  </CardContent>
                </Card>

                {/* Submit & Cancel Actions Card */}
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<SaveIcon />}
                      disabled={saving}
                      sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem', mb: 1.5 }}
                    >
                      {saving ? <CircularProgress size={24} color="inherit" /> : 'Зарегистрировать оборудование'}
                    </Button>

                    <Button
                      variant="outlined"
                      size="medium"
                      fullWidth
                      color="inherit"
                      onClick={() => router.push('/eps')}
                    >
                      Отмена
                    </Button>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
