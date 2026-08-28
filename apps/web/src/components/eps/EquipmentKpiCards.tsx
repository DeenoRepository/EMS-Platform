'use client';

import React from 'react';
import { Grid } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { StatCard } from '@/components/ui';

export interface EquipmentStatusCounts {
  total: number;
  active: number;
  underRepair: number;
  inStorage: number;
  decommissioned: number;
}

interface EquipmentKpiCardsProps {
  statusCounts: EquipmentStatusCounts;
  statusFilter: string | null;
  onFilterChange: (status: string | null) => void;
  loading: boolean;
}

export const EquipmentKpiCards: React.FC<EquipmentKpiCardsProps> = ({
  statusCounts,
  statusFilter,
  onFilterChange,
  loading,
}) => {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Всего оборудования"
          value={statusCounts.total}
          subtitle="Единиц в реестре"
          icon={<InventoryIcon sx={{ fontSize: 20 }} />}
          accentColor="primary.main"
          active={!statusFilter}
          onClick={() => onFilterChange(null)}
          loading={loading && statusCounts.total === 0}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="В работе"
          value={statusCounts.active}
          subtitle="В штатной эксплуатации"
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
          accentColor="success.main"
          active={statusFilter === 'ACTIVE'}
          onClick={() => onFilterChange('ACTIVE')}
          loading={loading && statusCounts.total === 0}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="В ремонте"
          value={statusCounts.underRepair}
          subtitle="ТО или аварийные работы"
          icon={<BuildCircleOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="warning.main"
          active={statusFilter === 'UNDER_REPAIR'}
          onClick={() => onFilterChange('UNDER_REPAIR')}
          loading={loading && statusCounts.total === 0}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="На складе"
          value={statusCounts.inStorage}
          subtitle="Резерв и консервация"
          icon={<InventoryIcon sx={{ fontSize: 20 }} />}
          accentColor="text.secondary"
          active={statusFilter === 'IN_STORAGE'}
          onClick={() => onFilterChange('IN_STORAGE')}
          loading={loading && statusCounts.total === 0}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Списано"
          value={statusCounts.decommissioned}
          subtitle="Выведено из эксплуатации"
          icon={<CancelOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="error.main"
          active={statusFilter === 'DECOMMISSIONED'}
          onClick={() => onFilterChange('DECOMMISSIONED')}
          loading={loading && statusCounts.total === 0}
        />
      </Grid>
    </Grid>
  );
};
