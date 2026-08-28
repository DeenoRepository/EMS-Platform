'use client';

import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  Button,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import SpeedIcon from '@mui/icons-material/Speed';
import AddIcon from '@mui/icons-material/Add';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import { StatCard } from '@/components/ui';
import { PERMISSIONS } from '@ems/shared';

export interface DashboardStatsEps {
  total: number;
  active: number;
  underRepair: number;
  inStorage: number;
  decommissioned: number;
}

export interface DashboardStatsWms {
  accessible?: boolean;
  warehousesCount: number;
  nomenclatureCount: number;
  lowStockCount: number;
  activeInventoriesCount: number;
  lowStockItems: Array<{
    id: string;
    name: string;
    warehouseCode: string;
    quantity: number;
    minStock: number;
    unit: string;
  }>;
}

export interface DashboardStatsSrm {
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  totalIssues: number;
  recentIssues: Array<{
    id: string;
    key: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    equipment?: { name: string; inventoryNumber: string | null } | null;
  }>;
}

export interface DashboardStatsMro {
  overdueCount: number;
  plannedCount: number;
  completedCount: number;
  totalCount: number;
  nextSchedules: Array<{
    id: string;
    equipmentName: string;
    title: string;
    scheduledDate: string;
    periodicity: string;
    status: string;
  }>;
}

export interface DashboardStatsData {
  scope?: 'ENTERPRISE' | 'PERSONAL';
  canToggleScope?: boolean;
  eps: DashboardStatsEps;
  wms: DashboardStatsWms;
  srm: DashboardStatsSrm;
  mro: DashboardStatsMro;
}

interface DashboardKpiSectionProps {
  stats: DashboardStatsData;
  isPersonalScope: boolean;
  availabilityRate: number;
  hasDeficit: boolean;
  hasOpenIncidents: boolean;
  hasOverdueMro: boolean;
  hasPermission: (perm: string) => boolean;
  onOpenSrmDialog: () => void;
  onOpenWmsWizard: () => void;
}

export function DashboardKpiSection({
  stats,
  isPersonalScope,
  availabilityRate,
  hasDeficit,
  hasOpenIncidents,
  hasOverdueMro,
  hasPermission,
  onOpenSrmDialog,
  onOpenWmsWizard,
}: DashboardKpiSectionProps) {
  const router = useRouter();

  return (
    <>
      {/* 4 Cross-Platform Modules StatCards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* EPS */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={isPersonalScope ? 'Мое оборудование (EPS)' : 'Парк оборудования (EPS)'}
            value={stats.eps.total || 0}
            subtitle={`${stats.eps.active || 0} в работе • ${stats.eps.underRepair || 0} в ремонте`}
            icon={<BadgeOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="primary.main"
            iconBgColor="rgba(2, 132, 199, 0.08)"
            onClick={() => router.push('/eps')}
            trend={{
              value: `${availabilityRate}% готовность`,
              direction: availabilityRate >= 85 ? 'up' : 'down',
              label: 'КТГ зоны',
            }}
          />
        </Grid>

        {/* WMS */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={isPersonalScope ? 'Ответственные склады (WMS)' : 'Складской учёт (WMS)'}
            value={stats.wms.accessible !== false ? stats.wms.nomenclatureCount || 0 : '—'}
            subtitle={
              stats.wms.accessible !== false
                ? `${stats.wms.warehousesCount || 0} складов • ${stats.wms.lowStockCount || 0} дефицит ТМЦ`
                : 'Нет закрепленных складов'
            }
            icon={<WarehouseOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="secondary.main"
            iconBgColor="rgba(15, 118, 110, 0.08)"
            accentColor={hasDeficit ? 'error.main' : undefined}
            onClick={() => router.push('/wms/stock')}
          />
        </Grid>

        {/* SRM */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={isPersonalScope ? 'Мои сервисные заявки (SRM)' : 'Сервисные заявки (SRM)'}
            value={stats.srm.totalIssues || 0}
            subtitle={`${stats.srm.openIssues || 0} открыто • ${stats.srm.inProgressIssues || 0} в работе`}
            icon={<BugReportOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="warning.main"
            iconBgColor="rgba(217, 119, 6, 0.08)"
            accentColor={hasOpenIncidents ? 'warning.main' : undefined}
            onClick={() => router.push('/srm')}
          />
        </Grid>

        {/* MRO */}
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={isPersonalScope ? 'Мой график ТОиР (MRO)' : 'График ППР и ТО (MRO)'}
            value={stats.mro.plannedCount || 0}
            subtitle={`${stats.mro.overdueCount || 0} просрочено • ${stats.mro.completedCount || 0} выполнено`}
            icon={<BuildOutlinedIcon sx={{ fontSize: 24 }} />}
            iconColor="secondary.main"
            iconBgColor="rgba(124, 58, 237, 0.08)"
            accentColor={hasOverdueMro ? 'error.main' : undefined}
            onClick={() => router.push('/mro')}
          />
        </Grid>
      </Grid>

      {/* Quick Actions Row */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '12px',
          bgcolor: 'background.paper',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              bgcolor: 'rgba(2, 132, 199, 0.08)',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SpeedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              Быстрые действия
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Оперативное создание документов, заявок и перемещений в вашей зоне
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: { xs: 1, sm: 0 } }}>
          {hasPermission(PERMISSIONS.EPS_EQUIPMENT_CREATE) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => router.push('/eps/new')}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
            >
              Добавить оборудование
            </Button>
          )}

          {hasPermission(PERMISSIONS.SRM_REQUESTS_CREATE) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<BugReportOutlinedIcon />}
              onClick={onOpenSrmDialog}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none', color: 'warning.main', borderColor: 'warning.light' }}
            >
              Подать заявку
            </Button>
          )}

          {hasPermission(PERMISSIONS.WMS_OPERATIONS_CREATE) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MoveToInboxIcon />}
              onClick={onOpenWmsWizard}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none', color: 'secondary.main', borderColor: 'secondary.light' }}
            >
              Складская операция
            </Button>
          )}

          {hasPermission(PERMISSIONS.MRO_EXECUTION_COMPLETE) && (
            <Button
              variant="contained"
              size="small"
              startIcon={<BuildOutlinedIcon />}
              onClick={() => router.push('/mro')}
              sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none', bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
            >
              Провести ТО
            </Button>
          )}
        </Stack>
      </Paper>
    </>
  );
}

export default DashboardKpiSection;
