'use client';

import { useState, useCallback, useEffect } from 'react';
import { DashboardStats, DEFAULT_DASHBOARD_STATS } from './types';

export function useDashboardData() {
  const [selectedScope, setSelectedScope] = useState<'enterprise' | 'personal'>('enterprise');
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_DASHBOARD_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchDashboardData = useCallback(async (scopeOverride?: string) => {
    try {
      setError(null);
      const scopeToQuery = scopeOverride || selectedScope;
      const res = await fetch(`/api/dashboard/stats?scope=${scopeToQuery}`);
      if (!res.ok) {
        throw new Error('Не удалось получить показатели системы');
      }
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
        if (json.data.scope) {
          setSelectedScope(json.data.scope.toLowerCase() as 'enterprise' | 'personal');
        }
      } else {
        throw new Error(json.error || 'Ошибка в формате данных дашборда');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, [selectedScope]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleScopeChange = useCallback(
    (newScope: 'enterprise' | 'personal') => {
      setSelectedScope(newScope);
      setRefreshing(true);
      fetchDashboardData(newScope);
    },
    [fetchDashboardData]
  );

  return {
    stats,
    selectedScope,
    loading,
    refreshing,
    error,
    hasLoadedOnce,
    handleRefresh,
    handleScopeChange,
  };
}
