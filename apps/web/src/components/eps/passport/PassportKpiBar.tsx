'use client';

import React from 'react';
import { Grid } from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SpeedIcon from '@mui/icons-material/Speed';
import ShieldIcon from '@mui/icons-material/Shield';
import CategoryIcon from '@mui/icons-material/Category';
import { StatCard } from '@/components/ui';
import { formatDate } from '@ems/shared';
import { EquipmentDetails, CustomSectionDef } from './types';

const WEAR_CRITICAL = 70;
const WEAR_WARNING = 30;

interface PassportKpiBarProps {
  equipment: EquipmentDetails;
  sections: CustomSectionDef[];
  statusInfo: { label: string; color: string };
  actualWear: number | null;
  criticality: string;
  maintPeriodicity: string;
  maintScheduleYear: string;
}

export function PassportKpiBar({
  equipment,
  sections,
  statusInfo,
  actualWear,
  criticality,
  maintPeriodicity,
  maintScheduleYear,
}: PassportKpiBarProps) {
  if (sections.length === 0) return null;

  const hasWearField = sections.some((s) =>
    s.fields.some((f) => f.key === 'actual_wear_percentage' || f.key === 'actualWear')
  );
  const hasMaintField = sections.some((s) =>
    s.fields.some((f) => f.key === 'maintenance_periodicity')
  );
  const hasCritField = sections.some((s) =>
    s.fields.some((f) => f.key === 'criticality')
  );

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Статус актива"
          value={statusInfo.label}
          subtitle={
            equipment.location
              ? `Локация: ${equipment.location}`
              : `Ввод: ${formatDate(equipment.commissionDate)}`
          }
          icon={<PrecisionManufacturingIcon sx={{ fontSize: 24 }} />}
          accentColor="primary.main"
          iconColor="primary.main"
          iconBgColor="action.hover"
        />
      </Grid>

      {hasWearField && (
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Физический износ"
            value={actualWear !== null ? `${actualWear}%` : '—'}
            subtitle={
              actualWear !== null
                ? actualWear < WEAR_WARNING
                  ? 'Состояние в норме'
                  : actualWear < WEAR_CRITICAL
                  ? 'Умеренный износ'
                  : 'Критический износ'
                : 'Амортизация не задана'
            }
            icon={<SpeedIcon sx={{ fontSize: 24 }} />}
            accentColor={
              actualWear !== null && actualWear > WEAR_CRITICAL
                ? 'error.main'
                : actualWear !== null && actualWear > WEAR_WARNING
                ? 'warning.main'
                : 'success.main'
            }
            iconColor={
              actualWear !== null && actualWear > WEAR_CRITICAL
                ? 'error.main'
                : actualWear !== null && actualWear > WEAR_WARNING
                ? 'warning.main'
                : 'success.main'
            }
            iconBgColor={
              actualWear !== null && actualWear > WEAR_CRITICAL
                ? 'error.light'
                : actualWear !== null && actualWear > WEAR_WARNING
                ? 'warning.light'
                : 'success.light'
            }
          />
        </Grid>
      )}

      {hasMaintField && (
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Регламент ТОиР"
            value={
              maintPeriodicity ||
              (equipment.maintenancePlans.length > 0
                ? `${equipment.maintenancePlans.length} плана ТО`
                : 'По регламенту')
            }
            subtitle={maintScheduleYear ? `График: ${maintScheduleYear}` : 'График ППР 2026'}
            icon={<ShieldIcon sx={{ fontSize: 24 }} />}
            accentColor="success.main"
            iconColor="success.main"
            iconBgColor="action.hover"
          />
        </Grid>
      )}

      {hasCritField && (
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Критичность актива"
            value={`Класс ${criticality}`}
            subtitle={
              equipment.spareParts.length > 0
                ? `Запас ТМЦ: ${equipment.spareParts.length} поз.`
                : 'Категория надежности'
            }
            icon={<CategoryIcon sx={{ fontSize: 24 }} />}
            accentColor={
              criticality === 'A' ? 'error.main' : criticality === 'B' ? 'warning.main' : 'primary.main'
            }
            iconColor={
              criticality === 'A' ? 'error.main' : criticality === 'B' ? 'warning.main' : 'primary.main'
            }
            iconBgColor={
              criticality === 'A' ? 'error.light' : criticality === 'B' ? 'warning.light' : 'action.hover'
            }
          />
        </Grid>
      )}
    </Grid>
  );
}
