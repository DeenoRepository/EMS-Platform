'use client';

import React from 'react';
import { Grid } from '@mui/material';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { StatCard } from '@/components/ui';
import { WmsDashboardStats } from './types';

interface WmsKpiGridProps {
  stats: WmsDashboardStats;
  loading: boolean;
  onNavigate: (path: string) => void;
}

export function WmsKpiGrid({ stats, loading, onNavigate }: WmsKpiGridProps) {
  const hasDeficit = stats.lowStockCount > 0;
  const hasTransit = (stats.inTransitTransfersCount || 0) > 0;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {/* 1. Склады */}
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title="Склады предприятия"
          value={stats.warehousesCount}
          subtitle="Активных складских комплексов"
          icon={<WarehouseOutlinedIcon />}
          iconColor="primary.main"
          loading={loading}
          onClick={() => onNavigate('/wms/warehouses')}
        />
      </Grid>

      {/* 2. Номенклатура */}
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title="Справочник номенклатуры"
          value={stats.nomenclatureCount}
          subtitle={`${stats.stockItemsCount} складских партий`}
          icon={<Inventory2OutlinedIcon />}
          iconColor="info.main"
          loading={loading}
          onClick={() => onNavigate('/wms/stock')}
        />
      </Grid>

      {/* 3. Дефицит ТМЦ */}
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title="Минимальный остаток"
          value={stats.lowStockCount}
          subtitle={hasDeficit ? 'Позиций ниже нормы запаса' : 'Все остатки в норме'}
          icon={<WarningAmberOutlinedIcon />}
          iconColor={hasDeficit ? 'error.main' : 'success.main'}
          accentColor={hasDeficit ? 'error.main' : undefined}
          loading={loading}
          onClick={() => onNavigate('/wms/stock?lowStockOnly=true')}
        />
      </Grid>

      {/* 4. Потоки и перемещения */}
      <Grid item xs={12} sm={6} lg={3}>
        <StatCard
          title="Грузы в пути (Транзит)"
          value={stats.inTransitTransfersCount || 0}
          subtitle={`${stats.activeInventoriesCount} инвентаризаций в процессе`}
          icon={<SwapHorizIcon />}
          iconColor="secondary.main"
          accentColor={hasTransit ? 'secondary.main' : undefined}
          loading={loading}
          onClick={() => onNavigate('/wms/operations')}
        />
      </Grid>
    </Grid>
  );
}
