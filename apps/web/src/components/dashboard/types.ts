export interface DashboardStats {
  scope?: 'ENTERPRISE' | 'PERSONAL';
  canToggleScope?: boolean;
  user?: {
    userId: string;
    displayName: string;
    ldapLogin: string;
    roles: string[];
  };
  eps: {
    total: number;
    active: number;
    underRepair: number;
    inStorage: number;
    decommissioned: number;
    ktg?: number;
    ktgTrend?: Array<{ label: string; value: number }>;
  };
  wms: {
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
  };
  srm: {
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
  };
  mro: {
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
  };
  approvals: {
    pending: number;
    toReview?: number;
    myPending?: number;
    recentApprovals?: Array<{
      id: string;
      type: string;
      status: string;
      title: string;
      createdAt: string;
      requesterName: string;
      equipmentName?: string | null;
      inventoryNumber?: string | null;
    }>;
  };
}

export const DEFAULT_DASHBOARD_STATS: DashboardStats = {
  scope: 'ENTERPRISE',
  canToggleScope: false,
  eps: { total: 0, active: 0, underRepair: 0, inStorage: 0, decommissioned: 0 },
  wms: {
    accessible: true,
    warehousesCount: 0,
    nomenclatureCount: 0,
    lowStockCount: 0,
    activeInventoriesCount: 0,
    lowStockItems: [],
  },
  srm: { openIssues: 0, inProgressIssues: 0, resolvedIssues: 0, totalIssues: 0, recentIssues: [] },
  mro: { overdueCount: 0, plannedCount: 0, completedCount: 0, totalCount: 0, nextSchedules: [] },
  approvals: { pending: 0, toReview: 0, myPending: 0, recentApprovals: [] },
};
