import { PurchaseRequestStatus } from '@ems/database';

export type PurchaseRequestListQuery = {
  page: number;
  pageSize: number;
  status: string;
  scope: string;
  warehouseId: string | null;
  search: string;
  equipmentId?: string | null;
  maintenanceScheduleId?: string | null;
};

export type PurchaseRequestStatsInput = {
  status: string;
  requesterId: string;
}[];

export interface PurchaseRequestStats {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  cancelled: number;
  toReview: number;
  myDraft: number;
  myPending: number;
}

export function parsePurchaseRequestListQuery(searchParams: URLSearchParams): PurchaseRequestListQuery {
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)),
    pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10))),
    status: searchParams.get('status')?.trim() || '',
    scope: searchParams.get('scope')?.trim() || 'all',
    warehouseId: searchParams.get('warehouseId')?.trim() || null,
    search: searchParams.get('search')?.trim() || '',
    equipmentId: searchParams.get('equipmentId')?.trim() || null,
    maintenanceScheduleId: searchParams.get('maintenanceScheduleId')?.trim() || null,
  };
}

function countStatus(requests: PurchaseRequestStatsInput, status: string): number {
  return requests.filter((r) => r.status === status).length;
}

export function buildPurchaseRequestStats(
  allRequests: PurchaseRequestStatsInput,
  userRequests: PurchaseRequestStatsInput,
  canReview: boolean,
): PurchaseRequestStats {
  const toReview = canReview ? countStatus(allRequests, PurchaseRequestStatus.SUBMITTED) : 0;
  const myDraft = countStatus(userRequests, PurchaseRequestStatus.DRAFT);
  const myPending = countStatus(userRequests, PurchaseRequestStatus.SUBMITTED);

  return {
    total: allRequests.length,
    draft: countStatus(allRequests, PurchaseRequestStatus.DRAFT),
    submitted: countStatus(allRequests, PurchaseRequestStatus.SUBMITTED),
    approved: countStatus(allRequests, PurchaseRequestStatus.APPROVED),
    rejected: countStatus(allRequests, PurchaseRequestStatus.REJECTED),
    cancelled: countStatus(allRequests, PurchaseRequestStatus.CANCELLED),
    toReview,
    myDraft,
    myPending,
  };
}
