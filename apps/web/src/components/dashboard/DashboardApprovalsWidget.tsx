'use client';

import React from 'react';
import { Card, CardContent, Box, Typography, Button, Stack, Paper } from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatDate } from '@ems/shared';
import { DashboardStats } from './types';

interface DashboardApprovalsWidgetProps {
  approvals: DashboardStats['approvals']['recentApprovals'];
  pendingCount: number;
  toReviewCount?: number;
  onNavigate: (path: string) => void;
}

export function DashboardApprovalsWidget({
  approvals = [],
  pendingCount,
  toReviewCount = 0,
  onNavigate,
}: DashboardApprovalsWidgetProps) {
  const subtitle = toReviewCount > 0
    ? `${toReviewCount} требует вашего решения`
    : `${pendingCount} в очереди`;

  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <FactCheckOutlinedIcon color="primary" sx={{ fontSize: 22 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                Очередь согласований
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => onNavigate('/eps/approvals')}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Все ({pendingCount})
          </Button>
        </Box>

        {approvals.length === 0 ? (
          <EmptyState
            title="Нет ожидающих согласований"
            description="Все заявки на ввод, списание или изменение статуса оборудования рассмотрены."
            minHeight={140}
            actionText="Реестр согласований"
            onAction={() => onNavigate('/eps/approvals')}
          />
        ) : (
          <Stack spacing={1.25}>
            {approvals.map((approval) => (
              <Paper
                key={approval.id}
                variant="outlined"
                onClick={() => onNavigate('/eps/approvals')}
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap>
                      {approval.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {approval.requesterName} • {formatDate(approval.createdAt)}
                      {approval.equipmentName ? ` • ${approval.equipmentName}` : ''}
                    </Typography>
                  </Box>
                  <StatusBadge status={approval.type} label={approval.type} size="small" />
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
