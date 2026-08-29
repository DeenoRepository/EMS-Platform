'use client';

import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';

export type TableDensity = 'compact' | 'standard' | 'comfortable';

export interface DensityToggleProps {
  currentDensity: TableDensity;
  onChange: (d: TableDensity) => void;
}

export function DensityToggle({ currentDensity, onChange }: DensityToggleProps) {
  return (
    <Tooltip title="Плотность строк">
      <Box
        sx={{
          display: 'flex',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          p: 0.25,
          bgcolor: 'background.paper',
        }}
      >
        <IconButton
          size="small"
          onClick={() => onChange('compact')}
          sx={{
            p: 0.5,
            borderRadius: '6px',
            color: currentDensity === 'compact' ? 'primary.main' : 'text.secondary',
            backgroundColor: currentDensity === 'compact' ? 'action.selected' : 'transparent',
          }}
        >
          <ViewListIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onChange('standard')}
          sx={{
            p: 0.5,
            borderRadius: '6px',
            color: currentDensity === 'standard' ? 'primary.main' : 'text.secondary',
            backgroundColor: currentDensity === 'standard' ? 'action.selected' : 'transparent',
          }}
        >
          <ViewModuleIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Tooltip>
  );
}
