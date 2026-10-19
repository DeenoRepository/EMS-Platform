'use client';

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Stack,
  Button,
} from '@mui/material';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkOutlinedIcon from '@mui/icons-material/BookmarkOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { INDUSTRY_PRESETS, SavedTemplate } from './types';

const FONT_SEMI_BOLD = 600;

interface ReportPresetBarProps {
  activePresetOrTemplateId: string | null;
  selectedColumnCount: number;
  templates: SavedTemplate[];
  canManageTemplates: boolean;
  onApplyPreset: (id: string) => void;
  onApplyTemplate: (t: SavedTemplate) => void;
  onOpenColumnBuilder: () => void;
  onOpenSaveModal: () => void;
  onDeleteTemplate: (id: string) => void;
}

export function ReportPresetBar({
  activePresetOrTemplateId,
  selectedColumnCount,
  templates,
  canManageTemplates,
  onApplyPreset,
  onApplyTemplate,
  onOpenColumnBuilder,
  onOpenSaveModal,
  onDeleteTemplate,
}: ReportPresetBarProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2.5,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
          Типовые формы и шаблоны ведомостей:
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ViewColumnOutlinedIcon />}
            onClick={onOpenColumnBuilder}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: FONT_SEMI_BOLD, fontSize: '0.75rem' }}
          >
            Настроить колонки ({selectedColumnCount})
          </Button>
          {canManageTemplates && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<BookmarkAddOutlinedIcon />}
              onClick={onOpenSaveModal}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: FONT_SEMI_BOLD, fontSize: '0.75rem' }}
            >
              Сохранить как шаблон
            </Button>
          )}
        </Stack>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
        {INDUSTRY_PRESETS.map((p) => {
          const isActive = activePresetOrTemplateId === `preset_${p.id}`;
          return (
            <Chip
              key={p.id}
              label={p.name}
              size="small"
              clickable
              color={isActive ? 'primary' : 'default'}
              variant={isActive ? 'filled' : 'outlined'}
              onClick={() => onApplyPreset(p.id)}
              sx={{ fontWeight: FONT_SEMI_BOLD, borderRadius: '6px', fontSize: '0.75rem' }}
            />
          );
        })}

        {templates.map((t) => {
          const isActive = activePresetOrTemplateId === `tmpl_${t.id}`;
          return (
            <Chip
              key={t.id}
              icon={<BookmarkOutlinedIcon sx={{ fontSize: 14 }} />}
              label={t.name}
              size="small"
              clickable
              color={isActive ? 'secondary' : 'default'}
              variant={isActive ? 'filled' : 'outlined'}
              onClick={() => onApplyTemplate(t)}
              onDelete={canManageTemplates ? () => onDeleteTemplate(t.id) : undefined}
              deleteIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
              sx={{ fontWeight: FONT_SEMI_BOLD, borderRadius: '6px', fontSize: '0.75rem' }}
            />
          );
        })}
      </Stack>
    </Paper>
  );
}
