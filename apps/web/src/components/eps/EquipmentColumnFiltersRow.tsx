'use client';

import React, { useState, useEffect } from 'react';
import {
  TableRow,
  TableCell,
  TextField,
  MenuItem,
} from '@mui/material';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { EquipmentFilters } from './EquipmentFilterTypes';

interface EquipmentColumnFiltersRowProps {
  visibleColumns: string[];
  filters: EquipmentFilters;
  onChangeFilter: (key: keyof EquipmentFilters, value: string) => void;
  tags?: { id: string; name: string }[];
  columns?: { id: string; label: string }[];
}

const inputSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    height: 28,
    fontSize: '0.75rem',
    borderRadius: '4px',
    bgcolor: 'background.paper',
    '& fieldset': { borderColor: 'divider' },
    '&:hover fieldset': { borderColor: 'grey.400' },
  },
  '& .MuiSelect-select': {
    py: 0.5,
    fontSize: '0.75rem',
  },
};

function DebouncedColumnInput({
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  value?: string;
  placeholder?: string;
  type?: string;
  onChange: (val: string) => void;
}) {
  const [localVal, setLocalVal] = useState(value || '');

  useEffect(() => {
    setLocalVal(value || '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localVal !== (value || '')) {
        onChange(localVal);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localVal, value, onChange]);

  return (
    <TextField
      size="small"
      type={type}
      placeholder={placeholder}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      sx={inputSx}
    />
  );
}

export function EquipmentColumnFiltersRow({
  visibleColumns,
  filters,
  onChangeFilter,
  tags = [],
  columns = [],
}: EquipmentColumnFiltersRowProps) {
  return (
    <TableRow sx={{ bgcolor: 'action.hover' }}>
      <TableCell padding="checkbox" sx={{ pl: 2 }} />

      {visibleColumns.includes('completeness') && (
        <TableCell sx={{ p: 0.75, width: 44, minWidth: 44 }}>
          <TextField
            select
            size="small"
            value={filters.completeness || ''}
            onChange={(e) => onChangeFilter('completeness', e.target.value)}
            sx={inputSx}
          >
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
            <MenuItem value="incomplete" sx={{ fontSize: '0.75rem' }}>Не все (!)</MenuItem>
            <MenuItem value="complete" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
          </TextField>
        </TableCell>
      )}

      {visibleColumns.includes('inventoryNumber') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Инв. №" value={filters.inventoryNumber} onChange={(v) => onChangeFilter('inventoryNumber', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('name') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Поиск наименования..." value={filters.name} onChange={(v) => onChangeFilter('name', v)} />
        </TableCell>
      )}

      {/* Динамические фильтры колонок, настроенных в разделах */}
      {columns && columns.length > 0
        ? columns
            .filter((col) => col.id !== 'completeness' && col.id !== 'inventoryNumber' && col.id !== 'name')
            .map((col) => {
              if (!visibleColumns.includes(col.id)) return null;
              if (col.id === 'status') {
                return (
                  <TableCell key={col.id} sx={{ p: 0.75 }}>
                    <TextField
                      select
                      size="small"
                      value={filters.status || ''}
                      onChange={(e) => onChangeFilter('status', e.target.value)}
                      sx={inputSx}
                    >
                      <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
                      {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => (
                        <MenuItem key={k} value={k} sx={{ fontSize: '0.75rem' }}>{v.label}</MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                );
              }
              if (col.id === 'criticality') {
                return (
                  <TableCell key={col.id} sx={{ p: 0.75 }}>
                    <TextField
                      select
                      size="small"
                      value={filters.criticality || ''}
                      onChange={(e) => onChangeFilter('criticality', e.target.value)}
                      sx={inputSx}
                    >
                      <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
                      <MenuItem value="A" sx={{ fontSize: '0.75rem' }}>A</MenuItem>
                      <MenuItem value="B" sx={{ fontSize: '0.75rem' }}>B</MenuItem>
                      <MenuItem value="C" sx={{ fontSize: '0.75rem' }}>C</MenuItem>
                    </TextField>
                  </TableCell>
                );
              }
              return (
                <TableCell key={col.id} sx={{ p: 0.75 }}>
                  <DebouncedColumnInput
                    placeholder={col.label}
                    value={(filters as any)[col.id] || ''}
                    onChange={(v) => onChangeFilter(col.id as any, v)}
                  />
                </TableCell>
              );
            })
        : null}
    </TableRow>
  );
}

export default EquipmentColumnFiltersRow;
