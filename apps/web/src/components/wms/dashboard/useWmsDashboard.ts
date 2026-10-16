'use client';

import { useState, useCallback, useEffect } from 'react';
import { PlatformMaintenanceStatus } from '@ems/shared';
import { WmsDashboardStats, DEFAULT_WMS_STATS } from './types';

export function useWmsDashboard() {
  const [stats, setStats] = useState<WmsDashboardStats>(DEFAULT_WMS_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [maintStatus, setMaintStatus] = useState<PlatformMaintenanceStatus | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, maintRes] = await Promise.all([
        fetch('/api/wms/stats'),
        fetch('/api/system/maintenance'),
      ]);

      if (!statsRes.ok) {
        throw new Error('Не удалось получить статистику WMS');
      }

      const json = await statsRes.json();
      if (json.success && json.data) {
        setStats(json.data);
      } else {
        throw new Error(json.error || 'Ошибка формата данных WMS');
      }

      if (maintRes.ok) {
        const maintJson = await maintRes.json();
        if (maintJson.success && maintJson.data) {
          setMaintStatus(maintJson.data);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    maintStatus,
    isLoading,
    refreshing,
    error,
    hasLoadedOnce,
    handleRefresh,
  };
}
