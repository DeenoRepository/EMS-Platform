'use client';

import React from 'react';
import { Grid } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { StatCard } from '@/components/ui';
import { EquipmentKpiCounts } from './types';

interface EquipmentKpiBarProps {
  show: boolean;
  statusCounts: EquipmentKpiCounts;
  activeStatus: string;
  loading: boolean;
  onKpiFilter: (status: string | null) => void;
}

export function EquipmentKpiBar({
  show,
  statusCounts,
  activeStatus,
  loading,
  onKpiFilter,
}: EquipmentKpiBarProps) {
  if (!show) return null;

  const isInitialLoading = loading && statusCounts.total === 0;

  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Всего оборудования"
          value={statusCounts.total}
          subtitle="Единиц в реестре"
          icon={<InventoryIcon sx={{ fontSize: 20 }} />}
          accentColor="primary.main"
          active={!activeStatus}
          onClick={() => onKpiFilter(null)}
          loading={isInitialLoading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="В работе"
          value={statusCounts.active}
          subtitle="В штатной эксплуатации"
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
          accentColor="success.main"
          active={activeStatus === 'ACTIVE'}
          onClick={() => onKpiFilter('ACTIVE')}
          loading={isInitialLoading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="В ремонте"
          value={statusCounts.underRepair}
          subtitle="ТО или аварийные работы"
          icon={<BuildCircleOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="warning.main"
          active={activeStatus === 'UNDER_REPAIR'}
          onClick={() => onKpiFilter('UNDER_REPAIR')}
          loading={isInitialLoading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="На складе"
          value={statusCounts.inStorage}
          subtitle="Резерв и консервация"
          icon={<InventoryIcon sx={{ fontSize: 20 }} />}
          accentColor="text.secondary"
          active={activeStatus === 'IN_STORAGE'}
          onClick={() => onKpiFilter('IN_STORAGE')}
          loading={isInitialLoading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Списано"
          value={statusCounts.decommissioned}
          subtitle="Выведено из эксплуатации"
          icon={<CancelOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="error.main"
          active={activeStatus === 'DECOMMISSIONED'}
          onClick={() => onKpiFilter('DECOMMISSIONED')}
          loading={isInitialLoading}
        />
      </Grid>
    </Grid>
  );
}
