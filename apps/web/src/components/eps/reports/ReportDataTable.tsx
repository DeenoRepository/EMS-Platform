'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Chip,
} from '@mui/material';
import { StatusBadge } from '@/components/ui';
import { ReportColumn } from './ReportColumnBuilderDialog';

interface ReportDataTableProps {
  rows: Array<Record<string, any>>;
  activeColumnsDef: ReportColumn[];
  page: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
}

export function ReportDataTable({
  rows,
  activeColumnsDef,
  page,
  pageSize,
  sortField,
  sortOrder,
  onSort,
}: ReportDataTableProps) {
  return (
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: 50, fontWeight: 700, fontSize: '0.75rem' }}>
            №
          </TableCell>
          {activeColumnsDef.map((col) => (
            <TableCell key={col.key} sx={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              <TableSortLabel
                active={sortField === col.key}
                direction={sortField === col.key ? sortOrder : 'asc'}
                onClick={() => onSort(col.key)}
              >
                {col.name}
              </TableSortLabel>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={row.id || idx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
            <TableCell sx={{ color: 'text.disabled', fontSize: '0.75rem', fontWeight: 600 }}>
              {(page - 1) * pageSize + idx + 1}
            </TableCell>
            {activeColumnsDef.map((col) => (
              <TableCell key={col.key} sx={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                {col.key === 'status' ? (
                  <StatusBadge status={row.status || 'ACTIVE'} />
                ) : col.key === 'criticality' && row.criticality !== '—' ? (
                  <Chip
                    label={row.criticality}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.6875rem',
                      height: 22,
                      backgroundColor:
                        String(row.criticality).includes('A')
                          ? 'error.light'
                          : String(row.criticality).includes('B')
                          ? 'warning.light'
                          : 'info.light',
                      color:
                        String(row.criticality).includes('A')
                          ? 'error.main'
                          : String(row.criticality).includes('B')
                          ? 'warning.main'
                          : 'primary.main',
                    }}
                  />
                ) : col.key === 'actual_wear_percentage' && row.actual_wear_percentage !== '—' ? (
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      fontSize: '0.8125rem',
                      color:
                        parseFloat(row.actual_wear_percentage) > 70
                          ? 'error.main'
                          : parseFloat(row.actual_wear_percentage) > 30
                          ? 'warning.main'
                          : 'success.main',
                    }}
                  >
                    {row.actual_wear_percentage}
                  </Typography>
                ) : (
                  row[col.key] ?? '—'
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ReportDataTable;
