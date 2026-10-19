'use client';

import React from 'react';
import { Grid } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { StatCard } from '@/components/ui';
import { InventoryDetailKpiStats } from './detail-types';

interface InventoryDetailKpiBarProps {
  stats: InventoryDetailKpiStats;
  diffOnly: boolean;
  onToggleDiffOnly: () => void;
}

export function InventoryDetailKpiBar({
  stats,
  diffOnly,
  onToggleDiffOnly,
}: InventoryDetailKpiBarProps) {
  return (
    <Grid container spacing={1.75} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Статус акта"
          value={stats.statusLabel}
          subtitle={`Ответственный: ${stats.createdByDisplayName}`}
          icon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
          iconColor="primary.main"
          accentColor="primary.main"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Всего позиций"
          value={stats.totalItems}
          subtitle={`Совпадают: ${stats.matchCount}`}
          icon={<LayersOutlinedIcon sx={{ fontSize: 20 }} />}
          iconColor="text.secondary"
          accentColor="primary.main"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Выявлено излишков (+)"
          value={stats.surplusCount}
          subtitle="Факт выше учетного"
          icon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
          iconColor="success.main"
          accentColor="success.main"
          active={diffOnly}
          onClick={onToggleDiffOnly}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Выявлено недостач (-)"
          value={stats.deficitCount}
          subtitle="Факт ниже учетного"
          icon={<WarningAmberIcon sx={{ fontSize: 20 }} />}
          iconColor="error.main"
          accentColor="error.main"
          active={diffOnly}
          onClick={onToggleDiffOnly}
        />
      </Grid>
    </Grid>
  );
}
