'use client';

import React from 'react';
import { Card, CardContent, Box, Typography, Button, Stack, Paper, Chip } from '@mui/material';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { StatusBadge, EmptyState } from '@/components/ui';
import { DashboardStats } from './types';

interface DashboardSrmWidgetProps {
  issues: DashboardStats['srm']['recentIssues'];
  totalIssues: number;
  isPersonalScope: boolean;
  onNavigate: (path: string) => void;
  onOpenCreateDialog?: () => void;
}

export function DashboardSrmWidget({
  issues,
  totalIssues,
  isPersonalScope,
  onNavigate,
  onOpenCreateDialog,
}: DashboardSrmWidgetProps) {
  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <BugReportOutlinedIcon color="warning" sx={{ fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {isPersonalScope ? 'Мои обращения (SRM)' : 'Оперативные инциденты (SRM)'}
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => onNavigate('/srm')}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Все ({totalIssues})
          </Button>
        </Box>

        {issues.length === 0 ? (
          <EmptyState
            title="Нет открытых инцидентов"
            description={
              isPersonalScope
                ? 'В вашей зоне ответственности активных заявок нет.'
                : 'Все сервисные заявки и инциденты закрыты.'
            }
            minHeight={160}
            actionText={onOpenCreateDialog ? 'Подать заявку' : undefined}
            onAction={onOpenCreateDialog}
          />
        ) : (
          <Stack spacing={1.5}>
            {issues.map((issue) => (
              <Paper
                key={issue.id}
                variant="outlined"
                onClick={() => onNavigate('/srm')}
                sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'primary.light',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={issue.key}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700 }}
                      />
                      <Typography variant="subtitle2" fontWeight={700} noWrap color="text.primary">
                        {issue.title}
                      </Typography>
                    </Box>
                    {issue.equipment && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Оборудование: <strong>{issue.equipment.name}</strong> ({issue.equipment.inventoryNumber || 'Б/Н'})
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" flexShrink={0}>
                    <StatusBadge status={issue.priority} label={issue.priority} size="small" />
                    <StatusBadge status={issue.status} label={issue.status} size="small" />
                  </Stack>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
