'use client';

import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { EmptyState, StatusBadge } from '@/components/ui';
import type { StockDetailData } from './StockDetailDrawer';

interface StockDetailEquipmentTabProps {
  activeTab: number;
  stockItem: StockDetailData;
  onOpenEquipment: (equipmentId: string) => void;
}

export function StockDetailEquipmentTab({ activeTab, stockItem, onOpenEquipment }: StockDetailEquipmentTabProps) {
  if (activeTab !== 1) return null;

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
        stockItem.compatibleEquipment.map((equipment) => (
          <Paper
            key={equipment.id}
            elevation={0}
            onClick={() => onOpenEquipment(equipment.id)}
            sx={{
              p: 1.75,
              borderRadius: '8px',
              border: '1px solid divider',
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
                {equipment.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Инв. №: <strong>{equipment.inventoryNumber}</strong>
              </Typography>
            </Box>
            <StatusBadge status="PASSPORT" size="small" />
          </Paper>
        ))
      )}
    </Stack>
  );
}
