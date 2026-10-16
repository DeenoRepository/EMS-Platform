'use client';

import React from 'react';
import { Card, CardContent, Box, Typography, Button, Stack, Paper } from '@mui/material';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDate } from '@ems/shared';
import { DashboardStats } from './types';

interface DashboardMroWidgetProps {
  schedules: DashboardStats['mro']['nextSchedules'];
  totalCount: number;
  isPersonalScope: boolean;
  onNavigate: (path: string) => void;
}

export function DashboardMroWidget({
  schedules,
  totalCount,
  isPersonalScope,
  onNavigate,
}: DashboardMroWidgetProps) {
  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <BuildOutlinedIcon color="secondary" sx={{ fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {isPersonalScope ? 'Мои регламенты ТО (MRO)' : 'Ближайшие регламенты ТО (MRO)'}
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => onNavigate('/mro')}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            График ({totalCount})
          </Button>
        </Box>

        {schedules.length === 0 ? (
          <EmptyState
            title="График ТО свободен"
            description={
              isPersonalScope
                ? 'В вашей зоне ответственности нет запланированных ТО на ближайшее время.'
                : 'Все регламенты ТОиР выполнены в срок.'
            }
            minHeight={160}
            actionText="Перейти к графику ППР"
            onAction={() => onNavigate('/mro')}
          />
        ) : (
          <Stack spacing={1.5}>
            {schedules.map((schedule) => (
              <Paper
                key={schedule.id}
                variant="outlined"
                onClick={() => onNavigate('/mro')}
                sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'secondary.light',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ minWidth: 0, pr: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap>
                      {schedule.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {schedule.equipmentName} • Срок: <strong>{formatDate(schedule.scheduledDate)}</strong>
                      {schedule.periodicity && ` • ${schedule.periodicity}`}
                    </Typography>
                  </Box>
                  <StatusBadge status={schedule.status} label={schedule.status} size="small" />
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
