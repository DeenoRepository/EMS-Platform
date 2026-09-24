'use client';

import React from 'react';
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
          <TextField size="small" placeholder="Инв. №" value={filters.inventoryNumber || ''} onChange={(e) => onChangeFilter('inventoryNumber', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('name') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Поиск наименования..." value={filters.name || ''} onChange={(e) => onChangeFilter('name', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('serialNumber') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Серийный №" value={filters.serialNumber || ''} onChange={(e) => onChangeFilter('serialNumber', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('manufacturer') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Производитель" value={filters.manufacturer || ''} onChange={(e) => onChangeFilter('manufacturer', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('model') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Модель" value={filters.model || ''} onChange={(e) => onChangeFilter('model', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('location') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Локация" value={filters.location || ''} onChange={(e) => onChangeFilter('location', e.target.value)} sx={inputSx} />
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
          <TextField size="small" placeholder="Макс %" type="number" value={filters.wearMax || ''} onChange={(e) => onChangeFilter('wearMax', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('eqGroup') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Подразделение" value={filters.eqGroup || ''} onChange={(e) => onChangeFilter('eqGroup', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('eqType') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Вид" value={filters.eqType || ''} onChange={(e) => onChangeFilter('eqType', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('respPerson') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="МОЛ" value={filters.respPerson || ''} onChange={(e) => onChangeFilter('respPerson', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('okofCode') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="ОКОФ" value={filters.okofCode || ''} onChange={(e) => onChangeFilter('okofCode', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('okpd2Code') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="ОКПД2" value={filters.okpd2Code || ''} onChange={(e) => onChangeFilter('okpd2Code', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('procCode') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Техпроцесс" value={filters.procCode || ''} onChange={(e) => onChangeFilter('procCode', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('maintPeriodicity') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Период ТО" value={filters.maintPeriodicity || ''} onChange={(e) => onChangeFilter('maintPeriodicity', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('calibrationInterval') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="Макс мес." type="number" value={filters.calibrationIntervalMax || ''} onChange={(e) => onChangeFilter('calibrationIntervalMax', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('cleanRoom') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" placeholder="ISO" value={filters.cleanRoom || ''} onChange={(e) => onChangeFilter('cleanRoom', e.target.value)} sx={inputSx} />
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
          <TextField size="small" type="date" value={filters.commissionDateFrom || ''} onChange={(e) => onChangeFilter('commissionDateFrom', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('updatedAt') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" type="date" value={filters.updatedAtFrom || ''} onChange={(e) => onChangeFilter('updatedAtFrom', e.target.value)} sx={inputSx} />
        </TableCell>
      )}

      {visibleColumns.includes('createdAt') && (
        <TableCell sx={{ p: 0.75 }}>
          <TextField size="small" type="date" value={filters.createdAtFrom || ''} onChange={(e) => onChangeFilter('createdAtFrom', e.target.value)} sx={inputSx} />
        </TableCell>
      )}
    </TableRow>
  );
}

export default EquipmentColumnFiltersRow;
