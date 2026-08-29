'use client';

import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { StatusBadge } from '@/components/ui';
import type { StockRow } from '@/app/wms/stock/page';
import WmsStockZoneCell from './WmsStockZoneCell';

interface WmsStockTableProps {
  items: StockRow[];
  sortedItems: StockRow[];
  selectedIds: string[];
  visibleColumns: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  canEditStockLocation: (row?: StockRow | null) => boolean;
  onSelectAll: (checked: boolean) => void;
  onToggleSelection: (id: string) => void;
  onRequestSort: (field: string) => void;
  onOpenLocation: (row: StockRow) => void;
  onOpenDrawer: (row: StockRow) => void;
  onOpenEquipment: (equipmentId: string) => void;
}

function SortableHeader({
  field,
  label,
  sortField,
  sortDirection,
  onRequestSort,
  align,
  minWidth,
}: {
  field: string;
  label: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onRequestSort: (field: string) => void;
  align?: 'left' | 'center' | 'right';
  minWidth: number;
}) {
  return (
    <TableCell align={align} sx={{ minWidth }}>
      <TableSortLabel
        active={sortField === field}
        direction={sortField === field ? sortDirection : 'asc'}
        onClick={() => onRequestSort(field)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

function WarehouseCell({ row, visible }: { row: StockRow; visible: boolean }) {
  if (!visible) return null;
  return (
    <TableCell>
      <Chip
        label={row.warehouseCode}
        size="small"
        sx={{
          fontWeight: 600,
          borderRadius: '4px',
          fontSize: '0.6875rem',
          backgroundColor: 'background.paper',
          color: 'text.secondary',
          border: '1px solid divider',
          height: 20,
        }}
      />
      <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.disabled', fontSize: '0.75rem' }}>
        {row.warehouseName}
      </Typography>
    </TableCell>
  );
}

export function WmsStockTable({
  items,
  sortedItems,
  selectedIds,
  visibleColumns,
  sortField,
  sortDirection,
  canEditStockLocation,
  onSelectAll,
  onToggleSelection,
  onRequestSort,
  onOpenLocation,
  onOpenDrawer,
  onOpenEquipment,
}: WmsStockTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  return (
    <Table size="small" aria-label="Реестр остатков складов и ТМЦ">
      <TableHead>
        <TableRow sx={{ backgroundColor: 'background.paper' }}>
          <TableCell padding="checkbox" sx={{ width: 44, pl: 2 }}>
            <Checkbox
              size="small"
              indeterminate={someSelected}
              checked={allSelected}
              onChange={(event) => onSelectAll(event.target.checked)}
            />
          </TableCell>
          {visibleColumns.includes('warehouse') && <SortableHeader field="warehouse" label="Склад хранения" minWidth={140} sortField={sortField} sortDirection={sortDirection} onRequestSort={onRequestSort} />}
          {visibleColumns.includes('zone') && <SortableHeader field="zone" label="Место (ячейка)" minWidth={160} sortField={sortField} sortDirection={sortDirection} onRequestSort={onRequestSort} />}
          {visibleColumns.includes('sku') && <SortableHeader field="sku" label="Артикул / Модель" minWidth={140} sortField={sortField} sortDirection={sortDirection} onRequestSort={onRequestSort} />}
          {visibleColumns.includes('name') && <SortableHeader field="name" label="Номенклатура (ТМЦ)" minWidth={220} sortField={sortField} sortDirection={sortDirection} onRequestSort={onRequestSort} />}
          {visibleColumns.includes('category') && <SortableHeader field="category" label="Категория" minWidth={150} sortField={sortField} sortDirection={sortDirection} onRequestSort={onRequestSort} />}
          {visibleColumns.includes('quantity') && <SortableHeader field="quantity" label="Остаток на складе" minWidth={140} align="right" sortField={sortField} sortDirection={sortDirection} onRequestSort={onRequestSort} />}
          {visibleColumns.includes('minQuantity') && <SortableHeader field="minQuantity" label="Мин. остаток" minWidth={120} align="center" sortField={sortField} sortDirection={sortDirection} onRequestSort={onRequestSort} />}
          {visibleColumns.includes('status') && <SortableHeader field="status" label="Статус" minWidth={130} align="center" sortField={sortField} sortDirection={sortDirection} onRequestSort={onRequestSort} />}
          {visibleColumns.includes('equipment') && <TableCell sx={{ minWidth: 180 }}>Совместимое оборудование</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {sortedItems.map((row) => {
          const isChecked = selectedIds.includes(row.id);
          const canEdit = canEditStockLocation(row);
          return (
            <TableRow
              key={row.id}
              hover
              selected={isChecked}
              sx={{ cursor: 'pointer', bgcolor: row.isLowStock ? 'rgba(237, 108, 2, 0.04)' : undefined }}
            >
              <TableCell padding="checkbox" sx={{ pl: 2 }}>
                <Checkbox size="small" checked={isChecked} onChange={() => onToggleSelection(row.id)} />
              </TableCell>
              <WarehouseCell row={row} visible={visibleColumns.includes('warehouse')} />
              {visibleColumns.includes('zone') && (
                <TableCell>
                  <WmsStockZoneCell row={row} canEdit={canEdit} onOpenLocation={onOpenLocation} />
                </TableCell>
              )}
              {visibleColumns.includes('sku') && (
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary' }}>
                  {row.article && row.article !== '—' ? (
                    <Chip label={row.article} size="small" sx={{ borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'action.hover', color: 'text.secondary', border: '1px solid divider', height: 22 }} />
                  ) : '—'}
                </TableCell>
              )}
              {visibleColumns.includes('name') && (
                <TableCell
                  onClick={() => onOpenDrawer(row)}
                  sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8125rem' }}>{row.name}</Typography>
                  {row.description && !row.name.includes(row.description.replace('Модель: ', '')) && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>{row.description}</Typography>
                  )}
                </TableCell>
              )}
              {visibleColumns.includes('category') && <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{row.category}</TableCell>}
              {visibleColumns.includes('quantity') && (
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} sx={{ fontFeatureSettings: '"tnum"', fontSize: '0.8125rem', color: row.isLowStock ? 'error.main' : 'text.primary' }}>
                    {row.quantity} {row.unit}
                  </Typography>
                </TableCell>
              )}
              {visibleColumns.includes('minQuantity') && (
                <TableCell align="center">
                  <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"', fontSize: '0.8125rem', color: 'text.disabled' }}>
                    {row.minStock} {row.minStock !== '—' ? row.unit : ''}
                  </Typography>
                </TableCell>
              )}
              {visibleColumns.includes('status') && (
                <TableCell align="center">
                  <StatusBadge status={row.isLowStock ? 'LOW_STOCK' : 'NORMAL_STOCK'} label={row.isLowStock ? 'Дефицит' : 'В норме'} />
                </TableCell>
              )}
              {visibleColumns.includes('equipment') && (
                <TableCell>
                  {row.compatibleEquipment.length > 0 ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                      {row.compatibleEquipment.slice(0, 3).map((equipment) => (
                        <Tooltip key={equipment.id} title={`Инв. № ${equipment.inventoryNumber}`}>
                          <Chip
                            icon={<PrecisionManufacturingIcon sx={{ fontSize: '13px !important' }} />}
                            label={equipment.name}
                            size="small"
                            clickable
                            onClick={() => onOpenEquipment(equipment.id)}
                            sx={{ fontSize: '0.6875rem', height: 22, borderRadius: '4px', backgroundColor: 'background.paper', border: '1px solid divider', color: 'text.secondary', fontWeight: 500 }}
                          />
                        </Tooltip>
                      ))}
                      {row.compatibleEquipment.length > 3 && (
                        <Chip label={`+${row.compatibleEquipment.length - 3}`} size="small" sx={{ fontSize: '0.6875rem', height: 22, borderRadius: '4px', backgroundColor: 'grey.100', color: 'text.disabled', fontWeight: 600 }} />
                      )}
                    </Stack>
                  ) : <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
