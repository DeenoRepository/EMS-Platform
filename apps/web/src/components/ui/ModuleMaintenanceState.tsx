'use client';

import React from 'react';
import { Box, Paper, Typography, Button, Stack } from '@mui/material';
import EngineeringIcon from '@mui/icons-material/Engineering';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface ModuleMaintenanceStateProps {
  moduleName?: string;
  message?: string;
  estimatedUntil?: string | null;
  onRefresh?: () => void;
  isAdminPreview?: boolean;
}

export function ModuleMaintenanceState({
  moduleName = 'Модуль',
  message = 'В настоящее время в модуле проводятся плановые регламентные и технические работы. Доступ временно ограничен.',
  estimatedUntil,
  onRefresh,
  isAdminPreview = false,
}: ModuleMaintenanceStateProps) {
  const router = useRouter();

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 580,
          width: '100%',
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'warning.light',
          backgroundColor: 'background.paper',
          boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.08), 0 8px 10px -6px rgba(249, 115, 22, 0.04)',
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: 'warning.light',
            color: 'warning.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2.5,
          }}
        >
          <EngineeringIcon sx={{ fontSize: 38 }} />
        </Box>

        <Box sx={{ mb: 2 }}>
          <StatusBadge status="MAINTENANCE" label="Техническое обслуживание" size="small" />
        </Box>

        <Typography variant="h5" component="h1" fontWeight={700} color="text.primary" gutterBottom>
          {moduleName} на регламентных работах
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
          {message}
        </Typography>

        {estimatedUntil && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: '8px',
              backgroundColor: 'warning.light',
              color: 'warning.dark',
              fontWeight: 600,
              fontSize: '0.875rem',
              mb: 3.5,
            }}
          >
            <AccessTimeIcon sx={{ fontSize: 18 }} />
            <span>Ориентировочное время завершения: <strong>{estimatedUntil}</strong></span>
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ mt: 1 }}>
          <Button
            variant="contained"
            color="warning"
            startIcon={<HomeIcon />}
            onClick={() => router.push('/')}
            sx={{
              fontWeight: 600,
              borderRadius: '8px',
              px: 3,
              py: 1,
            }}
          >
            На Панель управления
          </Button>

          {onRefresh ? (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
              sx={{
                fontWeight: 600,
                borderRadius: '8px',
                px: 2.5,
                py: 1,
              }}
            >
              Проверить статус
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              sx={{
                fontWeight: 600,
                borderRadius: '8px',
                px: 2.5,
                py: 1,
              }}
            >
              Обновить страницу
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
