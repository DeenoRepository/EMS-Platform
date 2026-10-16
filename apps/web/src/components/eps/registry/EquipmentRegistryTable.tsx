'use client';

import React from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  Checkbox,
  Tooltip,
  Box,
  Typography,
  Paper,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { TableColumnOption } from '@/components/ui';
import { EquipmentColumnFiltersRow, EquipmentFilters } from '@/components/eps';
import { checkEquipmentCardCompleteness } from '@/lib/eps-helpers';
import { EquipmentItem, CustomSectionDefItem } from './types';
import { renderDynamicTableCell } from './renderDynamicTableCell';

interface EquipmentRegistryTableProps {
  items: EquipmentItem[];
  selectedIds: string[];
  tableColumns: TableColumnOption[];
  visibleColumns: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  showColumnFilters: boolean;
  filters: EquipmentFilters;
  sections: CustomSectionDefItem[];
  onSelectAll: (checked: boolean) => void;
  onToggleSelect: (id: string) => void;
  onRowClick: (eq: EquipmentItem) => void;
  onRequestSort: (field: string) => void;
  onFilterChange: (key: keyof EquipmentFilters, value: string) => void;
}

export function EquipmentRegistryTable({
  items,
  selectedIds,
  tableColumns,
  visibleColumns,
  sortField,
  sortDirection,
  showColumnFilters,
  filters,
  sections,
  onSelectAll,
  onToggleSelect,
  onRowClick,
  onRequestSort,
  onFilterChange,
}: EquipmentRegistryTableProps) {
  const isAllSelected = items.length > 0 && selectedIds.length === items.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < items.length;

  return (
    <Table stickyHeader size="small" aria-label="Реестр оборудования" sx={{ minWidth: 1400 }}>
      <TableHead>
        <TableRow sx={{ bgcolor: 'background.paper' }}>
          <TableCell component="th" scope="col" padding="checkbox" sx={{ width: 44, pl: 2 }}>
            <Checkbox
              size="small"
              indeterminate={isIndeterminate}
              checked={isAllSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              inputProps={{ 'aria-label': 'Выбрать все записи' }}
            />
          </TableCell>

          {visibleColumns.includes('completeness') && (
            <TableCell component="th" scope="col" sx={{ width: 44, minWidth: 44, px: 0.5, textAlign: 'center' }}>
              <Tooltip title="Сортировать по полноте заполнения карточки">
                <TableSortLabel
                  active={sortField === 'completeness'}
                  direction={sortField === 'completeness' ? sortDirection : 'asc'}
                  onClick={() => onRequestSort('completeness')}
                >
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      bgcolor: 'warning.light',
                      color: 'warning.dark',
                    }}
                  >
                    <WarningAmberIcon sx={{ fontSize: 15 }} />
                  </Box>
                </TableSortLabel>
              </Tooltip>
            </TableCell>
          )}

          {tableColumns
            .filter((col) => col.id !== 'completeness')
            .map((col) => {
              if (!visibleColumns.includes(col.id)) return null;
              return (
                <TableCell component="th" scope="col" key={col.id} sx={{ minWidth: col.id === 'name' ? 220 : 140 }}>
                  <TableSortLabel
                    active={sortField === col.id}
                    direction={sortField === col.id ? sortDirection : 'asc'}
                    onClick={() => onRequestSort(col.id)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              );
            })}
        </TableRow>

        {showColumnFilters && (
          <EquipmentColumnFiltersRow
            visibleColumns={visibleColumns}
            columns={tableColumns}
            filters={filters}
            onChangeFilter={onFilterChange}
          />
        )}
      </TableHead>

      <TableBody>
        {items.map((eq) => {
          const isChecked = selectedIds.includes(eq.id);
          const comp = checkEquipmentCardCompleteness(eq, sections);

          return (
            <TableRow
              key={eq.id}
              tabIndex={0}
              role="link"
              aria-label={`Открыть паспорт оборудования: ${eq.name}`}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => onRowClick(eq)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(eq);
                }
              }}
            >
              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ pl: 2 }}>
                <Checkbox
                  size="small"
                  checked={isChecked}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelect(eq.id);
                  }}
                  inputProps={{ 'aria-label': `Выбрать ${eq.name}` }}
                />
              </TableCell>

              {visibleColumns.includes('completeness') && (
                <TableCell align="center" sx={{ width: 44, minWidth: 44, px: 0.5 }} onClick={(e) => e.stopPropagation()}>
                  {comp.isIncomplete && (
                    <Tooltip
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'inherit', mb: 0.5 }}>
                            В карточке заполнены не все поля
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.75, opacity: 0.9 }}>
                            Заполнено {comp.filledCount} из {comp.totalCount} полей
                          </Typography>
                          <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.75rem', lineHeight: 1.45 }}>
                            {comp.missingFields.map((field) => (
                              <li key={field}>{field}</li>
                            ))}
                          </Box>
                        </Box>
                      }
                      arrow
                      placement="right"
                    >
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: 'warning.light',
                          color: 'warning.dark',
                          cursor: 'help',
                        }}
                      >
                        <WarningAmberIcon sx={{ fontSize: 16 }} />
                      </Box>
                    </Tooltip>
                  )}
                </TableCell>
              )}

              {tableColumns
                .filter((col) => col.id !== 'completeness')
                .map((col) => {
                  if (!visibleColumns.includes(col.id)) return null;

                  if (col.id === 'name') {
                    return (
                      <TableCell key={col.id}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'primary.main',
                            fontSize: '0.8125rem',
                            lineHeight: 1.35,
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {eq.name}
                        </Typography>
                      </TableCell>
                    );
                  }

                  if (col.id === 'inventoryNumber') {
                    return (
                      <TableCell key={col.id}>
                        {eq.inventoryNumber ? (
                          <Paper
                            variant="outlined"
                            sx={{
                              display: 'inline-block',
                              px: 0.85,
                              py: 0.15,
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              bgcolor: 'background.default',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              color: 'text.secondary',
                              borderColor: 'divider',
                              lineHeight: 1.3,
                            }}
                          >
                            {eq.inventoryNumber}
                          </Paper>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell key={col.id} sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {renderDynamicTableCell(eq, col.id)}
                    </TableCell>
                  );
                })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
