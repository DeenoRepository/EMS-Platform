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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
    commissionDate: '',
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
            // Инициализация значений по умолчанию
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
    <Box>
      <PageHeader
        title="Добавление единицы оборудования"
        subtitle="Регистрация нового паспорта оборудования в системе EPS"
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
            {/* Main Information */}
            <Grid item xs={12} md={8}>
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Основные сведения
                  </Typography>
                  <Divider sx={{ mb: 2.5 }} />

                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <TextField
                        label="Наименование оборудования"
                        placeholder="например: Центробежный насос подачи охлаждающей воды"
                        required
                        fullWidth
                        size="small"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Инвентарный номер"
                        placeholder="EQ-2024-001"
                        fullWidth
                        size="small"
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
                        size="small"
                        value={formData.serialNumber}
                        onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Производитель"
                        placeholder="Grundfos, Siemens, etc."
                        fullWidth
                        size="small"
                        value={formData.manufacturer}
                        onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Модель / Тип"
                        placeholder="NB 50-200/219"
                        fullWidth
                        size="small"
                        value={formData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        label="Локация / Место установки"
                        placeholder="Цех №1, Насосная станция, поз. Н-1"
                        fullWidth
                        size="small"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Dynamic Custom Fields Card */}
              {customFieldDefs.length > 0 && (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Дополнительные характеристики (Кастомные поля)
                    </Typography>
                    <Divider sx={{ mb: 2.5 }} />

                    <Grid container spacing={2.5}>
                      {customFieldDefs.map((def) => {
                        if (def.fieldType === 'BOOLEAN') {
                          return (
                            <Grid item xs={12} sm={6} key={def.key}>
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
                                    <Typography variant="body2" fontWeight={500}>
                                      {def.name}
                                    </Typography>
                                  </Box>
                                }
                              />
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

                        return (
                          <Grid item xs={12} sm={6} key={def.key}>
                            <TextField
                              label={def.name}
                              type={def.fieldType === 'NUMBER' ? 'number' : def.fieldType === 'DATE' ? 'date' : 'text'}
                              InputLabelProps={def.fieldType === 'DATE' ? { shrink: true } : undefined}
                              fullWidth
                              size="small"
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

            {/* Sidebar Controls */}
            <Grid item xs={12} md={4}>
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Параметры и классификация
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                      select
                      label="Текущий статус"
                      fullWidth
                      size="small"
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
                      size="small"
                      value={formData.commissionDate}
                      onChange={(e) => handleInputChange('commissionDate', e.target.value)}
                    />

                    <FormControl fullWidth size="small">
                      <InputLabel id="tags-select-label">Теги / Группы</InputLabel>
                      <Select
                        labelId="tags-select-label"
                        multiple
                        value={selectedTagIds}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedTagIds(typeof val === 'string' ? val.split(',') : val);
                        }}
                        input={<OutlinedInput label="Теги / Группы" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((tagId) => {
                              const tag = tags.find((t) => t.id === tagId);
                              return <Chip key={tagId} label={tag ? tag.name : tagId} size="small" />;
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

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                startIcon={<SaveIcon />}
                disabled={saving}
                sx={{ py: 1.5, fontWeight: 600 }}
              >
                {saving ? <CircularProgress size={24} color="inherit" /> : 'Зарегистрировать оборудование'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
