'use client';

import React from 'react';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import CategoryIcon from '@mui/icons-material/Category';
import SpeedIcon from '@mui/icons-material/Speed';
import ShieldIcon from '@mui/icons-material/Shield';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import StraightenIcon from '@mui/icons-material/Straighten';
import EquipmentCustomFieldRenderer from './EquipmentCustomFieldRenderer';
import type { CustomFieldDef, CustomSectionDef } from './EquipmentWizardForm';

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

interface EquipmentWizardStepTechnicalProps {
  sections: CustomSectionDef[];
  unassignedFields: CustomFieldDef[];
  customFieldValues: Record<string, any>;
  onCustomFieldChange: (key: string, value: any) => void;
}

export function EquipmentWizardStepTechnical({
  sections,
  unassignedFields,
  customFieldValues,
  onCustomFieldChange,
}: EquipmentWizardStepTechnicalProps) {
  const renderFieldInput = (definition: CustomFieldDef) => (
    <EquipmentCustomFieldRenderer
      key={definition.key}
      definition={definition}
      value={customFieldValues[definition.key]}
      onChange={onCustomFieldChange}
    />
  );

  return (
    <Stack spacing={3}>
      {sections.length === 0 && unassignedFields.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: '8px' }}>
          В системе пока не настроены динамические секции и кастомные поля. Вы можете продолжить создание оборудования.
        </Alert>
      ) : (
        <>
          {sections.map((section) => (
            <Paper key={section.id} elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid divider', bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                {section.icon && SECTION_ICONS[section.icon] ? SECTION_ICONS[section.icon] : <TuneIcon color="primary" sx={{ fontSize: 20 }} />}
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary">{section.name}</Typography>
                  {section.description && <Typography variant="caption" color="text.secondary">{section.description}</Typography>}
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, width: '100%' }}>
                {section.fields.map(renderFieldInput)}
              </Box>
            </Paper>
          ))}
          {unassignedFields.length > 0 && (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid divider', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 2 }}>Дополнительные параметры</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, width: '100%' }}>
                {unassignedFields.map(renderFieldInput)}
              </Box>
            </Paper>
          )}
        </>
      )}
    </Stack>
  );
}
