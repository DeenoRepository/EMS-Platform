'use client';

import React from 'react';
import {
  Typography,
  TextField,
  MenuItem,
  Stack,
  Paper,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import {
  OperationType,
  ZoneWithCells,
  OperationLineItem,
} from './types';

interface WizardItemsTableProps {
  operationType: OperationType;
  lineItems: OperationLineItem[];
  isOutflow: boolean;
  warehouseZones: ZoneWithCells[];
  flatWarehouseCells: Array<{ id: string; code: string; name?: string | null; zoneName: string }>;
  getWarehouseStock: (nomenclatureId: string) => number;
  onUpdateItemQuantity: (index: number, newQty: number) => void;
  onUpdateItemCell: (index: number, cellId: string) => void;
  onRemoveItem: (index: number) => void;
}

export function WizardItemsTable({
  operationType,
  lineItems,
  isOutflow,
  warehouseZones,
  flatWarehouseCells,
  getWarehouseStock,
  onUpdateItemQuantity,
  onUpdateItemCell,
  onRemoveItem,
}: WizardItemsTableProps) {
  if (lineItems.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider', borderRadius: '8px' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Список позиций пуст. Воспользуйтесь строкой поиска выше, чтобы добавить позиции в операцию.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden' }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: 'background.default' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Номенклатура</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Артикул</TableCell>
            {operationType === 'ISSUE_WRITE_OFF' && (
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Назначение / Оборудование</TableCell>
            )}
            {operationType === 'RECEIPT' && (
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', minWidth: 170 }}>Ячейка хранения</TableCell>
            )}
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Остаток на складе</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', minWidth: 140 }}>Количество в операции</TableCell>
            <TableCell align="center" sx={{ width: 50 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {lineItems.map((item, idx) => {
            const rawStock = getWarehouseStock(item.nomenclatureId);
            const hasDeficit = isOutflow && item.quantity > rawStock;
            return (
              <TableRow key={idx} hover sx={hasDeficit ? { bgcolor: 'error.light' } : {}}>
                <TableCell sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>
                  {item.nomenclatureName}
                </TableCell>
                <TableCell sx={{ py: 1, color: 'text.disabled', fontSize: '0.75rem' }}>
                  {item.nomenclatureArticle || '—'}
                </TableCell>
                {operationType === 'ISSUE_WRITE_OFF' && (
                  <TableCell sx={{ py: 1 }}>
                    {item.equipmentName ? (
                      <Chip
                        size="small"
                        icon={<PrecisionManufacturingIcon sx={{ fontSize: '14px !important' }} />}
                        label={item.equipmentName}
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24, maxWidth: 220 }}
                      />
                    ) : (
                      <Chip
                        size="small"
                        label={item.writeOffReason || 'Списание в неликвид/брак'}
                        variant="outlined"
                        sx={{ fontWeight: 500, fontSize: '0.75rem', height: 24, color: 'text.disabled' }}
                      />
                    )}
                  </TableCell>
                )}
                {operationType === 'RECEIPT' && (
                  <TableCell sx={{ py: 0.75 }}>
                    {flatWarehouseCells.length > 0 ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={item.cellId || ''}
                        onChange={(e) => onUpdateItemCell(idx, e.target.value)}
                        sx={{
                          minWidth: 160,
                          '& .MuiOutlinedInput-root': {
                            fontSize: '0.8125rem',
                            height: 32,
                            borderRadius: '6px',
                            bgcolor: 'background.paper',
                          },
                        }}
                      >
                        <MenuItem value=""><em>— Без ячейки —</em></MenuItem>
                        {warehouseZones.map((zone) => [
                          <MenuItem key={`tbl-cell-head-${zone.id}`} disabled sx={{ fontWeight: 700, bgcolor: 'grey.100', fontSize: '0.75rem' }}>
                            {zone.name} ({zone.code})
                          </MenuItem>,
                          ...zone.cells.map((cell) => (
                            <MenuItem key={cell.id} value={cell.id} sx={{ pl: 3, fontSize: '0.8125rem' }}>
                              {cell.code} {cell.name ? `— ${cell.name}` : ''}
                            </MenuItem>
                          )),
                        ])}
                      </TextField>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Без ячеек
                      </Typography>
                    )}
                  </TableCell>
                )}
                <TableCell align="right" sx={{ py: 1 }}>
                  <Chip
                    size="small"
                    label={`${rawStock} ${item.unit}`}
                    color={rawStock > 0 ? (hasDeficit ? 'error' : 'default') : 'error'}
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                    <TextField
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateItemQuantity(idx, isNaN(val) ? 0 : val);
                      }}
                      inputProps={{
                        min: 0.01,
                        step: 'any',
                        style: {
                          textAlign: 'right',
                          fontWeight: 700,
                          fontFeatureSettings: '"tnum"',
                          padding: '4px 8px',
                          height: 24,
                        },
                      }}
                      error={item.quantity <= 0 || hasDeficit}
                      sx={{
                        width: 100,
                        '& .MuiOutlinedInput-root': {
                          height: 32,
                          borderRadius: '6px',
                          bgcolor: 'background.paper',
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 20 }}>
                      {item.unit}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ py: 0.5 }}>
                  <IconButton size="small" color="error" onClick={() => onRemoveItem(idx)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
