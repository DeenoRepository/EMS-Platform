'use client';

import React from 'react';
import { Grid } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { StatCard } from '@/components/ui';

interface OperationsKpiSummaryProps {
  totalCount: number;
  receiptCount: number;
  issueCount: number;
  transitCount: number;
  loading: boolean;
  activeFilterType: string;
  onFilterTypeChange: (type: string) => void;
  onTabChange: (tab: 'operations' | 'transfers') => void;
}

export function OperationsKpiSummary({
  totalCount,
  receiptCount,
  issueCount,
  transitCount,
  loading,
  activeFilterType,
  onFilterTypeChange,
  onTabChange,
}: OperationsKpiSummaryProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Всего операций"
          value={totalCount}
          subtitle="Складских проводок"
          icon={<SwapHorizIcon sx={{ fontSize: 20 }} />}
          iconColor="primary.main"
          accentColor="primary.main"
          active={!activeFilterType}
          onClick={() => {
            onTabChange('operations');
            onFilterTypeChange('');
          }}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Приход ТМЦ"
          value={receiptCount}
          subtitle="Поступлений на склады"
          icon={<MoveToInboxIcon sx={{ fontSize: 20 }} />}
          iconColor="success.main"
          accentColor="success.main"
          active={activeFilterType === 'RECEIPT'}
          onClick={() => {
            onTabChange('operations');
            onFilterTypeChange('RECEIPT');
          }}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Выдача и списание"
          value={issueCount}
          subtitle="Расходных операций"
          icon={<OutboxIcon sx={{ fontSize: 20 }} />}
          iconColor="warning.main"
          accentColor="warning.main"
          active={activeFilterType === 'ISSUE_EMPLOYEE' || activeFilterType === 'ISSUE_WRITE_OFF'}
          onClick={() => {
            onTabChange('operations');
            onFilterTypeChange('ISSUE_EMPLOYEE');
          }}
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Грузы в пути"
          value={transitCount}
          subtitle="Межскладской транзит"
          icon={<LocalShippingOutlinedIcon sx={{ fontSize: 20 }} />}
          iconColor="secondary.main"
          accentColor={transitCount > 0 ? 'secondary.main' : undefined}
          onClick={() => onTabChange('transfers')}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}
