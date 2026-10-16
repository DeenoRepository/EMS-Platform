'use client';

import React from 'react';
import { Paper, Box, Typography, Stack, Button } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import AddIcon from '@mui/icons-material/Add';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import { PERMISSIONS } from '@ems/shared';

interface DashboardQuickActionsProps {
  hasPermission: (permission: string) => boolean;
  onAddEquipment: () => void;
  onOpenSrmDialog: () => void;
  onOpenWmsWizard: () => void;
  onOpenMro: () => void;
}

export function DashboardQuickActions({
  hasPermission,
  onAddEquipment,
  onOpenSrmDialog,
  onOpenWmsWizard,
  onOpenMro,
}: DashboardQuickActionsProps) {
  const canCreateEquip = hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE);
  const canCreateSrm = hasPermission(PERMISSIONS.SRM_REQUESTS_CREATE);
  const canCreateWms = hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE);
  const canExecuteMro = hasPermission(PERMISSIONS.MRO_EXECUTION_COMPLETE);

  if (!canCreateEquip && !canCreateSrm && !canCreateWms && !canExecuteMro) {
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
            Быстрые действия
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Оперативное создание документов, заявок и перемещений в вашей зоне
          </Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: { xs: 1, sm: 0 } }}>
        {canCreateEquip && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAddEquipment}
            sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
          >
            Добавить оборудование
          </Button>
        )}

        {canCreateSrm && (
          <Button
            variant="outlined"
            size="small"
            color="warning"
            startIcon={<BugReportOutlinedIcon />}
            onClick={onOpenSrmDialog}
            sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
          >
            Подать заявку
          </Button>
        )}

        {canCreateWms && (
          <Button
            variant="outlined"
            size="small"
            color="info"
            startIcon={<MoveToInboxIcon />}
            onClick={onOpenWmsWizard}
            sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
          >
            Складская операция
          </Button>
        )}

        {canExecuteMro && (
          <Button
            variant="contained"
            size="small"
            color="secondary"
            startIcon={<BuildOutlinedIcon />}
            onClick={onOpenMro}
            sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
          >
            Провести ТО
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
