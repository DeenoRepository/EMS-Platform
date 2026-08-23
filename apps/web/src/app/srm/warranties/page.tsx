'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Stack,
} from '@mui/material';
import PageHeader from '@/components/layout/PageHeader';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { SrmWarrantyTab, SrmIssueDetailsDrawer } from '@/components/srm';
import { PageLoading } from '@/components/ui';
import { useSnackbar } from 'notistack';

export default function SrmWarrantiesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/srm/issues?pageSize=100');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setIssues(json.data.items || []);
        }
      }
    } catch {
      enqueueSnackbar('Ошибка при загрузке гарантийных инцидентов', { variant: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchIssues();
  };

  const handleSelectIssue = (issue: any) => {
    setSelectedIssue(issue);
    setIsDrawerOpen(true);
  };

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* 1. Header */}
      <PageHeader
        title="Гарантии и рекламации"
        subtitle="Контроль гарантийных обязательств, ведение рекламационных актов и претензий к поставщикам"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Подача заявок', href: '/srm' },
          { label: 'Гарантии и рекламации' },
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

      {/* 2. Warranty Tab Content */}
      {loading && issues.length === 0 ? (
        <PageLoading text="Загрузка реестра гарантийных инцидентов..." />
      ) : (
        <SrmWarrantyTab issues={issues} onSelectIssue={handleSelectIssue} />
      )}

      {/* 3. Details Drawer */}
      {isDrawerOpen && (
        <SrmIssueDetailsDrawer
          open={isDrawerOpen}
          issue={selectedIssue}
          onClose={() => setIsDrawerOpen(false)}
          onIssueUpdated={fetchIssues}
        />
      )}
    </Box>
  );
}
