'use client';

import React from 'react';
import { Grid } from '@mui/material';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { StatCard } from '@/components/ui';
import { ApprovalKpiStats } from './types';

interface ApprovalKpiBarProps {
  stats: ApprovalKpiStats;
  statusFilter: string;
  loading: boolean;
  onKpiFilter: (status: string) => void;
}

export function ApprovalKpiBar({
  stats,
  statusFilter,
  loading,
  onKpiFilter,
}: ApprovalKpiBarProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="В очереди (Ожидают)"
          value={stats.pending}
          subtitle="Заявок на согласовании"
          icon={<PendingActionsOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="warning.main"
          active={statusFilter === 'PENDING'}
          onClick={() => onKpiFilter('PENDING')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Согласовано"
          value={stats.approved}
          subtitle="Успешно утверждено"
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
          accentColor="success.main"
          active={statusFilter === 'APPROVED'}
          onClick={() => onKpiFilter('APPROVED')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Отклонено"
          value={stats.rejected}
          subtitle="С замечаниями рецензента"
          icon={<CancelOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="error.main"
          active={statusFilter === 'REJECTED'}
          onClick={() => onKpiFilter('REJECTED')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Всего заявок"
          value={stats.total}
          subtitle="В реестре согласований"
          icon={<FactCheckOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="primary.main"
          active={!statusFilter}
          onClick={() => onKpiFilter('')}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}
