'use client';

import React from 'react';
import { Grid } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ShieldIcon from '@mui/icons-material/Shield';
import SpeedIcon from '@mui/icons-material/Speed';
import { EQUIPMENT_STATUS_MAP, formatDate } from '@ems/shared';
import { StatCard } from '@/components/ui';
import type { EquipmentDetails } from '@/app/eps/[id]/page';

interface EquipmentPassportKpiPanelProps {
  equipment: EquipmentDetails;
}

export function EquipmentPassportKpiPanel({ equipment }: EquipmentPassportKpiPanelProps) {
  const statusInfo = EQUIPMENT_STATUS_MAP[equipment.status] || { label: equipment.status };
  const custom = (equipment.customFields || {}) as Record<string, unknown>;
  const actualWear = custom.actual_wear_percentage !== undefined && custom.actual_wear_percentage !== null && custom.actual_wear_percentage !== '' ? Number(custom.actual_wear_percentage) : null;
  const criticality = typeof custom.criticality === 'string' ? custom.criticality : 'B';
  const maintPeriodicity = typeof custom.maintenance_periodicity === 'string' ? custom.maintenance_periodicity : '';
  const maintScheduleYear = typeof custom.maintenance_schedule_year === 'string' ? custom.maintenance_schedule_year : '';

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Статус актива"
          value={statusInfo.label}
          subtitle={equipment.location ? `Локация: ${equipment.location}` : `Ввод: ${formatDate(equipment.commissionDate)}`}
          icon={<PrecisionManufacturingIcon sx={{ fontSize: 24 }} />}
          accentColor="primary.main"
          iconColor="primary.main"
          iconBgColor="info.light"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Физический износ"
          value={actualWear !== null ? `${actualWear}%` : '—'}
          subtitle={
            actualWear !== null
              ? actualWear < 30
                ? 'Состояние в норме'
                : actualWear < 70
                ? 'Умеренный износ'
                : 'Критический износ'
              : 'Амортизация не задана'
          }
          icon={<SpeedIcon sx={{ fontSize: 24 }} />}
          accentColor={actualWear !== null && actualWear > 70 ? 'error.main' : actualWear !== null && actualWear > 30 ? 'warning.main' : 'success.main'}
          iconColor={actualWear !== null && actualWear > 70 ? 'error.main' : actualWear !== null && actualWear > 30 ? 'warning.main' : 'success.main'}
          iconBgColor={actualWear !== null && actualWear > 70 ? 'error.light' : actualWear !== null && actualWear > 30 ? 'warning.light' : 'success.light'}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Регламент ТОиР"
          value={maintPeriodicity || (equipment.maintenancePlans.length > 0 ? `${equipment.maintenancePlans.length} плана ТО` : 'По регламенту')}
          subtitle={maintScheduleYear ? `График: ${maintScheduleYear}` : 'График ППР 2026'}
          icon={<ShieldIcon sx={{ fontSize: 24 }} />}
          accentColor="success.main"
          iconColor="success.main"
          iconBgColor="success.light"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Критичность актива"
          value={`Класс ${criticality}`}
          subtitle={equipment.spareParts.length > 0 ? `Запас ТМЦ: ${equipment.spareParts.length} поз.` : 'Категория надежности'}
          icon={<CategoryIcon sx={{ fontSize: 24 }} />}
          accentColor={criticality === 'A' ? 'error.main' : criticality === 'B' ? 'warning.main' : 'primary.light'}
          iconColor={criticality === 'A' ? 'error.main' : criticality === 'B' ? 'warning.main' : 'primary.light'}
          iconBgColor={criticality === 'A' ? 'error.light' : criticality === 'B' ? 'warning.light' : 'info.light'}
        />
      </Grid>
    </Grid>
  );
}
