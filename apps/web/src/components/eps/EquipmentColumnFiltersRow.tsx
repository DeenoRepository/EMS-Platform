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
}: EquipmentColumnFiltersRowProps) {
  return (
    <TableRow sx={{ bgcolor: 'action.hover' }}>
      <TableCell padding="checkbox" sx={{ pl: 2 }} />

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

      {visibleColumns.includes('serialNumber') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Серийный №" value={filters.serialNumber} onChange={(v) => onChangeFilter('serialNumber', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('manufacturer') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Производитель" value={filters.manufacturer} onChange={(v) => onChangeFilter('manufacturer', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('model') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Модель" value={filters.model} onChange={(v) => onChangeFilter('model', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('location') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Локация" value={filters.location} onChange={(v) => onChangeFilter('location', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('status') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField select size="small" value={filters.status || ''} onChange={(e) => onChangeFilter('status', e.target.value)} sx={inputSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
            {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => (
              <MenuItem key={k} value={k} sx={{ fontSize: '0.75rem' }}>{v.label}</MenuItem>
            ))}
          </TextField>
        </TableCell>
      )}

      {visibleColumns.includes('criticality') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField select size="small" value={filters.criticality || ''} onChange={(e) => onChangeFilter('criticality', e.target.value)} sx={inputSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
            <MenuItem value="A" sx={{ fontSize: '0.75rem' }}>A</MenuItem>
            <MenuItem value="B" sx={{ fontSize: '0.75rem' }}>B</MenuItem>
            <MenuItem value="C" sx={{ fontSize: '0.75rem' }}>C</MenuItem>
          </TextField>
        </TableCell>
      )}

      {visibleColumns.includes('actualWear') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Макс %" type="number" value={filters.wearMax} onChange={(v) => onChangeFilter('wearMax', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('eqGroup') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Подразделение" value={filters.eqGroup} onChange={(v) => onChangeFilter('eqGroup', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('eqType') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Вид" value={filters.eqType} onChange={(v) => onChangeFilter('eqType', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('respPerson') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="МОЛ" value={filters.respPerson} onChange={(v) => onChangeFilter('respPerson', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('okofCode') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="ОКОФ" value={filters.okofCode} onChange={(v) => onChangeFilter('okofCode', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('okpd2Code') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="ОКПД2" value={filters.okpd2Code} onChange={(v) => onChangeFilter('okpd2Code', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('procCode') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Техпроцесс" value={filters.procCode} onChange={(v) => onChangeFilter('procCode', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('maintPeriodicity') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Период ТО" value={filters.maintPeriodicity} onChange={(v) => onChangeFilter('maintPeriodicity', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('calibrationInterval') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="Макс мес." type="number" value={filters.calibrationIntervalMax} onChange={(v) => onChangeFilter('calibrationIntervalMax', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('cleanRoom') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput placeholder="ISO" value={filters.cleanRoom} onChange={(v) => onChangeFilter('cleanRoom', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('isCriticalPath') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField select size="small" value={filters.isCriticalPath || ''} onChange={(e) => onChangeFilter('isCriticalPath', e.target.value)} sx={inputSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
            <MenuItem value="true" sx={{ fontSize: '0.75rem' }}>Да</MenuItem>
            <MenuItem value="false" sx={{ fontSize: '0.75rem' }}>Нет</MenuItem>
          </TextField>
        </TableCell>
      )}

      {visibleColumns.includes('isUnique') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField select size="small" value={filters.isUnique || ''} onChange={(e) => onChangeFilter('isUnique', e.target.value)} sx={inputSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
            <MenuItem value="true" sx={{ fontSize: '0.75rem' }}>Да</MenuItem>
            <MenuItem value="false" sx={{ fontSize: '0.75rem' }}>Нет</MenuItem>
          </TextField>
        </TableCell>
      )}

      {visibleColumns.includes('isImported') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField select size="small" value={filters.isImported || ''} onChange={(e) => onChangeFilter('isImported', e.target.value)} sx={inputSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
            <MenuItem value="true" sx={{ fontSize: '0.75rem' }}>Да</MenuItem>
            <MenuItem value="false" sx={{ fontSize: '0.75rem' }}>Нет</MenuItem>
          </TextField>
        </TableCell>
      )}

      {visibleColumns.includes('documentsCount') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField select size="small" value={filters.documentsFilter || ''} onChange={(e) => onChangeFilter('documentsFilter', e.target.value)} sx={inputSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
            <MenuItem value="with" sx={{ fontSize: '0.75rem' }}>С док.</MenuItem>
            <MenuItem value="without" sx={{ fontSize: '0.75rem' }}>Без док.</MenuItem>
          </TextField>
        </TableCell>
      )}

      {visibleColumns.includes('sparePartsCount') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField select size="small" value={filters.sparePartsFilter || ''} onChange={(e) => onChangeFilter('sparePartsFilter', e.target.value)} sx={inputSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
            <MenuItem value="with" sx={{ fontSize: '0.75rem' }}>С ЗИП</MenuItem>
            <MenuItem value="without" sx={{ fontSize: '0.75rem' }}>Без ЗИП</MenuItem>
          </TextField>
        </TableCell>
      )}

      {visibleColumns.includes('tags') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField select size="small" value={filters.tagId || ''} onChange={(e) => onChangeFilter('tagId', e.target.value)} sx={inputSx}>
            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Все</MenuItem>
            {tags.map((t) => (
              <MenuItem key={t.id} value={t.id} sx={{ fontSize: '0.75rem' }}>{t.name}</MenuItem>
            ))}
          </TextField>
        </TableCell>
      )}

      {visibleColumns.includes('commissionDate') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput type="date" value={filters.commissionDateFrom} onChange={(v) => onChangeFilter('commissionDateFrom', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('updatedAt') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput type="date" value={filters.updatedAtFrom} onChange={(v) => onChangeFilter('updatedAtFrom', v)} />
        </TableCell>
      )}

      {visibleColumns.includes('createdAt') && (
        <TableCell sx={{ p: 0.75 }}>
          <DebouncedColumnInput type="date" value={filters.createdAtFrom} onChange={(v) => onChangeFilter('createdAtFrom', v)} />
        </TableCell>
      )}
    </TableRow>
  );
}

export default EquipmentColumnFiltersRow;
