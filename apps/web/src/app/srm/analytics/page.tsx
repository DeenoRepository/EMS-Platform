'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Stack,
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import RefreshIcon from '@mui/icons-material/Refresh';
import { SrmReliabilityAnalytics } from '@/components/srm';
import { PageLoading } from '@/components/ui';
import { useSnackbar } from 'notistack';

export default function SrmAnalyticsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [reliabilityData, setReliabilityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/srm/analytics/reliability');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setReliabilityData(json.data);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке аналитики надежности', { variant: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

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
