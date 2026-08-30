'use client';

import { Box, Paper, Stack, TextField, Typography } from '@mui/material';

interface EquipmentWizardStepIdentificationProps {
  name: string;
  inventoryNumber: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  location: string;
  onNameChange: (value: string) => void;
  onInventoryNumberChange: (value: string) => void;
  onSerialNumberChange: (value: string) => void;
  onManufacturerChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onLocationChange: (value: string) => void;
}

export function EquipmentWizardStepIdentification({
  name,
  inventoryNumber,
  serialNumber,
  manufacturer,
  model,
  location,
  onNameChange,
  onInventoryNumberChange,
  onSerialNumberChange,
  onManufacturerChange,
  onModelChange,
  onLocationChange,
}: EquipmentWizardStepIdentificationProps) {
  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', bgcolor: 'background.default', border: '1px solid divider' }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
          Основные реквизиты единицы оборудования
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Укажите официальное наименование, инвентарные и серийные номера оборудования
        </Typography>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, width: '100%' }}>
        <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
            Наименование оборудования <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <TextField placeholder="например: Центробежный насос подачи охлаждающей воды" required fullWidth size="small" value={name} onChange={(e) => onNameChange(e.target.value)} />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>Инвентарный номер</Typography>
          <TextField placeholder="например: EQ-2024-001" fullWidth size="small" value={inventoryNumber} onChange={(e) => onInventoryNumberChange(e.target.value)} />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>Заводской / Серийный номер</Typography>
          <TextField placeholder="например: SN-998234-A" fullWidth size="small" value={serialNumber} onChange={(e) => onSerialNumberChange(e.target.value)} />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>Производитель (Бренд)</Typography>
          <TextField placeholder="например: Siemens / Atlas Copco" fullWidth size="small" value={manufacturer} onChange={(e) => onManufacturerChange(e.target.value)} />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>Модель / Модификация</Typography>
          <TextField placeholder="например: GA 45 VSD+ / 11 кВт" fullWidth size="small" value={model} onChange={(e) => onModelChange(e.target.value)} />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>Место установки (Цех, участок, позиция)</Typography>
          <TextField placeholder="например: Компрессорный цех, поз. К-2" fullWidth size="small" value={location} onChange={(e) => onLocationChange(e.target.value)} />
        </Box>
      </Box>
    </Stack>
  );
}
