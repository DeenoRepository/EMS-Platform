'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Stack,
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimelineIcon from '@mui/icons-material/Timeline';
import { SrmReliabilityAnalytics } from '@/components/srm';
import { PageLoading, EmptyState } from '@/components/ui';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/lib/auth-client';
import { PERMISSIONS, SrmReliabilityAnalyticsDto } from '@ems/shared';
import { fetchApi } from '@/lib/api-client';

export default function SrmAnalyticsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuth();
  const canAccessAnalytics =
    user?.roles?.includes('admin') ||
    hasPermission(PERMISSIONS.SRM_RELIABILITY_VIEW) ||
    hasPermission(PERMISSIONS.SRM_REPORTS_EXPORT);

  const [reliabilityData, setReliabilityData] = useState<SrmReliabilityAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const json = await fetchApi<SrmReliabilityAnalyticsDto>('/api/srm/analytics/reliability');
    if (json.success && json.data) {
      setReliabilityData(json.data);
    } else {
      enqueueSnackbar(json.error || 'Ошибка при загрузке аналитики надежности', { variant: 'error' });
    }
    setLoading(false);
    setRefreshing(false);
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (canAccessAnalytics) {
      fetchAnalytics();
    }
  }, [canAccessAnalytics, fetchAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (!canAccessAnalytics) {
    return (
      <Box sx={{ width: '100%', pb: 4 }}>
        <PageHeader
          title="Аналитика надежности (MTTR / MTBF)"
          subtitle="Сквозной расчет показателей ремонтопригодности, безотказности парка и соблюдения SLA"
          breadcrumbs={[
            { label: 'Главная', href: '/' },
            { label: 'Подача заявок', href: '/srm' },
            { label: 'Аналитика надежности' },
          ]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет прав на просмотр аналитики надежности оборудования (требуется право srm.reliability.view)."
          icon={<TimelineIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* 1. Header */}
      <PageHeader
        title="Аналитика надежности (MTTR / MTBF)"
        subtitle="Сквозной расчет показателей ремонтопригодности, безотказности парка и соблюдения SLA"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Подача заявок', href: '/srm' },
          { label: 'Аналитика надежности' },
        ]}
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon className={refreshing ? 'animate-spin' : ''} sx={{ fontSize: 16 }} />}
            onClick={handleRefresh}
            sx={{ fontWeight: 600, borderRadius: '8px', minHeight: 36 }}
          >
            Обновить данные
          </Button>
        }
      />

      {/* 2. Analytics Body */}
      {loading && !reliabilityData ? (
        <PageLoading text="Расчет показателей MTTR, MTBF и SLA..." />
      ) : (
        <SrmReliabilityAnalytics analytics={reliabilityData} loading={loading} />
      )}
    </Box>
  );
}
