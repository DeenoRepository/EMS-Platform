'use client';

import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import FilterListIcon from '@mui/icons-material/FilterList';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { SearchInput, FilterToolbar } from '@/components/ui';
import { EquipmentActiveFilterChips, EquipmentFilters } from '@/components/eps';

const MIN_STATUS_WIDTH = 140;
const FONT_SEMI_BOLD = 600;

interface EquipmentRegistryToolbarProps {
  filters: EquipmentFilters;
  activeFilterCount: number;
  activeBadges: any[];
  showColumnFilters: boolean;
  viewMode: 'table' | 'grid';
  onFilterChange: (key: keyof EquipmentFilters, value: string) => void;
  onResetFilters: () => void;
  onResetSingleFilter: (keysToReset: (keyof EquipmentFilters)[]) => void;
  onOpenFilterDrawer: () => void;
  onToggleColumnFilters: () => void;
  onViewModeChange: (mode: 'table' | 'grid') => void;
}

export function EquipmentRegistryToolbar({
  filters,
  activeFilterCount,
  activeBadges,
  showColumnFilters,
  viewMode,
  onFilterChange,
  onResetFilters,
  onResetSingleFilter,
  onOpenFilterDrawer,
  onToggleColumnFilters,
  onViewModeChange,
}: EquipmentRegistryToolbarProps) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <FilterToolbar
        activeFilterCount={activeFilterCount}
        onResetFilters={onResetFilters}
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterAltIcon fontSize="small" />}
              onClick={onOpenFilterDrawer}
              sx={{ height: 36, borderRadius: '8px', fontSize: '0.8125rem', fontWeight: FONT_SEMI_BOLD, textTransform: 'none' }}
            >
              Все фильтры {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Button>

            <Tooltip title={showColumnFilters ? 'Скрыть фильтры в колонках' : 'Показать фильтры в колонках таблицы'}>
              <Button
                variant={showColumnFilters ? 'contained' : 'outlined'}
                color={showColumnFilters ? 'secondary' : 'inherit'}
                size="small"
                startIcon={<FilterListIcon fontSize="small" />}
                onClick={onToggleColumnFilters}
                sx={{ height: 36, borderRadius: '8px', fontSize: '0.8125rem', fontWeight: FONT_SEMI_BOLD, textTransform: 'none' }}
              >
                Фильтры колонок
              </Button>
            </Tooltip>

            <TextField
              select
              size="small"
              value={filters.status || ''}
              onChange={(e) => onFilterChange('status', e.target.value)}
              SelectProps={{ displayEmpty: true }}
              sx={{
                minWidth: MIN_STATUS_WIDTH,
                bgcolor: 'background.paper',
                '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
              }}
            >
              <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все статусы</MenuItem>
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                  {info.label}
                </MenuItem>
              ))}
            </TextField>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, mode) => mode && onViewModeChange(mode)}
              size="small"
              sx={{ height: 36 }}
            >
              <ToggleButton value="table" aria-label="табличный вид" sx={{ px: 1, py: 0.5, borderRadius: '8px' }}>
                <Tooltip title="Табличный вид">
                  <ViewListIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="grid" aria-label="сетка карточек" sx={{ px: 1, py: 0.5, borderRadius: '8px' }}>
                <Tooltip title="Сетка карточек">
                  <ViewModuleIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        }
      >
        <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
          <SearchInput
            value={filters.search || ''}
            placeholder="Поиск по наименованию, номеру..."
            onSearch={(val) => onFilterChange('search', val)}
          />
        </Box>
      </FilterToolbar>

      <EquipmentActiveFilterChips
        activeBadges={activeBadges}
        onResetSingle={onResetSingleFilter}
        onResetAll={onResetFilters}
      />
    </Box>
  );
}
