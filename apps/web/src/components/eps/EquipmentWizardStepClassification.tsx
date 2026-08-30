'use client';

import { Box, Chip, FormControl, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { DatePickerField, StatusBadge } from '@/components/ui';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import type { TagItem } from './EquipmentWizardForm';

interface EquipmentWizardStepClassificationProps {
  status: string;
  commissionDate: string;
  tags: TagItem[];
  selectedTagIds: string[];
  onStatusChange: (value: string) => void;
  onCommissionDateChange: (value: string) => void;
  onToggleTag: (tagId: string) => void;
}

export function EquipmentWizardStepClassification({
  status,
  commissionDate,
  tags,
  selectedTagIds,
  onStatusChange,
  onCommissionDateChange,
  onToggleTag,
}: EquipmentWizardStepClassificationProps) {
  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', bgcolor: 'background.default', border: '1px solid divider' }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
          Статус жизненного цикла и метки классификации
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Назначьте теги технологической цепочки и укажите дату ввода в эксплуатацию
        </Typography>
      </Paper>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, width: '100%' }}>
        <Box>
          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>Статус оборудования</Typography>
          <FormControl fullWidth size="small">
            <Select value={status} onChange={(event) => onStatusChange(event.target.value)}>
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([key]) => (
                <MenuItem key={key} value={key}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><StatusBadge status={key} /></Box></MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>Дата ввода в эксплуатацию</Typography>
          <DatePickerField value={commissionDate} onChange={(value) => onCommissionDateChange(value || '')} size="small" fullWidth />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.25 }}>Метки и теги оборудования</Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', minHeight: 80, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tags.length === 0 ? <Typography variant="body2" color="text.secondary">Теги пока не созданы в справочнике</Typography> : tags.map((tag) => {
              const tagIsSelected = selectedTagIds.includes(tag.id);
              return <Chip key={tag.id} label={tag.name} onClick={() => onToggleTag(tag.id)} color={tagIsSelected ? 'primary' : 'default'} variant={tagIsSelected ? 'filled' : 'outlined'} sx={{ fontWeight: 600, borderRadius: '6px', borderColor: tag.color || undefined }} />;
            })}
          </Paper>
        </Box>
      </Box>
    </Stack>
  );
}
