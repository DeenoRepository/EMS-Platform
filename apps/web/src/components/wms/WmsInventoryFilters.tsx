import React from 'react';
import {
  Box,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  FilterToolbar,
  SearchInput,
} from '@/components/ui';

export interface WmsInventoryFilterWarehouse {
  id: string;
  name: string;
  code: string;
}

export interface WmsInventoryFiltersProps {
  activeFilterCount: number;
  search: string;
  selectedWarehouse: string;
  selectedStatus: string;
  warehouses: WmsInventoryFilterWarehouse[];
  onSearchChange: (value: string) => void;
  onWarehouseChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onResetFilters: () => void;
}

export function WmsInventoryFilters({
  activeFilterCount,
  search,
  selectedWarehouse,
  selectedStatus,
  warehouses,
  onSearchChange,
  onWarehouseChange,
  onStatusChange,
  onResetFilters,
}: WmsInventoryFiltersProps) {
  return (
    <FilterToolbar
      variant="embedded"
      activeFilterCount={activeFilterCount}
      onResetFilters={onResetFilters}
    >
      <Box sx={{ minWidth: { xs: '100%', sm: 240 } }}>
        <SearchInput
          value={search}
          placeholder="Поиск по номеру, складу, автору..."
          onSearch={onSearchChange}
        />
      </Box>

      <TextField
        select
        size="small"
        value={selectedWarehouse}
        onChange={(event) => onWarehouseChange(event.target.value)}
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
        <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все склады</MenuItem>
        {warehouses.map((warehouse) => (
          <MenuItem key={warehouse.id} value={warehouse.id} sx={{ fontSize: '0.8125rem' }}>
            {warehouse.name} ({warehouse.code})
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        value={selectedStatus}
        onChange={(event) => onStatusChange(event.target.value)}
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
        <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все статусы</MenuItem>
        <MenuItem value="IN_PROGRESS" sx={{ fontSize: '0.8125rem' }}>В процессе</MenuItem>
        <MenuItem value="COMPLETED" sx={{ fontSize: '0.8125rem' }}>Завершена</MenuItem>
      </TextField>
    </FilterToolbar>
  );
}

export default WmsInventoryFilters;
