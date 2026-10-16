'use client';

import React from 'react';
import { Grid, Stack } from '@mui/material';
import { DashboardStats } from './types';
import { DashboardSrmWidget } from './DashboardSrmWidget';
import { DashboardMroWidget } from './DashboardMroWidget';
import { DashboardApprovalsWidget } from './DashboardApprovalsWidget';
import { DashboardWmsDeficitWidget } from './DashboardWmsDeficitWidget';
import { DashboardHealthWidget } from './DashboardHealthWidget';

interface DashboardMainGridProps {
  stats: DashboardStats;
  isPersonalScope: boolean;
  availabilityRate: number;
  refreshing: boolean;
  onNavigate: (path: string) => void;
  onOpenSrmDialog: () => void;
}

export function DashboardMainGrid({
  stats,
  isPersonalScope,
  availabilityRate,
  refreshing,
  onNavigate,
  onOpenSrmDialog,
}: DashboardMainGridProps) {
  return (
    <Grid container spacing={3}>
      {/* Column 1: Operational Incidents & Maintenance Schedules */}
      <Grid item xs={12} md={6} lg={4}>
        <Stack spacing={3}>
          <DashboardSrmWidget
            issues={stats.srm.recentIssues}
            totalIssues={stats.srm.totalIssues}
            isPersonalScope={isPersonalScope}
            onNavigate={onNavigate}
            onOpenCreateDialog={onOpenSrmDialog}
          />
          <DashboardMroWidget
            schedules={stats.mro.nextSchedules}
            totalCount={stats.mro.totalCount}
            isPersonalScope={isPersonalScope}
            onNavigate={onNavigate}
          />
        </Stack>
      </Grid>

      {/* Column 2: Approvals Inbox & Warehouse Deficit */}
      <Grid item xs={12} md={6} lg={4}>
        <Stack spacing={3}>
          <DashboardApprovalsWidget
            approvals={stats.approvals.recentApprovals}
            pendingCount={stats.approvals.pending}
            toReviewCount={stats.approvals.toReview}
            onNavigate={onNavigate}
          />
          {stats.wms.accessible !== false && (
            <DashboardWmsDeficitWidget
              items={stats.wms.lowStockItems}
              lowStockCount={stats.wms.lowStockCount}
              isPersonalScope={isPersonalScope}
              onNavigate={onNavigate}
            />
          )}
        </Stack>
      </Grid>

      {/* Column 3: Readiness Score & Reliability Trend */}
      <Grid item xs={12} md={12} lg={4}>
        <DashboardHealthWidget
          stats={stats}
          isPersonalScope={isPersonalScope}
          availabilityRate={availabilityRate}
          loading={refreshing}
          onNavigate={onNavigate}
        />
      </Grid>
    </Grid>
  );
}
