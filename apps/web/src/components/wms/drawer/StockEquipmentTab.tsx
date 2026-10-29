'use client';

import React from 'react';
import { Box, Typography, Stack, Paper } from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { useRouter } from 'next/navigation';
import { EmptyState, StatusBadge } from '@/components/ui';
import { StockDetailData } from '../StockDetailDrawer';

interface StockEquipmentTabProps {
  stockItem: StockDetailData;
}

export function StockEquipmentTab({ stockItem }: StockEquipmentTabProps) {
  const router = useRouter();

  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        Оборудование и технологические линии, где устанавливается данная деталь:
      </Typography>

      {stockItem.compatibleEquipment.length === 0 ? (
        <EmptyState
          icon={<PrecisionManufacturingIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
          title="Оборудование не привязано"
          description="В каталоге ТМЦ нет привязки к конкретному оборудованию"
          minHeight={160}
        />
      ) : (
        stockItem.compatibleEquipment.map((eq) => (
          <Paper
            key={eq.id}
            elevation={0}
            onClick={() => router.push(`/equipment/${eq.id}`)}
            sx={{
              p: 1.75,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'background.default',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {eq.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Инв. №: <strong>{eq.inventoryNumber}</strong>
              </Typography>
            </Box>

            <StatusBadge status="PASSPORT" size="small" />
          </Paper>
        ))
      )}
    </Stack>
  );
}
