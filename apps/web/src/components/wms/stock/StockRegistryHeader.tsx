'use client';

import React from 'react';
import { Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageHeader from '@/components/layout/PageHeader';

interface StockRegistryHeaderProps {
  canCreateOperation: boolean;
  canManageNomenclature: boolean;
  canRecalculate: boolean;
  isRecalculating: boolean;
  onOpenOperationWizard: () => void;
  onOpenCreateNomenclature: () => void;
  onRecalculate: () => void;
}

export function StockRegistryHeader({
  canCreateOperation,
  canManageNomenclature,
  canRecalculate,
  isRecalculating,
  onOpenOperationWizard,
  onOpenCreateNomenclature,
  onRecalculate,
}: StockRegistryHeaderProps) {
  return (
    <PageHeader
      title="Реестр номенклатуры и складских остатков"
      subtitle="Сводный баланс ТМЦ, адресное хранение, неснижаемые остатки и межскладской транзит"
      breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Складской учёт ТМЦ' }]}
      actions={
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {canRecalculate && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<SyncIcon className={isRecalculating ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
              onClick={onRecalculate}
              disabled={isRecalculating}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: 'background.paper',
                borderColor: 'divider',
                color: 'text.primary',
              }}
            >
              {isRecalculating ? 'Пересчет...' : 'Пересчитать остатки'}
            </Button>
          )}

          {canCreateOperation && (
            <Button
              variant="contained"
              size="small"
              color="primary"
              startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
              onClick={onOpenOperationWizard}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Мастер операций
            </Button>
          )}

          {canManageNomenclature && (
            <Button
              variant="contained"
              size="small"
              color="secondary"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={onOpenCreateNomenclature}
              sx={{
                height: 38,
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Добавить ТМЦ
            </Button>
          )}
        </Box>
      }
    />
  );
}
