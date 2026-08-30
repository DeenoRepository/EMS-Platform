export interface SidebarDataUpdate {
  repairCount?: number | null;
  moduleStatus?: Record<string, boolean>;
  pendingApprovalsCount?: number | null;
  rejectedApprovalsCount?: number | null;
  wmsLowStockCount?: number | null;
  wmsActiveInventoriesCount?: number | null;
  wmsPendingTransfersCount?: number | null;
  srmOpenCount?: number;
  srmInProgressCount?: number;
  mroOverdueCount?: number | null;
  mroPlannedCount?: number | null;
}

type FetchLike = typeof fetch;
type SettledResponse = PromiseSettledResult<Response>;

const SIDEBAR_ENDPOINTS = [
  '/api/eps/equipment?pageSize=1',
  '/api/modules/status',
  '/api/eps/approvals?pageSize=1',
  '/api/wms/stats',
  '/api/srm/stats',
  '/api/mro/schedules',
  '/api/wms/transfers?pageSize=1',
] as const;

interface MroSchedule {
  status: string;
  scheduledDate: string;
}

function isFulfilledOk(result: SettledResponse): result is PromiseFulfilledResult<Response> {
  return result.status === 'fulfilled' && result.value.ok;
}

async function readJson(result: SettledResponse): Promise<unknown> {
  if (!isFulfilledOk(result)) return null;
  return result.value.json();
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' ? value || null : null;
}

function getMroCounts(data: unknown): Pick<SidebarDataUpdate, 'mroOverdueCount' | 'mroPlannedCount'> {
  if (!Array.isArray(data)) return {};

  const now = new Date();
  const schedules = data.filter((schedule): schedule is MroSchedule => {
    if (!schedule || typeof schedule !== 'object') return false;
    const candidate = schedule as Partial<MroSchedule>;
    return typeof candidate.status === 'string' && typeof candidate.scheduledDate === 'string';
  });
  const overdue = schedules.filter(
    (schedule) => schedule.status === 'MISSED' || (schedule.status === 'PLANNED' && new Date(schedule.scheduledDate) < now)
  ).length;
  const planned = schedules.filter(
    (schedule) => schedule.status === 'PLANNED' && new Date(schedule.scheduledDate) >= now
  ).length;

  return {
    mroOverdueCount: overdue || null,
    mroPlannedCount: planned || null,
  };
}

function mapEquipment(data: unknown): Pick<SidebarDataUpdate, 'repairCount'> {
  if (!data || typeof data !== 'object') return {};
  const responseData = (data as { data?: { statusCounts?: { underRepair?: unknown } } }).data;
  const statusCounts = responseData?.statusCounts;
  return statusCounts ? { repairCount: getNumber(statusCounts.underRepair) } : {};
}

function mapModules(data: unknown): Pick<SidebarDataUpdate, 'moduleStatus'> {
  if (!data || typeof data !== 'object') return {};
  const moduleData = (data as { data?: unknown }).data;
  return moduleData && typeof moduleData === 'object' ? { moduleStatus: moduleData as Record<string, boolean> } : {};
}

function mapApprovals(data: unknown): Pick<SidebarDataUpdate, 'pendingApprovalsCount' | 'rejectedApprovalsCount'> {
  if (!data || typeof data !== 'object') return {};
  const stats = (data as { data?: { stats?: { toReview?: unknown; pending?: unknown; myRejected?: unknown } } }).data?.stats;
  if (!stats || typeof stats !== 'object') return {};
  const pending = stats.toReview !== undefined ? stats.toReview : stats.pending;
  return {
    pendingApprovalsCount: getNumber(pending),
    rejectedApprovalsCount: stats.myRejected !== undefined ? getNumber(stats.myRejected) : null,
  };
}

function mapWms(data: unknown): Pick<SidebarDataUpdate, 'wmsLowStockCount' | 'wmsActiveInventoriesCount'> {
  if (!data || typeof data !== 'object') return {};
  const wmsData = (data as { data?: { lowStockCount?: unknown; activeInventoriesCount?: unknown } }).data;
  return wmsData
    ? {
        wmsLowStockCount: getNumber(wmsData.lowStockCount),
        wmsActiveInventoriesCount: getNumber(wmsData.activeInventoriesCount),
      }
    : {};
}

function mapTransfers(data: unknown): Pick<SidebarDataUpdate, 'wmsPendingTransfersCount'> {
  if (!data || typeof data !== 'object') return {};
  const counts = (data as { data?: { counts?: { inbound?: unknown; requests?: unknown } } }).data?.counts;
  if (!counts) return {};
  const pending = (typeof counts.inbound === 'number' ? counts.inbound : 0) + (typeof counts.requests === 'number' ? counts.requests : 0);
  return { wmsPendingTransfersCount: pending || null };
}

function mapSrm(data: unknown): Pick<SidebarDataUpdate, 'srmOpenCount' | 'srmInProgressCount'> {
  if (!data || typeof data !== 'object') return {};
  const srmData = (data as { data?: { openIssues?: unknown; inProgressIssues?: unknown } }).data;
  return srmData
    ? {
        srmOpenCount: typeof srmData.openIssues === 'number' ? srmData.openIssues : 0,
        srmInProgressCount: typeof srmData.inProgressIssues === 'number' ? srmData.inProgressIssues : 0,
      }
    : {};
}

export function mapSidebarResponses(responses: readonly SettledResponse[], payloads: readonly unknown[]): SidebarDataUpdate {
  const [equipment, modules, approvals, wms, srm, mro, transfers] = payloads;
  return {
    ...mapEquipment(isFulfilledOk(responses[0]) ? equipment : null),
    ...mapModules(isFulfilledOk(responses[1]) ? modules : null),
    ...mapApprovals(isFulfilledOk(responses[2]) ? approvals : null),
    ...mapWms(isFulfilledOk(responses[3]) ? wms : null),
    ...mapSrm(isFulfilledOk(responses[4]) ? srm : null),
    ...getMroCounts(isFulfilledOk(responses[5]) ? (mro as { data?: unknown })?.data : null),
    ...mapTransfers(isFulfilledOk(responses[6]) ? transfers : null),
  };
}

export async function loadSidebarData(fetcher: FetchLike = fetch): Promise<SidebarDataUpdate> {
  const responses = await Promise.allSettled(SIDEBAR_ENDPOINTS.map((endpoint) => fetcher(endpoint)));
  const payloads = await Promise.all(responses.map(readJson));
  return mapSidebarResponses(responses, payloads);
}
