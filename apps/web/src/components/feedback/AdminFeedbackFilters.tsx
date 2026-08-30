'use client';

import { Box, MenuItem, TextField } from '@mui/material';
import { FEEDBACK_MODULE_LABELS, FEEDBACK_PRIORITY_LABELS, FEEDBACK_STATUS_LABELS, FEEDBACK_TYPE_LABELS } from '@ems/shared';
import { FilterToolbar, SearchInput } from '@/components/ui';

interface AdminFeedbackFiltersProps {
  activeFilterCount: number;
  searchQuery: string;
  filterType: string;
  filterModule: string;
  filterStatus: string;
  filterPriority: string;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onModuleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
}

export function AdminFeedbackFilters({ activeFilterCount, searchQuery, filterType, filterModule, filterStatus, filterPriority, onReset, onSearchChange, onTypeChange, onModuleChange, onStatusChange, onPriorityChange }: AdminFeedbackFiltersProps) {
  return (
    <FilterToolbar activeFilterCount={activeFilterCount} onResetFilters={onReset}>
      <Box sx={{ width: { xs: '100%', sm: 320 } }}><SearchInput placeholder="Поиск по номеру, теме, автору..." value={searchQuery} onSearch={onSearchChange} /></Box>
      <FilterSelect label="Тип" value={filterType} onChange={onTypeChange} options={FEEDBACK_TYPE_LABELS} />
      <FilterSelect label="Модуль" value={filterModule} onChange={onModuleChange} options={FEEDBACK_MODULE_LABELS} />
      <FilterSelect label="Статус" value={filterStatus} onChange={onStatusChange} options={FEEDBACK_STATUS_LABELS} />
      <FilterSelect label="Приоритет" value={filterPriority} onChange={onPriorityChange} options={FEEDBACK_PRIORITY_LABELS} />
    </FilterToolbar>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Record<string, { label: string } | string> }) {
  return <TextField select size="small" label={label} value={value} onChange={(event) => onChange(event.target.value)} sx={{ minWidth: label === 'Модуль' ? 170 : label === 'Приоритет' ? 150 : 160 }}><MenuItem value="ALL">Все {label.toLowerCase()}ы</MenuItem>{Object.entries(options).map(([key, option]) => <MenuItem key={key} value={key}>{typeof option === 'string' ? option : option.label}</MenuItem>)}</TextField>;
}
