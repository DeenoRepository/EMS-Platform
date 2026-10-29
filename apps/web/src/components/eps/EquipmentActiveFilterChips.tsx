'use client';

import React from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { ActiveFilterItem, EquipmentFilters } from './EquipmentFilterTypes';

interface EquipmentActiveFilterChipsProps {
  activeBadges: ActiveFilterItem[];
  onResetSingle: (keysToReset: (keyof EquipmentFilters)[]) => void;
  onResetAll: () => void;
}

export function EquipmentActiveFilterChips({
  activeBadges,
  onResetSingle,
  onResetAll,
}: EquipmentActiveFilterChipsProps) {
  if (activeBadges.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        mb: 2,
        borderRadius: '8px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          mr: 0.5,
        }}
      >
        Активные фильтры ({activeBadges.length}):
      </Typography>

      {activeBadges.map((badge) => (
        <Box
          key={badge.key}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: '16px',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            fontSize: '0.75rem',
            color: 'text.primary',
          }}
        >
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {badge.label}:
          </Typography>
          <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>
            {badge.value}
          </Typography>
          <IconButton
            size="small"
            aria-label={`Удалить фильтр ${badge.label}`}
            onClick={() => onResetSingle(badge.keysToReset)}
            sx={{
              p: 0.25,
              ml: 0.25,
              color: 'text.disabled',
              '&:hover': { color: 'error.main', bgcolor: 'error.light' },
            }}
          >
            <CloseIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Box>
      ))}

      <Button
        size="small"
        variant="text"
        startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
        onClick={onResetAll}
        sx={{
          ml: 'auto',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'text.secondary',
          textTransform: 'none',
          py: 0.25,
          px: 1,
          '&:hover': { color: 'error.main' },
        }}
      >
        Сбросить все
      </Button>
    </Box>
  );
}

export default EquipmentActiveFilterChips;
