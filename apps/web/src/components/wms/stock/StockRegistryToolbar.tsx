'use client';

import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { SearchInput, FilterToolbar } from '@/components/ui';
import { WarehouseSelect } from '@/components/wms';
import { WarehouseOption, ZoneOption, CategoryOption } from './types';

interface StockRegistryToolbarProps {
  search: string;
  selectedWarehouse: string;
  selectedZone: string;
  selectedCategory: string;
  lowStockOnly: boolean;
  viewMode: 'table' | 'grid';
  activeFilterCount: number;
  warehouses: WarehouseOption[];
  zones: ZoneOption[];
  categories: CategoryOption[];
  isAdmin: boolean;
  currentUserId?: string;
  onSearchChange: (val: string) => void;
  onWarehouseChange: (val: string) => void;
  onZoneChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onToggleLowStock: (val: boolean) => void;
  onViewModeChange: (mode: 'table' | 'grid') => void;
  onResetFilters: () => void;
}

export function StockRegistryToolbar({
  search,
  selectedWarehouse,
  selectedZone,
  selectedCategory,
  lowStockOnly,
  viewMode,
  activeFilterCount,
  warehouses,
  zones,
  categories,
  isAdmin,
  currentUserId,
  onSearchChange,
  onWarehouseChange,
  onZoneChange,
  onCategoryChange,
  onToggleLowStock,
  onViewModeChange,
  onResetFilters,
}: StockRegistryToolbarProps) {
  return (
    <FilterToolbar
      variant="embedded"
      activeFilterCount={activeFilterCount}
      onResetFilters={onResetFilters}
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <WarehouseSelect
            value={selectedWarehouse}
            onChange={(val) => {
              onWarehouseChange(val);
              onZoneChange('');
            }}
            warehouses={warehouses}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />

          {selectedWarehouse && zones.length > 0 && (
            <TextField
              select
              size="small"
              value={selectedZone}
              onChange={(e) => onZoneChange(e.target.value)}
              SelectProps={{ displayEmpty: true }}
              sx={{
                minWidth: 150,
                bgcolor: 'background.paper',
                '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
              }}
            >
              <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все зоны хранения</MenuItem>
              {zones.map((z) => (
                <MenuItem key={z.id} value={z.id} sx={{ fontSize: '0.8125rem' }}>
                  {z.name} ({z.code})
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            size="small"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            SelectProps={{ displayEmpty: true }}
            sx={{
              minWidth: 160,
              bgcolor: 'background.paper',
              '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
            }}
          >
            <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все товарные группы</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.8125rem' }}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={lowStockOnly}
                onChange={(e) => onToggleLowStock(e.target.checked)}
                color="error"
              />
            }
            label="Только дефицит"
            sx={{
              m: 0,
              px: 1,
              py: 0.25,
              borderRadius: '8px',
              bgcolor: lowStockOnly ? 'error.light' : 'action.hover',
              border: '1px solid',
              borderColor: lowStockOnly ? 'error.main' : 'divider',
              '& .MuiFormControlLabel-label': {
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: lowStockOnly ? 'error.dark' : 'text.primary',
              },
            }}
          />

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
          value={search}
          placeholder="Поиск по наименованию, артикулу..."
          onSearch={onSearchChange}
        />
      </Box>
    </FilterToolbar>
  );
}
