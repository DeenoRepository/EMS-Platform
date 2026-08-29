'use client';

import React from 'react';
import { Box, MenuItem, TextField } from '@mui/material';
import {
  DataTableWrapper,
  FilterToolbar,
  SearchInput,
  type TableColumnOption,
} from '@/components/ui';
import { WarehouseSelect } from '@/components/wms';
import WmsOperationsTable, { StockOperationRecord } from './WmsOperationsTable';

interface WmsOperationsTablePanelProps {
  operations: StockOperationRecord[];
  isLoading: boolean;
  columns: TableColumnOption[];
  visibleColumns: string[];
  selectedType: string;
  selectedWarehouse: string;
  search: string;
  activeFilterCount: number;
  page: number;
  rowsPerPage: number;
  total: number;
  availableWarehouses: Parameters<typeof WarehouseSelect>[0]['warehouses'];
  isAdmin: boolean;
  currentUserId?: string;
  canCreateOperation: boolean;
  onVisibleColumnsChange: (columns: string[]) => void;
  onTypeChange: (value: string) => void;
  onWarehouseChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onOpenWizard: () => void;
}

export default function WmsOperationsTablePanel({
  operations,
  isLoading,
  columns,
  visibleColumns,
  selectedType,
  selectedWarehouse,
  search,
  activeFilterCount,
  page,
  rowsPerPage,
  total,
  availableWarehouses,
  isAdmin,
  currentUserId,
  canCreateOperation,
  onVisibleColumnsChange,
  onTypeChange,
  onWarehouseChange,
  onSearchChange,
  onResetFilters,
  onPageChange,
  onPageSizeChange,
  onOpenWizard,
}: WmsOperationsTablePanelProps) {
  return (
    <DataTableWrapper
      columns={columns}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={onVisibleColumnsChange}
      storageKey="wms_operations_table_v2"
      toolbar={
        <FilterToolbar
          variant="embedded"
          activeFilterCount={activeFilterCount}
          onResetFilters={onResetFilters}
        >
          <Box sx={{ minWidth: { xs: '100%', sm: 260 } }}>
            <SearchInput
              placeholder="Поиск по ТМЦ, получателю..."
              value={search}
              onSearch={onSearchChange}
            />
          </Box>
          <TextField
            select
            size="small"
            label="Тип операции"
            value={selectedType}
            onChange={(event) => onTypeChange(event.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 200 } }}
          >
            <MenuItem value="">Все типы</MenuItem>
            <MenuItem value="RECEIPT">Приход ТМЦ</MenuItem>
            <MenuItem value="ISSUE_EMPLOYEE">Выдача сотруднику</MenuItem>
            <MenuItem value="ISSUE_WRITE_OFF">Списание ТМЦ / ТОиР</MenuItem>
            <MenuItem value="TRANSFER">Межскладское перемещение</MenuItem>
          </TextField>
          <WarehouseSelect
            value={selectedWarehouse}
            onChange={onWarehouseChange}
            warehouses={availableWarehouses}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />
        </FilterToolbar>
      }
      total={total}
      page={page}
      pageSize={rowsPerPage}
      onPageChange={(_, newPage) => onPageChange(newPage)}
      onPageSizeChange={(event) => onPageSizeChange(parseInt(event.target.value, 10))}
      loading={isLoading}
    >
      <WmsOperationsTable
        operations={operations}
        visibleColumns={visibleColumns}
        canCreateOperation={canCreateOperation}
        onOpenWizard={onOpenWizard}
      />
    </DataTableWrapper>
  );
}
