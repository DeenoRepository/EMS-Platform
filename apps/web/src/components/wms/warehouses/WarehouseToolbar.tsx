'use client';

import React from 'react';
import {
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { SearchInput } from '@/components/ui';

interface WarehouseToolbarProps {
  search: string;
  viewMode: 'grid' | 'table';
  onSearchChange: (value: string) => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
}

export function WarehouseToolbar({
  search,
  viewMode,
  onSearchChange,
  onViewModeChange,
}: WarehouseToolbarProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 2.5,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ maxWidth: 360, width: '100%' }}>
        <SearchInput
          placeholder="Поиск по названию, коду или кладовщику..."
          value={search}
          onSearch={onSearchChange}
        />
      </Box>

      <ToggleButtonGroup
        size="small"
        value={viewMode}
        exclusive
        onChange={(_, next) => next && onViewModeChange(next)}
        sx={{ bgcolor: 'action.hover' }}
      >
        <ToggleButton value="grid" aria-label="Сетка карточек">
          <GridViewIcon fontSize="small" sx={{ mr: 0.5 }} />
          Карточки
        </ToggleButton>
        <ToggleButton value="table" aria-label="Таблица">
          <TableRowsIcon fontSize="small" sx={{ mr: 0.5 }} />
          Таблица
        </ToggleButton>
      </ToggleButtonGroup>
    </Paper>
  );
}
