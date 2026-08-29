'use client';

import { Box, Chip, Typography } from '@mui/material';

export interface WmsDeficitItemData {
  id: string;
  name: string;
  warehouseCode: string;
  quantity: number;
  minStock: number;
  unit: string;
}

interface WmsDeficitItemProps {
  item: WmsDeficitItemData;
}

export function WmsDeficitItem({ item }: WmsDeficitItemProps) {
  const fillPercent = item.minStock > 0 ? Math.min((item.quantity / item.minStock) * 100, 100) : 0;
  const isCritical = fillPercent < 30;

  return (
    <Box sx={{ py: 1.25, px: 0, borderBottom: '1px solid action.hover', '&:last-child': { borderBottom: 'none' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.primary', flex: 1, mr: 1 }}>
          {item.name}
        </Typography>
        <Chip label={item.warehouseCode} size="small" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 600, borderRadius: '4px', bgcolor: 'grey.100', color: 'text.secondary' }} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'grey.100', overflow: 'hidden' }}>
          <Box sx={{ width: `${fillPercent}%`, height: '100%', borderRadius: 2, bgcolor: isCritical ? 'error.main' : 'warning.main', transition: 'width 0.4s ease' }} />
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 700, fontFeatureSettings: '"tnum"', color: isCritical ? 'error.main' : 'warning.main', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
          {item.quantity}/{item.minStock} {item.unit}
        </Typography>
      </Box>
    </Box>
  );
}

export default WmsDeficitItem;
