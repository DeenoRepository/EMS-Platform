import React from 'react';
import {
  Box,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  ExportButton,
  FilterToolbar,
  SearchInput,
  type ExportFormat,
} from '@/components/ui';
import { WarehouseSelect } from '@/components/wms';
import type { CategoryOption, StockRow, WarehouseOption, ZoneOption } from '@/app/wms/stock/page';

export interface WmsStockFiltersProps {
  activeFilterCount: number;
  selectedWarehouse: string;
  selectedZone: string;
  selectedCategory: string;
  search: string;
  lowStockOnly: boolean;
  warehouses: WarehouseOption[];
  zones: ZoneOption[];
  categories: CategoryOption[];
  items: StockRow[];
  currentUserId?: string;
  canManageSettings: boolean;
  onResetFilters: () => void;
  onWarehouseChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLowStockChange: (value: boolean) => void;
  onSearchChange: (value: string) => void;
  onExport: (format: ExportFormat) => void;
}

export function WmsStockFilters({
  activeFilterCount,
  selectedWarehouse,
  selectedZone,
  selectedCategory,
  search,
  lowStockOnly,
  warehouses,
  zones,
  categories,
  items,
  currentUserId,
  canManageSettings,
  onResetFilters,
  onWarehouseChange,
  onZoneChange,
  onCategoryChange,
  onLowStockChange,
  onSearchChange,
  onExport,
}: WmsStockFiltersProps) {
  return (
    <FilterToolbar
      variant="embedded"
      activeFilterCount={activeFilterCount}
      onResetFilters={onResetFilters}
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <WarehouseSelect
            value={selectedWarehouse}
            onChange={onWarehouseChange}
            warehouses={warehouses}
            isAdmin={canManageSettings}
            currentUserId={currentUserId}
          />

          {selectedWarehouse && zones.length > 0 && (
            <TextField
              select
              size="small"
              value={selectedZone}
              onChange={(event) => onZoneChange(event.target.value)}
              SelectProps={{ displayEmpty: true }}
              sx={{
                minWidth: 140,
                backgroundColor: 'background.paper',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  height: 36,
                  '& fieldset': { borderColor: 'divider' },
                  '&:hover fieldset': { borderColor: 'grey.400' },
                },
              }}
            >
              <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все зоны</MenuItem>
              {zones.map((zone) => (
                <MenuItem key={zone.id} value={zone.id} sx={{ fontSize: '0.8125rem' }}>
                  {zone.name} ({zone.code})
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            size="small"
            value={selectedCategory}
            onChange={(event) => onCategoryChange(event.target.value)}
            SelectProps={{ displayEmpty: true }}
            sx={{
              minWidth: 160,
              backgroundColor: 'background.paper',
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: '0.8125rem',
                height: 36,
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'grey.400' },
              },
            }}
          >
            <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все категории</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id} sx={{ fontSize: '0.8125rem' }}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={lowStockOnly}
                color="warning"
                size="small"
                onChange={(event) => onLowStockChange(event.target.checked)}
              />
            }
            label={
              <Typography
                variant="body2"
                fontWeight={600}
                color={lowStockOnly ? 'warning.dark' : 'text.primary'}
                sx={{ fontSize: '0.8125rem' }}
              >
                Только дефицит
              </Typography>
            }
            sx={{ m: 0 }}
          />
          <ExportButton
            onExport={onExport}
            formats={['xlsx', 'csv']}
            disabled={items.length === 0}
          />
        </Box>
      }
    >
      <Box sx={{ minWidth: { xs: '100%', sm: 260, md: 320 }, flexGrow: 1 }}>
        <SearchInput
          value={search}
          placeholder="Поиск по названию или артикулу..."
          onSearch={onSearchChange}
        />
      </Box>
    </FilterToolbar>
  );
}

export default WmsStockFilters;
