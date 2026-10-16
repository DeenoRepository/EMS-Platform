'use client';

import React from 'react';
import { Stack, Button, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageHeader from '@/components/layout/PageHeader';
import { OperationType } from '@/components/wms';

const FONT_SEMI_BOLD = 600;
const FONT_MEDIUM = 500;

interface WmsDashboardHeaderProps {
  isModuleInMaintenance: boolean;
  canCreateOperations: boolean;
  refreshing: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenWizard: (type: OperationType) => void;
}

export function WmsDashboardHeader({
  isModuleInMaintenance,
  canCreateOperations,
  refreshing,
  isLoading,
  onRefresh,
  onOpenWizard,
}: WmsDashboardHeaderProps) {
  return (
    <>
      {isModuleInMaintenance && (
        <Alert
          severity="warning"
          sx={{
            mb: 2.5,
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'warning.light',
            backgroundColor: 'warning.light',
            fontWeight: FONT_MEDIUM,
          }}
        >
          <strong>Режим предпросмотра администратора:</strong> Модуль WMS переведен в режим технического обслуживания. Для обычных пользователей доступ временно закрыт.
        </Alert>
      )}

      <PageHeader
        title="Панель материальных потоков и остатков (WMS)"
        subtitle="Сводный баланс ТМЦ, мониторинг неснижаемых запасов, дефицитные позиции и статистика движения"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Складской учёт ТМЦ' }]}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon className={refreshing ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
              onClick={onRefresh}
              disabled={isLoading || refreshing}
              aria-label="Обновить аналитику склада"
              sx={{
                height: 38,
                px: 2,
                fontSize: '0.8125rem',
                fontWeight: FONT_SEMI_BOLD,
                borderRadius: '10px',
                textTransform: 'none',
                bgcolor: 'background.paper',
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': { bgcolor: 'action.hover', borderColor: 'text.disabled' },
              }}
            >
              Обновить
            </Button>
            {canCreateOperations && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                onClick={() => onOpenWizard('RECEIPT')}
                aria-label="Оформить операцию через мастер"
                sx={{
                  height: 38,
                  px: 2,
                  fontSize: '0.8125rem',
                  fontWeight: FONT_SEMI_BOLD,
                  borderRadius: '10px',
                  textTransform: 'none',
                }}
              >
                Мастер операций
              </Button>
            )}
          </Stack>
        }
      />
    </>
  );
}
