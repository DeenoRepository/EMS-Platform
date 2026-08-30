'use client';

import React from 'react';
import { Alert, Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { StatusBadge } from '@/components/ui';
import type { CustomFieldDef, CustomSectionDef } from './EquipmentWizardForm';

interface EquipmentWizardStepReviewProps {
  name: string;
  inventoryNumber: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  location: string;
  status: string;
  commissionDate: string;
  sections: CustomSectionDef[];
  customFieldValues: Record<string, any>;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Category: <span aria-hidden="true">◈</span>,
  Speed: <span aria-hidden="true">◉</span>,
  Shield: <span aria-hidden="true">◆</span>,
  Engineering: <span aria-hidden="true">⚙</span>,
  Bolt: <span aria-hidden="true">ϟ</span>,
  WaterDrop: <span aria-hidden="true">●</span>,
  Straighten: <span aria-hidden="true">↔</span>,
  Tune: <TuneIcon color="primary" />,
};

export function EquipmentWizardStepReview({
  name,
  inventoryNumber,
  serialNumber,
  manufacturer,
  model,
  location,
  status,
  commissionDate,
  sections,
  customFieldValues,
}: EquipmentWizardStepReviewProps) {
  return (
    <Stack spacing={2.5}>
      <Alert severity="success" sx={{ borderRadius: '8px' }}>
        Все параметры заполнены. Проверьте сводные данные паспорта оборудования перед сохранением:
      </Alert>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px' }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>{name || '—'}</Typography>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <ReviewItem label="Инвентарный номер" value={inventoryNumber} />
          <ReviewItem label="Серийный номер" value={serialNumber} />
          <ReviewItem label="Производитель / Модель" value={`${manufacturer || '—'} ${model || ''}`} />
          <ReviewItem label="Локация" value={location} />
          <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Статус:</Typography><Box sx={{ mt: 0.5 }}><StatusBadge status={status} /></Box></Grid>
          <ReviewItem label="Дата ввода" value={commissionDate} />
        </Grid>
      </Paper>
      {sections.map((section) => {
        const filledFields = section.fields.filter((field) => {
          const value = customFieldValues[field.key];
          return value !== undefined && value !== null && value !== '';
        });
        if (filledFields.length === 0) return null;
        return (
          <Paper key={section.id} variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              {section.icon && SECTION_ICONS[section.icon] ? SECTION_ICONS[section.icon] : <TuneIcon color="primary" sx={{ fontSize: 18 }} />}
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">{section.name}</Typography>
            </Box>
            <Grid container spacing={1.5}>
              {filledFields.map((field) => <ReviewField key={field.key} field={field} value={customFieldValues[field.key]} />)}
            </Grid>
          </Paper>
        );
      })}
    </Stack>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">{label}:</Typography><Typography variant="body2" fontWeight={600}>{value || '—'}</Typography></Grid>;
}

function ReviewField({ field, value }: { field: CustomFieldDef; value: any }) {
  const displayValue = typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : String(value);
  return <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">{field.name}:</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Typography variant="body2" fontWeight={600}>{displayValue}</Typography>{field.unit && <Chip label={field.unit} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />}</Box></Grid>;
}
