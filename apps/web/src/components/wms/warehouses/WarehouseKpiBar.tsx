'use client';

import React from 'react';
import { Grid } from '@mui/material';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import GridViewIcon from '@mui/icons-material/GridView';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import { StatCard } from '@/components/ui';
import { WarehouseKpiStats } from './types';

interface WarehouseKpiBarProps {
  stats: WarehouseKpiStats;
  loading: boolean;
}

export function WarehouseKpiBar({ stats, loading }: WarehouseKpiBarProps) {
  return (
    <Grid container spacing={1.75} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Всего складов"
          value={stats.total}
          subtitle="Зарегистрировано комплексов"
          icon={<WarehouseOutlinedIcon sx={{ fontSize: 20 }} />}
          iconBgColor="action.hover"
          iconColor="primary.main"
          accentColor="primary.main"
          loading={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Активные склады"
          value={stats.active}
          subtitle="Готовы к операциям"
          icon={<WarehouseOutlinedIcon sx={{ fontSize: 20 }} />}
          iconBgColor="action.hover"
          iconColor="success.main"
          accentColor="success.main"
          loading={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Учетных остатков"
          value={stats.totalStockItems}
          subtitle="Позиций на складах"
          icon={<GridViewIcon sx={{ fontSize: 20 }} />}
          iconBgColor="action.hover"
          iconColor="warning.main"
          accentColor="warning.main"
          loading={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Проведено операций"
          value={stats.totalOperations}
          subtitle="Приход, расход, перемещения"
          icon={<MeetingRoomOutlinedIcon sx={{ fontSize: 20 }} />}
          iconBgColor="action.hover"
          iconColor="secondary.main"
          accentColor="secondary.main"
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}
