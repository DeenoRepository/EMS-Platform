'use client';

import React from 'react';
import { Grid } from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import { StatCard } from '@/components/ui';
import { DashboardStats } from './types';

interface DashboardKpiGridProps {
  stats: DashboardStats;
  isPersonalScope: boolean;
  availabilityRate: number;
  loading?: boolean;
  onNavigate: (path: string) => void;
}

export function DashboardKpiGrid({
  stats,
  isPersonalScope,
  availabilityRate,
  loading = false,
  onNavigate,
}: DashboardKpiGridProps) {
  const hasDeficit = stats.wms.accessible !== false && (stats.wms.lowStockCount || 0) > 0;
  const hasOpenIncidents = (stats.srm.openIssues || 0) > 0;
  const hasOverdueMro = (stats.mro.overdueCount || 0) > 0;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {/* 1. EPS: Оборудование */}
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title={isPersonalScope ? 'Мое оборудование (EPS)' : 'Парк оборудования (EPS)'}
          value={stats.eps.total || 0}
          subtitle={`${stats.eps.active || 0} в работе • ${stats.eps.underRepair || 0} в ремонте`}
          icon={<BadgeOutlinedIcon />}
          iconColor="primary.main"
          loading={loading}
          onClick={() => onNavigate('/eps')}
          trend={{
            value: `${availabilityRate}%`,
            direction: availabilityRate >= 85 ? 'up' : 'down',
            label: 'КТГ зоны',
          }}
        />
      </Grid>

      {/* 2. WMS: Склады и ТМЦ */}
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title={isPersonalScope ? 'Ответственные склады (WMS)' : 'Складской учёт (WMS)'}
          value={stats.wms.accessible !== false ? stats.wms.nomenclatureCount || 0 : '—'}
          subtitle={
            stats.wms.accessible !== false
              ? `${stats.wms.warehousesCount || 0} складов • ${stats.wms.lowStockCount || 0} дефицит ТМЦ`
              : 'Нет закрепленных складов'
          }
          icon={<WarehouseOutlinedIcon />}
          iconColor="info.main"
          accentColor={hasDeficit ? 'error.main' : undefined}
          loading={loading}
          onClick={() => onNavigate('/wms/stock')}
        />
      </Grid>

      {/* 3. SRM: Заявки и инциденты */}
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title={isPersonalScope ? 'Мои сервисные заявки (SRM)' : 'Сервисные заявки (SRM)'}
          value={stats.srm.totalIssues || 0}
          subtitle={`${stats.srm.openIssues || 0} открыто • ${stats.srm.inProgressIssues || 0} в работе`}
          icon={<BugReportOutlinedIcon />}
          iconColor="warning.main"
          accentColor={hasOpenIncidents ? 'warning.main' : undefined}
          loading={loading}
          onClick={() => onNavigate('/srm')}
        />
      </Grid>

      {/* 4. MRO: График ТОиР */}
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title={isPersonalScope ? 'Мой график ТОиР (MRO)' : 'График ППР и ТО (MRO)'}
          value={stats.mro.plannedCount || 0}
          subtitle={`${stats.mro.overdueCount || 0} просрочено • ${stats.mro.completedCount || 0} выполнено`}
          icon={<BuildOutlinedIcon />}
          iconColor="secondary.main"
          accentColor={hasOverdueMro ? 'error.main' : undefined}
          loading={loading}
          onClick={() => onNavigate('/mro')}
        />
      </Grid>
    </Grid>
  );
}
