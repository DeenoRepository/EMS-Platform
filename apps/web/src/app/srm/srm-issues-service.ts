import type { PlatformMaintenanceStatus } from '@ems/shared';

export interface SrmStats {
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  mttrHours: number;
  mtbfDays: number;
  slaComplianceRate: number;
}

export interface SrmStatsAndMaintenanceResult {
  stats: SrmStats | null;
  maintStatus: PlatformMaintenanceStatus | null;
}

/**
 * Fetches SRM KPI stats and platform maintenance status in parallel.
 * Extracted from `fetchStats` — the two requests are independent (mirrors
 * original behavior): a failed maintenance-status fetch does not prevent
 * stats from loading and vice versa.
 */
export async function fetchSrmStatsAndMaintenance(): Promise<SrmStatsAndMaintenanceResult> {
  const result: SrmStatsAndMaintenanceResult = { stats: null, maintStatus: null };
  const [statsRes, maintRes] = await Promise.all([
    fetch('/api/srm/stats'),
    fetch('/api/system/maintenance'),
  ]);

  if (statsRes.ok) {
    const json = await statsRes.json();
    if (json.success && json.data) result.stats = json.data;
  }

  if (maintRes.ok) {
    const maintJson = await maintRes.json();
    if (maintJson.success && maintJson.data) result.maintStatus = maintJson.data;
  }

  return result;
}

export interface SrmIssuesListResult<T> {
  items: T[];
  total: number;
}

/**
 * Fetches the paginated/filtered SRM issues list. Extracted from
 * `fetchIssues` to separate query-string construction and response parsing
 * from component state management.
 */
export async function fetchSrmIssuesList<T>(params: {
  page: number;
  pageSize: number;
  search: string;
  statusFilter: string;
  priorityFilter: string;
}): Promise<SrmIssuesListResult<T>> {
  const query = new URLSearchParams();
  query.append('page', String(params.page));
  query.append('pageSize', String(params.pageSize));
  if (params.search) query.append('search', params.search);
  if (params.statusFilter) query.append('status', params.statusFilter);
  if (params.priorityFilter) query.append('priority', params.priorityFilter);

  const res = await fetch(`/api/srm/issues?${query.toString()}`);
  if (res.ok) {
    const json = await res.json();
    if (json.success && json.data) {
      return { items: json.data.items || [], total: json.data.total || 0 };
    }
  }
  return { items: [], total: 0 };
}

export interface JiraSyncResult {
  success: boolean;
  synced: number;
  error?: string;
}

/**
 * Triggers Jira synchronization. Extracted from `handleSyncJira` to isolate
 * the response-parsing branch from the loading-state side effect.
 */
export async function syncJiraIssues(): Promise<JiraSyncResult> {
  const res = await fetch('/api/srm/sync', { method: 'POST' });
  if (res.ok) {
    const json = await res.json();
    if (json.success) {
      return { success: true, synced: json.data?.synced || 0 };
    }
    return { success: false, synced: 0, error: json.error };
  }
  return { success: false, synced: 0 };
}
