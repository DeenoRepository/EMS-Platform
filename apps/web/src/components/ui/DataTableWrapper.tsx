'use client';

import React from 'react';
import {
  TableContainer,
  Paper,
  Box,
  LinearProgress,
  TablePagination,
} from '@mui/material';

export interface DataTableWrapperProps {
  children: React.ReactNode;
  loading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (event: unknown, newPage: number) => void;
  onPageSizeChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  pageSizeOptions?: number[];
  stickyHeader?: boolean;
  maxHeight?: number | string;
  className?: string;
}

export function DataTableWrapper({
  children,
  loading = false,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  stickyHeader = false,
  maxHeight,
  className,
}: DataTableWrapperProps) {
  const showPagination = total !== undefined && page !== undefined && pageSize !== undefined && Boolean(onPageChange);

  return (
    <Paper
      elevation={0}
      className={className}
      sx={{
        width: '100%',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
      }}
    >
      {loading && (
        <LinearProgress
          sx={{
            height: 2,
            backgroundColor: '#e2e8f0',
            '& .MuiLinearProgress-bar': { backgroundColor: '#0284c7' },
          }}
        />
      )}

      <TableContainer
        sx={{
          maxHeight: maxHeight || (stickyHeader ? 600 : 'none'),
          '&::-webkit-scrollbar': { height: 6, width: 6 },
          '&::-webkit-scrollbar-track': { backgroundColor: '#f8fafc' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: '#cbd5e1', borderRadius: 3 },
        }}
      >
        {children}
      </TableContainer>

      {showPagination && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
            px: 1.5,
          }}
        >
          <TablePagination
            component="div"
            count={total!}
            page={page!}
            rowsPerPage={pageSize!}
            onPageChange={onPageChange!}
            onRowsPerPageChange={onPageSizeChange}
            rowsPerPageOptions={pageSizeOptions}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `более ${to}`}`}
            sx={{
              fontSize: '0.75rem',
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: 500,
              },
              '& .MuiTablePagination-select': {
                fontSize: '0.75rem',
                fontWeight: 600,
              },
            }}
          />
        </Box>
      )}
    </Paper>
  );
}
