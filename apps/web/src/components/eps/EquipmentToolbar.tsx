'use client';

import React from 'react';
import { Box, TextField, MenuItem } from '@mui/material';
import { SearchInput, FilterToolbar } from '@/components/ui';

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface EquipmentToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  tagFilter: string;
  onTagFilterChange: (val: string) => void;
  tags: TagItem[];
  activeFilterCount: number;
  onResetFilters: () => void;
}

const FILTER_MIN_WIDTH_STATUS = 160;
const FILTER_MIN_WIDTH_TAG = 150;
const SEARCH_BOX_MIN_WIDTH = 260;
const SEARCH_BOX_MD_WIDTH = 320;

export const EquipmentToolbar: React.FC<EquipmentToolbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  tags,
  activeFilterCount,
  onResetFilters,
}) => {
  return (
    <FilterToolbar
      variant="embedded"
      activeFilterCount={activeFilterCount}
      onResetFilters={onResetFilters}
    >
      <TextField
        select
        size="small"
        label="Статус"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        sx={{ minWidth: FILTER_MIN_WIDTH_STATUS }}
      >
        <MenuItem value="">Все статусы</MenuItem>
        <MenuItem value="ACTIVE">В работе</MenuItem>
        <MenuItem value="UNDER_REPAIR">В ремонте</MenuItem>
        <MenuItem value="IN_STORAGE">На складе</MenuItem>
        <MenuItem value="DECOMMISSIONED">Списано</MenuItem>
      </TextField>

      {tags.length > 0 && (
        <TextField
          select
          size="small"
          label="Тег"
          value={tagFilter}
          onChange={(e) => onTagFilterChange(e.target.value)}
          sx={{ minWidth: FILTER_MIN_WIDTH_TAG }}
        >
          <MenuItem value="">Все теги</MenuItem>
          {tags.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Box sx={{ minWidth: { xs: '100%', sm: SEARCH_BOX_MIN_WIDTH, md: SEARCH_BOX_MD_WIDTH }, flexGrow: 1 }}>
        <SearchInput
          value={search}
          placeholder="Поиск по наименованию, номеру..."
          onSearch={onSearchChange}
        />
      </Box>
    </FilterToolbar>
  );
};
