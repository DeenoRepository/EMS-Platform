'use client';

import React from 'react';
import { Grid } from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { StatCard } from '@/components/ui';
import { InventoryKpiStats } from './types';

interface InventoryKpiBarProps {
  stats: InventoryKpiStats;
  selectedStatus: string;
  loading: boolean;
  onKpiFilter: (status: string) => void;
}

export function InventoryKpiBar({
  stats,
  selectedStatus,
  loading,
  onKpiFilter,
}: InventoryKpiBarProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Всего актов"
          value={stats.total}
          subtitle="Инвентаризаций за всё время"
          icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="primary.main"
          active={!selectedStatus}
          onClick={() => onKpiFilter('')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="В процессе сверки"
          value={stats.inProgress}
          subtitle="Требуют пересчета остатков"
          icon={<PendingActionsOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="warning.main"
          active={selectedStatus === 'IN_PROGRESS'}
          onClick={() => onKpiFilter('IN_PROGRESS')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Завершено"
          value={stats.completed}
          subtitle="Сверка и проводки выполнены"
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
          accentColor="success.main"
          active={selectedStatus === 'COMPLETED'}
          onClick={() => onKpiFilter('COMPLETED')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Позиций пересчитано"
          value={stats.totalPositionsCount}
          subtitle="Суммарный охват ТМЦ"
          icon={<LayersOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="secondary.main"
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}
