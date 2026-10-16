'use client';

import React from 'react';
import { Card, CardContent, Box, Typography, Divider } from '@mui/material';
import { HealthScoreGauge, TrendSparkline } from '@/components/ui';
import { DashboardStats } from './types';

interface DashboardHealthWidgetProps {
  stats: DashboardStats;
  isPersonalScope: boolean;
  availabilityRate: number;
  loading?: boolean;
  onNavigate: (path: string) => void;
}

export function DashboardHealthWidget({
  stats,
  isPersonalScope,
  availabilityRate,
  loading = false,
  onNavigate,
}: DashboardHealthWidgetProps) {
  const activeEquip = stats.eps.active || 0;
  const underRepairEquip = stats.eps.underRepair || 0;
  const inStorageEquip = stats.eps.inStorage || 0;

  const metrics = [
    { label: 'В работе', value: activeEquip, status: 'good' as const },
    {
      label: 'В ремонте',
      value: underRepairEquip,
      status: underRepairEquip > 0 ? ('critical' as const) : ('good' as const),
    },
    { label: 'Хранение', value: inStorageEquip, status: 'warning' as const },
  ];

  const trendData = stats.eps.ktgTrend && stats.eps.ktgTrend.length > 0
    ? stats.eps.ktgTrend
    : [availabilityRate];

  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
          {isPersonalScope ? 'КТГ зоны ответственности' : 'Коэффициент готовности (КТГ)'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {isPersonalScope
            ? 'Доля исправного оборудования в вашей зоне ответственности'
            : 'Доля исправного оборудования парка, готового к бесперебойной эксплуатации'}
        </Typography>

        <Box sx={{ py: 1 }}>
          <HealthScoreGauge
            score={availabilityRate}
            size="md"
            paper={false}
            title=""
            metrics={metrics}
            loading={loading}
            onClick={() => onNavigate('/eps')}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ pt: 0.5 }}>
          <TrendSparkline
            data={trendData}
            title="Динамика КТГ (5 недель)"
            currentValue={`${availabilityRate}%`}
            periodLabel="vs пред. период"
            height={44}
            paper={false}
            loading={loading}
            color={availabilityRate >= 85 ? 'success.main' : 'warning.main'}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
