'use client';

import React from 'react';
import { Box, Button } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import PageHeader from '@/components/layout/PageHeader';

const FONT_SEMI_BOLD = 600;

interface OperationsRegistryHeaderProps {
  activeMainTab: 'operations' | 'transfers';
  canCreateOperation: boolean;
  canCreateTransfer: boolean;
  onOpenOperationWizard: () => void;
  onOpenTransferRequest: () => void;
}

export function OperationsRegistryHeader({
  activeMainTab,
  canCreateOperation,
  canCreateTransfer,
  onOpenOperationWizard,
  onOpenTransferRequest,
}: OperationsRegistryHeaderProps) {
  return (
    <PageHeader
      title="Движение ТМЦ и складские операции"
      subtitle="Единый реестр приходов, списаний, выдач сотрудникам и межскладских перемещений ТМЦ"
      breadcrumbs={[
        { label: 'Главная', href: '/' },
        { label: 'Складской учёт', href: '/wms' },
        { label: activeMainTab === 'operations' ? 'Операции' : 'Перемещения' },
      ]}
      actions={
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {canCreateTransfer && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
              onClick={onOpenTransferRequest}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: FONT_SEMI_BOLD,
                textTransform: 'none',
                bgcolor: 'background.paper',
              }}
            >
              Запрос перемещения
            </Button>
          )}

          {canCreateOperation && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
              onClick={onOpenOperationWizard}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: FONT_SEMI_BOLD,
                textTransform: 'none',
              }}
            >
              Мастер операций
            </Button>
          )}
        </Box>
      }
    />
  );
}
