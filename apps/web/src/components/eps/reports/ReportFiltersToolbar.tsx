'use client';

import { Box, MenuItem, TextField } from '@mui/material';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { DatePickerField, FilterToolbar, SearchInput } from '@/components/ui';

interface ReportFiltersToolbarProps {
  activeFilterCount: number;
  searchQuery: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

export function ReportFiltersToolbar({ activeFilterCount, searchQuery, statusFilter, dateFrom, dateTo, onReset, onSearchChange, onStatusChange, onDateFromChange, onDateToChange }: ReportFiltersToolbarProps) {
  return (
    <FilterToolbar variant="embedded" activeFilterCount={activeFilterCount} onResetFilters={onReset}>
      <Box sx={{ minWidth: { xs: '100%', sm: 240 }, flexGrow: 1 }}>
        <SearchInput placeholder="Поиск по инв. номеру, названию..." value={searchQuery} onSearch={onSearchChange} />
      </Box>
      <TextField select size="small" value={statusFilter} onChange={(event) => onStatusChange(event.target.value)} sx={{ minWidth: 150 }}>
        <MenuItem value="">Все статусы</MenuItem>
        {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => <MenuItem key={key} value={key}>{typeof info === 'string' ? info : (info as any).label}</MenuItem>)}
      </TextField>
      <Box sx={{ width: 140 }}><DatePickerField size="small" label="Ввод с" value={dateFrom} onChange={(value) => onDateFromChange(value || '')} /></Box>
      <Box sx={{ width: 140 }}><DatePickerField size="small" label="Ввод по" value={dateTo} onChange={(value) => onDateToChange(value || '')} /></Box>
    </FilterToolbar>
  );
}
