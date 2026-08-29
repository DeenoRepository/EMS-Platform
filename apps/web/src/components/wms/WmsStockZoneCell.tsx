import React from 'react';
import {
  Button,
  Chip,
  Tooltip,
  Typography,
} from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import type { StockRow } from '@/app/wms/stock/page';

const FOREIGN_WAREHOUSE_MESSAGE = 'Чужой склад: назначение ячейки разрешено только назначенному МОЛ склада или администратору';

export interface WmsStockZoneCellProps {
  row: StockRow;
  canEdit: boolean;
  onOpenLocation: (row: StockRow) => void;
}

export function WmsStockZoneCell({ row, canEdit, onOpenLocation }: WmsStockZoneCellProps) {
  if (row.cellCode) {
    return (
      <Tooltip title={canEdit ? 'Нажмите, чтобы изменить ячейку хранения' : FOREIGN_WAREHOUSE_MESSAGE}>
        <span>
          <Chip
            icon={<PlaceOutlinedIcon sx={{ fontSize: '13px !important' }} />}
            label={`${row.zoneCode || row.zoneName} • ${row.cellCode}`}
            size="small"
            clickable={canEdit}
            onClick={(event) => {
              if (canEdit) {
                event.stopPropagation();
                onOpenLocation(row);
              }
            }}
            sx={{
              fontWeight: 600,
              borderRadius: '4px',
              fontSize: '0.75rem',
              backgroundColor: canEdit ? 'info.light' : 'background.default',
              color: canEdit ? 'primary.main' : 'text.disabled',
              border: canEdit ? '1px solid primary.light' : '1px solid divider',
              cursor: canEdit ? 'pointer' : 'default',
              opacity: canEdit ? 1 : 0.85,
            }}
          />
        </span>
      </Tooltip>
    );
  }

  if (canEdit) {
    return (
      <Button
        size="small"
        variant="text"
        startIcon={<PlaceOutlinedIcon sx={{ fontSize: 13, color: 'primary.main' }} />}
        onClick={(event) => {
          event.stopPropagation();
          onOpenLocation(row);
        }}
        sx={{ fontSize: '0.75rem', py: 0.2, fontWeight: 600, color: 'primary.main' }}
      >
        + Ячейка
      </Button>
    );
  }

  return (
    <Tooltip title={FOREIGN_WAREHOUSE_MESSAGE}>
      <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', cursor: 'default' }}>
        —
      </Typography>
    </Tooltip>
  );
}

export default WmsStockZoneCell;
