'use client';

import { Box, Chip, IconButton, TableCell, TableRow, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import type { OperationLineItem, OperationType } from './WmsOperationWizardDialog';

interface WmsOperationItemRowProps {
  item: OperationLineItem;
  operationType: OperationType;
  rawStock: number;
  isOutflow: boolean;
  onRemove: () => void;
}

export function WmsOperationItemRow({ item, operationType, rawStock, isOutflow, onRemove }: WmsOperationItemRowProps) {
  const hasDeficit = isOutflow && item.quantity > rawStock;

  return (
    <TableRow hover sx={hasDeficit ? { bgcolor: 'error.light' } : {}}>
      <TableCell sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>{item.nomenclatureName}</TableCell>
      <TableCell sx={{ py: 1, color: 'text.disabled', fontSize: '0.75rem' }}>{item.nomenclatureArticle || '—'}</TableCell>
      {operationType === 'ISSUE_WRITE_OFF' && (
        <TableCell sx={{ py: 1 }}>
          {item.equipmentName ? (
            <Chip size="small" icon={<PrecisionManufacturingIcon sx={{ fontSize: '14px !important' }} />} label={item.equipmentName} color="warning" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24, maxWidth: 220 }} />
          ) : (
            <Chip size="small" label={item.writeOffReason || 'Списание в неликвид/брак'} variant="outlined" sx={{ fontWeight: 500, fontSize: '0.75rem', height: 24, color: 'text.disabled' }} />
          )}
        </TableCell>
      )}
      <TableCell align="right" sx={{ py: 1 }}>
        <Chip size="small" label={`${rawStock} ${item.unit}`} color={rawStock > 0 ? (hasDeficit ? 'error' : 'default') : 'error'} variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }} />
      </TableCell>
      <TableCell align="right" sx={{ py: 1, fontWeight: 700, fontFeatureSettings: '"tnum"', color: hasDeficit ? 'error.main' : 'inherit' }}>
        {item.quantity} {item.unit}
        {hasDeficit && <Typography variant="caption" sx={{ display: 'block', color: 'error.main', fontWeight: 700 }}>Превышение остатка!</Typography>}
      </TableCell>
      <TableCell align="center" sx={{ py: 0.5 }}>
        <IconButton size="small" color="error" onClick={onRemove}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
