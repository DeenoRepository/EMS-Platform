'use client';

import { Grid } from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SpeedIcon from '@mui/icons-material/Speed';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import LayersIcon from '@mui/icons-material/Layers';
import { StatCard } from '@/components/ui';

interface ReportStatsCardsProps {
  rowsCount: number;
  selectedColumnsCount: number;
  availableColumnsCount: number;
  averageWear: number | null;
  templatesCount: number;
  presetsCount: number;
  activeFilterCount: number;
  loading: boolean;
  onOpenColumnBuilder: () => void;
}

export function ReportStatsCards({
  rowsCount,
  selectedColumnsCount,
  availableColumnsCount,
  averageWear,
  templatesCount,
  presetsCount,
  activeFilterCount,
  loading,
  onOpenColumnBuilder,
}: ReportStatsCardsProps) {
  const wearColor = averageWear !== null && averageWear > 70 ? 'error.main' : averageWear !== null && averageWear > 30 ? 'warning.main' : 'success.main';
  const wearBgColor = averageWear !== null && averageWear > 70 ? 'error.light' : averageWear !== null && averageWear > 30 ? 'warning.light' : 'success.light';

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Строк в ведомости" value={rowsCount} subtitle={activeFilterCount > 0 ? `Фильтров активно: ${activeFilterCount}` : 'Полная выборка'} icon={<PrecisionManufacturingIcon sx={{ fontSize: 22 }} />} accentColor="primary.main" iconColor="primary.main" iconBgColor="rgba(2, 132, 199, 0.08)" loading={loading} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Выбрано колонок" value={`${selectedColumnsCount} из ${availableColumnsCount || 38}`} subtitle="Полей в формируемой таблице" icon={<LayersIcon sx={{ fontSize: 22 }} />} accentColor="secondary.main" iconColor="secondary.main" iconBgColor="rgba(124, 58, 237, 0.08)" onClick={onOpenColumnBuilder} loading={loading} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Средний износ" value={averageWear !== null ? `${averageWear}%` : '—'} subtitle="По отфильтрованному списку" icon={<SpeedIcon sx={{ fontSize: 22 }} />} accentColor={wearColor} iconColor={wearColor} iconBgColor={wearBgColor} loading={loading} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Шаблоны отчетов" value={templatesCount + presetsCount} subtitle={`${presetsCount} системных, ${templatesCount} пользовательских`} icon={<AssignmentTurnedInIcon sx={{ fontSize: 22 }} />} accentColor="success.main" iconColor="success.main" iconBgColor="rgba(5, 150, 105, 0.08)" loading={loading} />
      </Grid>
    </Grid>
  );
}
