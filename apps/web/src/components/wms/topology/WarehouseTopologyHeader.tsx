'use client';

import React from 'react';
import { DialogTitle, Box, Typography, IconButton } from '@mui/material';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import CloseIcon from '@mui/icons-material/Close';

interface WarehouseTopologyHeaderProps {
  warehouse: { name: string; code: string } | null;
  totalCells: number;
  totalOccupiedCells: number;
  onClose: () => void;
}

export function WarehouseTopologyHeader({
  warehouse,
  totalCells,
  totalOccupiedCells,
  onClose,
}: WarehouseTopologyHeaderProps) {
  return (
    <DialogTitle
      sx={{
        p: 2.5,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            bgcolor: 'action.hover',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MeetingRoomOutlinedIcon sx={{ fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem', color: 'text.primary' }}>
            Топология адресного хранения
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
            Склад: <strong>{warehouse?.name}</strong> ({warehouse?.code}) • Всего ячеек: {totalCells} (занято: {totalOccupiedCells})
          </Typography>
        </Box>
      </Box>

      <IconButton onClick={onClose} size="small" aria-label="Закрыть" sx={{ color: 'text.secondary' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
  );
}
