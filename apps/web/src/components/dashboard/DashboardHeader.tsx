'use client';

import React from 'react';
import { Box, Stack, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '@/components/layout/PageHeader';

interface DashboardHeaderProps {
  isPersonalScope: boolean;
  currentDisplayName: string;
  canToggleScope: boolean;
  selectedScope: 'enterprise' | 'personal';
  refreshing: boolean;
  onScopeChange: (newScope: 'enterprise' | 'personal') => void;
  onRefresh: () => void;
}

export function DashboardHeader({
  isPersonalScope,
  currentDisplayName,
  canToggleScope,
  selectedScope,
  refreshing,
  onScopeChange,
  onRefresh,
}: DashboardHeaderProps) {
  const handleToggle = (_: any, newScope: 'enterprise' | 'personal' | null) => {
    if (newScope && newScope !== selectedScope) {
      onScopeChange(newScope);
    }
  };

  return (
    <PageHeader
      title="Сводная панель показателей"
      subtitle={
        isPersonalScope
          ? `Персональная зона ответственности сотрудника: ${currentDisplayName}`
          : 'Сводный обзор показателей оборудования, складских запасов и регламентов ТО предприятия'
      }
      breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Сводная панель' }]}
      actions={
        <Stack direction="row" spacing={1.5} alignItems="center">
          {canToggleScope && (
            <Box
              sx={{
                bgcolor: 'action.hover',
                p: '3px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'divider',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <ToggleButtonGroup
                value={selectedScope}
                exclusive
                onChange={handleToggle}
                size="small"
                sx={{
                  '& .MuiToggleButtonGroup-grouped': {
                    border: 'none !important',
                    borderRadius: '8px !important',
                    mx: '2px',
                  },
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.5,
                    height: 30,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: 'text.secondary',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'background.paper',
                      color: 'primary.main',
                      fontWeight: 700,
                      boxShadow: 1,
                    },
                  },
                }}
              >
                <ToggleButton value="enterprise">
                  <BusinessIcon sx={{ fontSize: 16, mr: 0.75 }} />
                  Все предприятие
                </ToggleButton>
                <ToggleButton value="personal">
                  <PersonIcon sx={{ fontSize: 16, mr: 0.75 }} />
                  Моя зона
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={onRefresh}
            startIcon={
              <RefreshIcon
                sx={{
                  fontSize: 16,
                  ...(refreshing ? { animation: 'spin 1s linear infinite' } : {}),
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
            }
            sx={{
              height: 38,
              px: 2,
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: '10px',
              textTransform: 'none',
              bgcolor: 'background.paper',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'text.disabled',
              },
            }}
          >
            Обновить данные
          </Button>
        </Stack>
      }
    />
  );
}
