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
} from '@mui/material';
import { StockRow } from './types';
import { StockTableRow } from './StockTableRow';

const COL_WIDTH_WAREHOUSE = 140;
const COL_WIDTH_ZONE = 160;
const COL_WIDTH_SKU = 140;
const COL_WIDTH_NAME = 220;
const COL_WIDTH_CAT = 150;
const COL_WIDTH_QTY = 140;
const COL_WIDTH_TRANSIT = 140;
const COL_WIDTH_MIN = 120;
const COL_WIDTH_STATUS = 130;
const COL_WIDTH_EQUIP = 180;

interface StockRegistryTableProps {
  items: StockRow[];
  selectedIds: string[];
  visibleColumns: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  canEditStockLocation: (row: StockRow) => boolean;
  onToggleSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onRequestSort: (field: string) => void;
  onOpenDrawer: (row: StockRow) => void;
  onOpenLocationModal: (row: StockRow) => void;
  onNavigate: (path: string) => void;
}

export function StockRegistryTable({
  items,
  selectedIds,
  visibleColumns,
  sortField,
  sortDirection,
  canEditStockLocation,
  onToggleSelect,
  onSelectAll,
  onRequestSort,
  onOpenDrawer,
  onOpenLocationModal,
  onNavigate,
}: StockRegistryTableProps) {
  const isAllSelected = items.length > 0 && selectedIds.length === items.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < items.length;

  return (
    <Table size="small" aria-label="Реестр остатков складов и ТМЦ">
      <TableHead>
        <TableRow sx={{ bgcolor: 'background.paper' }}>
          <TableCell padding="checkbox" sx={{ width: 44, pl: 2 }}>
            <Checkbox
              size="small"
              indeterminate={isIndeterminate}
              checked={isAllSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              inputProps={{ 'aria-label': 'Выбрать все записи' }}
            />
          </TableCell>

          {visibleColumns.includes('warehouse') && (
            <TableCell sx={{ minWidth: COL_WIDTH_WAREHOUSE }}>
              <TableSortLabel
                active={sortField === 'warehouse'}
                direction={sortField === 'warehouse' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('warehouse')}
              >
                Склад хранения
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('zone') && (
            <TableCell sx={{ minWidth: COL_WIDTH_ZONE }}>
              <TableSortLabel
                active={sortField === 'zone'}
                direction={sortField === 'zone' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('zone')}
              >
                Место (ячейка)
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('sku') && (
            <TableCell sx={{ minWidth: COL_WIDTH_SKU }}>
              <TableSortLabel
                active={sortField === 'sku'}
                direction={sortField === 'sku' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('sku')}
              >
                Артикул / Модель
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('name') && (
            <TableCell sx={{ minWidth: COL_WIDTH_NAME }}>
              <TableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('name')}
              >
                Номенклатура (ТМЦ)
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('category') && (
            <TableCell sx={{ minWidth: COL_WIDTH_CAT }}>
              <TableSortLabel
                active={sortField === 'category'}
                direction={sortField === 'category' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('category')}
              >
                Категория
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('quantity') && (
            <TableCell align="right" sx={{ minWidth: COL_WIDTH_QTY }}>
              <TableSortLabel
                active={sortField === 'quantity'}
                direction={sortField === 'quantity' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('quantity')}
              >
                Остаток на складе
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('inTransit') && (
            <TableCell align="center" sx={{ minWidth: COL_WIDTH_TRANSIT }}>
              <TableSortLabel
                active={sortField === 'inTransit'}
                direction={sortField === 'inTransit' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('inTransit')}
              >
                В пути (Транзит)
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('minQuantity') && (
            <TableCell align="center" sx={{ minWidth: COL_WIDTH_MIN }}>
              <TableSortLabel
                active={sortField === 'minQuantity'}
                direction={sortField === 'minQuantity' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('minQuantity')}
              >
                Мин. остаток
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('status') && (
            <TableCell align="center" sx={{ minWidth: COL_WIDTH_STATUS }}>
              <TableSortLabel
                active={sortField === 'status'}
                direction={sortField === 'status' ? sortDirection : 'asc'}
                onClick={() => onRequestSort('status')}
              >
                Статус
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('equipment') && (
            <TableCell sx={{ minWidth: COL_WIDTH_EQUIP }}>Совместимое оборудование</TableCell>
          )}
        </TableRow>
      </TableHead>

      <TableBody>
        {items.map((row) => (
          <StockTableRow
            key={row.id}
            row={row}
            isChecked={selectedIds.includes(row.id)}
            visibleColumns={visibleColumns}
            canEditLoc={canEditStockLocation(row)}
            onToggleSelect={onToggleSelect}
            onOpenDrawer={onOpenDrawer}
            onOpenLocationModal={onOpenLocationModal}
            onNavigate={onNavigate}
          />
        ))}
      </TableBody>
    </Table>
  );
}
