'use client';

import React from 'react';
import { Paper, Box, Typography, Stack, Button } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { PERMISSIONS } from '@ems/shared';
import { OperationType } from '@/components/wms';

interface WmsQuickActionsProps {
  hasPermission: (permission: string) => boolean;
  onOpenWizard: (type: OperationType) => void;
  onNavigate: (path: string) => void;
}

export function WmsQuickActions({
  hasPermission,
  onOpenWizard,
  onNavigate,
}: WmsQuickActionsProps) {
  const canCreateOperation = hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE);
  const canManageInventory = hasPermission(PERMISSIONS.WMS_INVENTORY_MANAGE);

  if (!canCreateOperation && !canManageInventory) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 3,
        borderRadius: '12px',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '8px',
            bgcolor: 'action.hover',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SpeedIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary">
            Складские операции
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Оформление движения материальных потоков, списаний и перемещений
          </Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: { xs: 1, sm: 0 } }}>
        {canCreateOperation && (
          <>
            <Button
              variant="outlined"
              size="small"
              color="primary"
              startIcon={<MoveToInboxIcon />}
              onClick={() => onOpenWizard('RECEIPT')}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
            >
              Приход ТМЦ
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="warning"
              startIcon={<OutboxIcon />}
              onClick={() => onOpenWizard('ISSUE_EMPLOYEE')}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
            >
              Выдача ТМЦ
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="info"
              startIcon={<SwapHorizIcon />}
              onClick={() => onOpenWizard('TRANSFER')}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
            >
              Перемещение
            </Button>
          </>
        )}

        {canManageInventory && (
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<FactCheckOutlinedIcon />}
            onClick={() => onNavigate('/wms/inventory')}
            sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
          >
            Инвентаризация
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
