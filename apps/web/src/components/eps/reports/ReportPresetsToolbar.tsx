import React from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from '@mui/material';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkOutlinedIcon from '@mui/icons-material/BookmarkOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TableChartIcon from '@mui/icons-material/TableChart';
import type { SavedTemplate } from '@/app/eps/reports/page';
import type { IndustryPreset } from './ReportColumnBuilderDialog';

export interface ReportPresetsToolbarProps {
  presets: IndustryPreset[];
  templates: SavedTemplate[];
  activePresetOrTemplateId: string | null;
  canManageTemplates: boolean;
  onApplyPreset: (preset: IndustryPreset) => void;
  onApplyTemplate: (template: SavedTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onSaveTemplate: () => void;
}

export function ReportPresetsToolbar({
  presets,
  templates,
  activePresetOrTemplateId,
  canManageTemplates,
  onApplyPreset,
  onApplyTemplate,
  onDeleteTemplate,
  onSaveTemplate,
}: ReportPresetsToolbarProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 2.5,
        borderRadius: '10px',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <TableChartIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
          Пресеты:
        </Typography>
        {presets.map((preset) => (
          <Chip
            key={preset.id}
            label={preset.name}
            size="small"
            variant={activePresetOrTemplateId === preset.id ? 'filled' : 'outlined'}
            color={activePresetOrTemplateId === preset.id ? 'primary' : 'default'}
            onClick={() => onApplyPreset(preset)}
            clickable
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        ))}

        {templates.map((template) => (
          <Chip
            key={template.id}
            icon={<BookmarkOutlinedIcon sx={{ fontSize: 14 }} />}
            label={template.name}
            size="small"
            variant={activePresetOrTemplateId === `tmpl_${template.id}` ? 'filled' : 'outlined'}
            color={activePresetOrTemplateId === `tmpl_${template.id}` ? 'primary' : 'default'}
            onClick={() => onApplyTemplate(template)}
            onDelete={canManageTemplates ? () => onDeleteTemplate(template.id) : undefined}
            deleteIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
            clickable
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        ))}
      </Box>

      <Button
        size="small"
        startIcon={<BookmarkAddOutlinedIcon />}
        onClick={onSaveTemplate}
        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
      >
        Сохранить шаблон
      </Button>
    </Paper>
  );
}

export default ReportPresetsToolbar;
