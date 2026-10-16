'use client';

import React from 'react';
import {
  TableRow,
  TableCell,
  Checkbox,
  Tooltip,
  Typography,
  Chip,
  Button,
  Stack,
} from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { StatusBadge } from '@/components/ui';
import { StockRow } from './types';

const FONT_SEMI_BOLD = 600;
const FONT_BOLD = 700;
const MAX_EQUIPMENT_CHIPS = 3;

interface StockTableRowProps {
  row: StockRow;
  isChecked: boolean;
  visibleColumns: string[];
  canEditLoc: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDrawer: (row: StockRow) => void;
  onOpenLocationModal: (row: StockRow) => void;
  onNavigate: (path: string) => void;
}

export function StockTableRow({
  row,
  isChecked,
  visibleColumns,
  canEditLoc,
  onToggleSelect,
  onOpenDrawer,
  onOpenLocationModal,
  onNavigate,
}: StockTableRowProps) {
  return (
    <TableRow
      hover
      selected={isChecked}
      sx={{
        cursor: 'pointer',
        bgcolor: row.isLowStock ? 'action.hover' : undefined,
      }}
    >
      <TableCell padding="checkbox" sx={{ pl: 2 }} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          size="small"
          checked={isChecked}
          onChange={() => onToggleSelect(row.id)}
        />
      </TableCell>

      {visibleColumns.includes('warehouse') && (
        <TableCell>
          <Chip
            label={row.warehouseCode}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: FONT_SEMI_BOLD,
              borderRadius: '4px',
              fontSize: '0.6875rem',
              height: 20,
            }}
          />
          <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary', fontSize: '0.75rem' }}>
            {row.warehouseName}
          </Typography>
        </TableCell>
      )}

      {visibleColumns.includes('zone') && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          {row.cellCode ? (
            <Tooltip title={canEditLoc ? 'Изменить ячейку хранения' : 'Только МОЛ склада'}>
              <span>
                <Chip
                  icon={<PlaceOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                  label={`${row.zoneCode || row.zoneName} • ${row.cellCode}`}
                  size="small"
                  clickable={canEditLoc}
                  onClick={() => canEditLoc && onOpenLocationModal(row)}
                  sx={{
                    fontWeight: FONT_SEMI_BOLD,
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    bgcolor: canEditLoc ? 'action.hover' : 'background.default',
                    color: canEditLoc ? 'primary.main' : 'text.disabled',
                    border: '1px solid',
                    borderColor: canEditLoc ? 'primary.light' : 'divider',
                  }}
                />
              </span>
            </Tooltip>
          ) : canEditLoc ? (
            <Button
              size="small"
              variant="text"
              startIcon={<PlaceOutlinedIcon sx={{ fontSize: 13, color: 'primary.main' }} />}
              onClick={() => onOpenLocationModal(row)}
              sx={{ fontSize: '0.75rem', py: 0.2, fontWeight: FONT_SEMI_BOLD, color: 'primary.main' }}
            >
              + Ячейка
            </Button>
          ) : (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>—</Typography>
          )}
        </TableCell>
      )}

      {visibleColumns.includes('sku') && (
        <TableCell sx={{ fontFamily: 'monospace', fontWeight: FONT_SEMI_BOLD, fontSize: '0.8125rem', color: 'text.secondary' }}>
          {row.article && row.article !== '—' ? (
            <Chip
              label={row.article}
              size="small"
              variant="outlined"
              sx={{
                borderRadius: '4px',
                fontWeight: FONT_SEMI_BOLD,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                height: 22,
              }}
            />
          ) : (
            '—'
          )}
        </TableCell>
      )}

      {visibleColumns.includes('name') && (
        <TableCell
          onClick={() => onOpenDrawer(row)}
          sx={{
            fontWeight: FONT_SEMI_BOLD,
            fontSize: '0.8125rem',
            color: 'primary.main',
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: FONT_SEMI_BOLD, color: 'primary.main', fontSize: '0.8125rem' }}>
            {row.name}
          </Typography>
          {row.description && !row.name.includes(row.description.replace('Модель: ', '')) && (
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.75rem', mt: 0.25 }}>
              {row.description}
            </Typography>
          )}
        </TableCell>
      )}

      {visibleColumns.includes('category') && (
        <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          {row.category || '—'}
        </TableCell>
      )}

      {visibleColumns.includes('quantity') && (
        <TableCell align="right">
          <Typography
            variant="body2"
            sx={{
              fontWeight: FONT_BOLD,
              fontSize: '0.875rem',
              fontFeatureSettings: '"tnum"',
              color: row.isLowStock ? 'error.main' : 'text.primary',
            }}
          >
            {row.quantity} {row.unit}
          </Typography>
        </TableCell>
      )}

      {visibleColumns.includes('inTransit') && (
        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
          {row.inTransitIn && row.inTransitIn > 0 ? (
            <Tooltip title={`Ожидается поступление: +${row.inTransitIn} ${row.unit}`} arrow>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`+${row.inTransitIn} ${row.unit}`}
                sx={{ fontWeight: FONT_BOLD, fontSize: '0.75rem', cursor: 'pointer' }}
                onClick={() => onNavigate('/wms/operations')}
              />
            </Tooltip>
          ) : row.inTransitOut && row.inTransitOut > 0 ? (
            <Tooltip title={`Отправлено с этого склада в пути: ${row.inTransitOut} ${row.unit}`} arrow>
              <Chip
                size="small"
                variant="outlined"
                label={`-${row.inTransitOut} ${row.unit} (отпр.)`}
                sx={{ fontWeight: FONT_SEMI_BOLD, fontSize: '0.6875rem', color: 'text.secondary' }}
              />
            </Tooltip>
          ) : (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>
          )}
        </TableCell>
      )}

      {visibleColumns.includes('minQuantity') && (
        <TableCell align="center">
          <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"', fontSize: '0.8125rem', color: 'text.secondary' }}>
            {row.minStock} {row.minStock !== '—' ? row.unit : ''}
          </Typography>
        </TableCell>
      )}

      {visibleColumns.includes('status') && (
        <TableCell align="center">
          {row.isReplenishing ? (
            <StatusBadge status="IN_TRANSIT" label="В пути (Пополняется)" />
          ) : (
            <StatusBadge
              status={row.isLowStock ? 'LOW_STOCK' : 'NORMAL_STOCK'}
              label={row.isLowStock ? 'Дефицит' : 'В норме'}
            />
          )}
        </TableCell>
      )}

      {visibleColumns.includes('equipment') && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          {row.compatibleEquipment && row.compatibleEquipment.length > 0 ? (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              {row.compatibleEquipment.slice(0, MAX_EQUIPMENT_CHIPS).map((eq) => (
                <Tooltip key={eq.id} title={`Инв. № ${eq.inventoryNumber}`}>
                  <Chip
                    icon={<PrecisionManufacturingIcon sx={{ fontSize: '13px !important' }} />}
                    label={eq.name}
                    size="small"
                    clickable
                    onClick={() => onNavigate(`/eps/${eq.id}`)}
                    sx={{
                      fontSize: '0.6875rem',
                      height: 22,
                      borderRadius: '4px',
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      color: 'text.secondary',
                      fontWeight: 500,
                    }}
                  />
                </Tooltip>
              ))}
              {row.compatibleEquipment.length > MAX_EQUIPMENT_CHIPS && (
                <Chip
                  label={`+${row.compatibleEquipment.length - MAX_EQUIPMENT_CHIPS}`}
                  size="small"
                  sx={{ fontSize: '0.6875rem', height: 22, borderRadius: '4px' }}
                />
              )}
            </Stack>
          ) : (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
