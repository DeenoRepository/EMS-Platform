'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { EquipmentFilters } from './EquipmentFilterTypes';
import { countActiveEquipmentFilters } from '@/lib/eps-filter-helpers';

interface EquipmentFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: EquipmentFilters;
  onApplyFilters: (filters: EquipmentFilters) => void;
  onResetFilters: () => void;
  tags?: { id: string; name: string }[];
}

export function EquipmentFilterDrawer({
  open,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  tags = [],
}: EquipmentFilterDrawerProps) {
  const [draft, setDraft] = useState<EquipmentFilters>(filters);

  useEffect(() => {
    if (open) {
      setDraft(filters);
    }
  }, [open, filters]);

  const handleChange = (field: keyof EquipmentFilters, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApplyFilters(draft);
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  const draftCount = countActiveEquipmentFilters(draft);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 460, md: 520 },
          p: 0,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterAltIcon color="primary" />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            Фильтры реестра
          </Typography>
          {draftCount > 0 && (
            <Box
              sx={{
                px: 1,
                py: 0.2,
                borderRadius: '12px',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {draftCount}
            </Box>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Закрыть панель фильтров">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Body with Accordion Sections */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        <PrimaryFieldsSection draft={draft} onChange={handleChange} tags={tags} />
        <ClassifiersSection draft={draft} onChange={handleChange} />
        <OperationalSection draft={draft} onChange={handleChange} />
        <DateRangesSection draft={draft} onChange={handleChange} />
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          gap: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Сбросить все
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={handleApply}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Применить ({draftCount})
        </Button>
      </Box>
    </Drawer>
  );
}

function PrimaryFieldsSection({
  draft,
  onChange,
  tags,
}: {
  draft: EquipmentFilters;
  onChange: (field: keyof EquipmentFilters, value: string) => void;
  tags: { id: string; name: string }[];
}) {
  return (
    <Accordion defaultExpanded elevation={0} sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: '8px', mb: 1.5 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>1. Основные реквизиты</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Инвентарный №" value={draft.inventoryNumber || ''} onChange={(e) => onChange('inventoryNumber', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Серийный №" value={draft.serialNumber || ''} onChange={(e) => onChange('serialNumber', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Наименование" value={draft.name || ''} onChange={(e) => onChange('name', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Производитель" value={draft.manufacturer || ''} onChange={(e) => onChange('manufacturer', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Модель / типоразмер" value={draft.model || ''} onChange={(e) => onChange('model', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Локация / установка" value={draft.location || ''} onChange={(e) => onChange('location', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth size="small" label="Статус" value={draft.status || ''} onChange={(e) => onChange('status', e.target.value)}>
              <MenuItem value="">Все статусы</MenuItem>
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth size="small" label="Тег" value={draft.tagId || ''} onChange={(e) => onChange('tagId', e.target.value)}>
              <MenuItem value="">Все теги</MenuItem>
              {tags.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

function ClassifiersSection({
  draft,
  onChange,
}: {
  draft: EquipmentFilters;
  onChange: (field: keyof EquipmentFilters, value: string) => void;
}) {
  return (
    <Accordion defaultExpanded elevation={0} sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: '8px', mb: 1.5 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>2. Классификаторы и износ</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Критичность" value={draft.criticality || ''} onChange={(e) => onChange('criticality', e.target.value)}>
              <MenuItem value="">Любая (A/B/C)</MenuItem>
              <MenuItem value="A">Категория A (Высокая)</MenuItem>
              <MenuItem value="B">Категория B (Средняя)</MenuItem>
              <MenuItem value="C">Категория C (Низкая)</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="Износ от (%)" type="number" inputProps={{ min: 0, max: 100 }} value={draft.wearMin || ''} onChange={(e) => onChange('wearMin', e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="Износ до (%)" type="number" inputProps={{ min: 0, max: 100 }} value={draft.wearMax || ''} onChange={(e) => onChange('wearMax', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Подразделение" value={draft.eqGroup || ''} onChange={(e) => onChange('eqGroup', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Вид оборудования" value={draft.eqType || ''} onChange={(e) => onChange('eqType', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Ответственный (МОЛ)" value={draft.respPerson || ''} onChange={(e) => onChange('respPerson', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Код ОКОФ" value={draft.okofCode || ''} onChange={(e) => onChange('okofCode', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Код ОКПД2" value={draft.okpd2Code || ''} onChange={(e) => onChange('okpd2Code', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Техпроцесс" value={draft.procCode || ''} onChange={(e) => onChange('procCode', e.target.value)} />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

function OperationalSection({
  draft,
  onChange,
}: {
  draft: EquipmentFilters;
  onChange: (field: keyof EquipmentFilters, value: string) => void;
}) {
  return (
    <Accordion elevation={0} sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: '8px', mb: 1.5 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>3. Эксплуатация, ТО и свойства</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Периодичность ТО" value={draft.maintPeriodicity || ''} onChange={(e) => onChange('maintPeriodicity', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Класс чистоты (ISO)" value={draft.cleanRoom || ''} onChange={(e) => onChange('cleanRoom', e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={6}>
            <TextField fullWidth size="small" label="Поверка от (мес)" type="number" value={draft.calibrationIntervalMin || ''} onChange={(e) => onChange('calibrationIntervalMin', e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={6}>
            <TextField fullWidth size="small" label="Поверка до (мес)" type="number" value={draft.calibrationIntervalMax || ''} onChange={(e) => onChange('calibrationIntervalMax', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Критич. путь" value={draft.isCriticalPath || ''} onChange={(e) => onChange('isCriticalPath', e.target.value)}>
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="true">Да</MenuItem>
              <MenuItem value="false">Нет</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Уникальное" value={draft.isUnique || ''} onChange={(e) => onChange('isUnique', e.target.value)}>
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="true">Да</MenuItem>
              <MenuItem value="false">Нет</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Импортное" value={draft.isImported || ''} onChange={(e) => onChange('isImported', e.target.value)}>
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="true">Да</MenuItem>
              <MenuItem value="false">Нет</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth size="small" label="Документы" value={draft.documentsFilter || ''} onChange={(e) => onChange('documentsFilter', e.target.value)}>
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="with">С документами</MenuItem>
              <MenuItem value="without">Без документов</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth size="small" label="Комплект ЗИП" value={draft.sparePartsFilter || ''} onChange={(e) => onChange('sparePartsFilter', e.target.value)}>
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="with">С запчастями</MenuItem>
              <MenuItem value="without">Без запчастей</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

function DateRangesSection({
  draft,
  onChange,
}: {
  draft: EquipmentFilters;
  onChange: (field: keyof EquipmentFilters, value: string) => void;
}) {
  return (
    <Accordion elevation={0} sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: '8px', mb: 1.5 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>4. Временные интервалы (Даты)</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
          Ввод в эксплуатацию:
        </Typography>
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="С даты" InputLabelProps={{ shrink: true }} value={draft.commissionDateFrom || ''} onChange={(e) => onChange('commissionDateFrom', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="По дату" InputLabelProps={{ shrink: true }} value={draft.commissionDateTo || ''} onChange={(e) => onChange('commissionDateTo', e.target.value)} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
          Дата первичной регистрации (создания):
        </Typography>
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="С даты" InputLabelProps={{ shrink: true }} value={draft.createdAtFrom || ''} onChange={(e) => onChange('createdAtFrom', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="По дату" InputLabelProps={{ shrink: true }} value={draft.createdAtTo || ''} onChange={(e) => onChange('createdAtTo', e.target.value)} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
          Дата последней корректировки:
        </Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="С даты" InputLabelProps={{ shrink: true }} value={draft.updatedAtFrom || ''} onChange={(e) => onChange('updatedAtFrom', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="По дату" InputLabelProps={{ shrink: true }} value={draft.updatedAtTo || ''} onChange={(e) => onChange('updatedAtTo', e.target.value)} />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

export default EquipmentFilterDrawer;
