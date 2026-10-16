'use client';

import React from 'react';
import { Box, Button, Tooltip, Alert } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/layout/PageHeader';

interface EquipmentRegistryHeaderProps {
  isModuleInMaintenance: boolean;
  showKpiCards: boolean;
  canBatchEdit: boolean;
  canPurge: boolean;
  canCreate: boolean;
  onToggleKpi: () => void;
  onExport: () => void;
  onOpenBatchEdit: () => void;
  onOpenPurge: () => void;
  onOpenCreate: () => void;
}

export function EquipmentRegistryHeader({
  isModuleInMaintenance,
  showKpiCards,
  canBatchEdit,
  canPurge,
  canCreate,
  onToggleKpi,
  onExport,
  onOpenBatchEdit,
  onOpenPurge,
  onOpenCreate,
}: EquipmentRegistryHeaderProps) {
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
            fontWeight: 500,
          }}
        >
          <strong>Режим предпросмотра администратора:</strong> Модуль переведен в режим технического обслуживания. Для обычных пользователей модуль временно закрыт.
        </Alert>
      )}

      <PageHeader
        title="Реестр технологического оборудования"
        subtitle="Паспортизация, технические характеристики, эксплуатационный статус и жизненный цикл оборудования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Реестр оборудования' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tooltip title={showKpiCards ? 'Скрыть блок KPI' : 'Показать аналитические карточки KPI'}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<BarChartIcon />}
                onClick={onToggleKpi}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  borderColor: 'divider',
                  color: showKpiCards ? 'text.secondary' : 'primary.main',
                  px: 1.5,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  bgcolor: 'background.paper',
                }}
              >
                {showKpiCards ? 'Скрыть KPI' : 'Показать KPI'}
              </Button>
            </Tooltip>

            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={onExport}
              sx={{
                height: 38,
                borderRadius: '8px',
                borderColor: 'divider',
                color: 'text.primary',
                px: 1.5,
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: 'background.paper',
              }}
            >
              Экспорт (Excel)
            </Button>

            {canBatchEdit && (
              <Button
                variant="outlined"
                size="small"
                color="primary"
                startIcon={<FindReplaceIcon />}
                onClick={onOpenBatchEdit}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  px: 1.5,
                  bgcolor: 'background.paper',
                }}
              >
                Пакетная правка
              </Button>
            )}

            {canPurge && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteForeverIcon />}
                onClick={onOpenPurge}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  px: 1.5,
                  bgcolor: 'background.paper',
                }}
              >
                Очистить базу
              </Button>
            )}

            {canCreate && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={onOpenCreate}
                sx={{
                  height: 38,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  px: 2,
                }}
              >
                Добавить оборудование
              </Button>
            )}
          </Box>
        }
      />
    </>
  );
}
