import React from 'react';
import {
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import { getCellAddress } from './printCountSheet';

const FONT_SEMI_BOLD = Number('600');
const FONT_BOLD = Number('700');
const PREVIEW_MAX_HEIGHT = Number('360');
const COL_WIDTH_ARTICLE = Number('100');
const COL_WIDTH_FACT = Number('100');

export interface InventoryCountSheetItem {
  id: string;
  expectedQty: number;
  actualQty?: number | null;
  comment?: string | null;
  nomenclature: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
    category?: { name: string } | null;
    stockItems?: Array<{
      warehouseId?: string;
      cell?: {
        code: string;
        name?: string | null;
        zone?: { name: string; code: string } | null;
      } | null;
    }>;
  };
}

export interface InventoryCountSheetDetail {
  id: string;
  warehouseId: string;
  status: string;
  comment?: string | null;
  createdAt: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
    responsibleUser?: { id: string; displayName: string } | null;
  };
  createdBy: { displayName: string; ldapLogin: string };
  items: InventoryCountSheetItem[];
}

const factCellBoxSx = {
  border: '1px dashed',
  borderColor: 'text.disabled',
  borderRadius: '4px',
  height: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'background.paper',
  fontSize: '0.75rem',
  color: 'text.secondary',
};

function CountSheetTableRow({
  item,
  idx,
  warehouseId,
}: {
  item: InventoryCountSheetItem;
  idx: number;
  warehouseId: string;
}) {
  return (
    <TableRow hover>
      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', color: 'text.secondary' }}>
        {idx + 1}
      </TableCell>
      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {item.nomenclature.article || '—'}
      </TableCell>
      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: FONT_SEMI_BOLD, color: 'text.primary' }}>
        {item.nomenclature.name}
      </TableCell>
      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', color: 'text.secondary' }}>
        {getCellAddress(item, warehouseId)}
      </TableCell>
      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem' }}>
        {item.nomenclature.unit}
      </TableCell>
      <TableCell sx={{ textAlign: 'right', fontWeight: FONT_BOLD, fontSize: '0.8125rem', color: 'text.primary' }}>
        {item.expectedQty}
      </TableCell>
      <TableCell sx={{ textAlign: 'center', backgroundColor: 'action.hover' }}>
        <Box sx={factCellBoxSx}>—</Box>
      </TableCell>
    </TableRow>
  );
}

export function CountSheetPreviewTable({
  items,
  warehouseId,
}: {
  items: InventoryCountSheetItem[];
  warehouseId: string;
}) {
  return (
    <Box sx={{ maxHeight: PREVIEW_MAX_HEIGHT, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '6px' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow sx={{ '& th': { backgroundColor: 'background.default', fontWeight: FONT_BOLD, fontSize: '0.75rem' } }}>
            <TableCell sx={{ width: 40, textAlign: 'center' }}>№</TableCell>
            <TableCell sx={{ width: COL_WIDTH_ARTICLE }}>Артикул</TableCell>
            <TableCell>Номенклатура</TableCell>
            <TableCell sx={{ width: 70, textAlign: 'center' }}>Ячейка</TableCell>
            <TableCell sx={{ width: 50, textAlign: 'center' }}>Ед.</TableCell>
            <TableCell sx={{ width: 80, textAlign: 'right' }}>Учет (склад)</TableCell>
            <TableCell sx={{ width: COL_WIDTH_FACT, textAlign: 'center', backgroundColor: 'action.selected', color: 'primary.main' }}>
              ФАКТ (ручной)
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, idx) => (
            <CountSheetTableRow
              key={item.id}
              item={item}
              idx={idx}
              warehouseId={warehouseId}
            />
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
