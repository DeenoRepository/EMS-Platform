'use client';

import React from 'react';
import { Grid } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { StatCard } from '@/components/ui';

interface StockKpiSummaryProps {
  totalCount: number;
  totalPhysical: number;
  lowStockCount: number;
  totalInTransit: number;
  loading: boolean;
  lowStockOnly: boolean;
  onToggleLowStock: () => void;
  onNavigate: (path: string) => void;
}

export function StockKpiSummary({
  totalCount,
  totalPhysical,
  lowStockCount,
  totalInTransit,
  loading,
  lowStockOnly,
  onToggleLowStock,
  onNavigate,
}: StockKpiSummaryProps) {
  const hasDeficit = lowStockCount > 0;

  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Номенклатура в реестре"
          value={totalCount}
          subtitle="Учетных партий ТМЦ"
          icon={<Inventory2OutlinedIcon sx={{ fontSize: 20 }} />}
          iconColor="primary.main"
          accentColor="primary.main"
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Физический остаток"
          value={totalPhysical}
          subtitle="Суммарный объем на складах"
          icon={<LayersOutlinedIcon sx={{ fontSize: 20 }} />}
          iconColor="info.main"
          accentColor="info.main"
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Дефицит ТМЦ"
          value={lowStockCount}
          subtitle={hasDeficit ? 'Требуют закупки / пополнения' : 'Все остатки в норме'}
          icon={<WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />}
          iconColor={hasDeficit ? 'error.main' : 'success.main'}
          accentColor={hasDeficit ? 'error.main' : undefined}
          active={lowStockOnly}
          onClick={onToggleLowStock}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Грузы в пути"
          value={totalInTransit}
          subtitle="Межскладской транзит"
          icon={<LocalShippingOutlinedIcon sx={{ fontSize: 20 }} />}
          iconColor="secondary.main"
          accentColor={totalInTransit > 0 ? 'secondary.main' : undefined}
          onClick={() => onNavigate('/wms/operations')}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}
