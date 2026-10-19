'use client';

import React from 'react';
import { Grid } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import { StatCard } from '@/components/ui';
import { AuditKpiStats } from './types';

interface AuditKpiBarProps {
  stats: AuditKpiStats;
  selectedAction: string;
  loading: boolean;
  onKpiFilter: (action: string) => void;
}

export function AuditKpiBar({
  stats,
  selectedAction,
  loading,
  onKpiFilter,
}: AuditKpiBarProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Всего событий"
          value={stats.total}
          subtitle="Записей в аудит-логе"
          icon={<TimelineIcon sx={{ fontSize: 20 }} />}
          accentColor="primary.main"
          active={!selectedAction}
          onClick={() => onKpiFilter('')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Создание объектов"
          value={stats.createCount}
          subtitle="Паспорта и документы"
          icon={<AddCircleOutlineIcon sx={{ fontSize: 20 }} />}
          accentColor="success.main"
          active={selectedAction === 'CREATE'}
          onClick={() => onKpiFilter('CREATE')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Корректировка данных"
          value={stats.updateCount}
          subtitle="Изменение характеристик"
          icon={<EditNoteIcon sx={{ fontSize: 20 }} />}
          accentColor="warning.main"
          active={selectedAction === 'UPDATE'}
          onClick={() => onKpiFilter('UPDATE')}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Удаление записей"
          value={stats.deleteCount}
          subtitle="Списания и удаление"
          icon={<DeleteForeverOutlinedIcon sx={{ fontSize: 20 }} />}
          accentColor="error.main"
          active={selectedAction === 'DELETE'}
          onClick={() => onKpiFilter('DELETE')}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}
