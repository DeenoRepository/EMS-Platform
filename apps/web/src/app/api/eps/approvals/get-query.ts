import { ApprovalStatus, ApprovalType, Prisma } from '@ems/database';

export type ApprovalListQuery = {
  page: number;
  pageSize: number;
  status: string;
  type: string;
  equipmentId: string;
  search: string;
  scope: string;
};

export type ApprovalStatsInput = {
  status: string;
}[];

export type ApprovalStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  toReview: number;
  myRejected: number;
  myPending: number;
  actionableCount: number;
};

export function parseApprovalListQuery(searchParams: URLSearchParams): ApprovalListQuery {
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)),
    pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10))),
    status: searchParams.get('status')?.trim() || '',
    type: searchParams.get('type')?.trim() || '',
    equipmentId: searchParams.get('equipmentId')?.trim() || '',
    search: searchParams.get('search')?.trim() || '',
    scope: searchParams.get('scope')?.trim() || 'all',
  };
}

export function buildApprovalWhereInput(
  query: Pick<ApprovalListQuery, 'status' | 'type' | 'equipmentId' | 'search' | 'scope'>,
  requesterId: string,
): Prisma.EquipmentApprovalWhereInput {
  const { status, type, equipmentId, search, scope } = query;
  const where: Prisma.EquipmentApprovalWhereInput = {};

  if (equipmentId) where.equipmentId = equipmentId;
  if (status && Object.keys(ApprovalStatus).includes(status)) where.status = status as ApprovalStatus;
  if (type && Object.keys(ApprovalType).includes(type)) where.type = type as ApprovalType;

  if (scope === 'my_requests') {
    where.requesterId = requesterId;
  } else if (scope === 'to_review') {
    where.status = 'PENDING';
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      {
        equipment: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { inventoryNumber: { contains: search, mode: 'insensitive' } },
            { serialNumber: { contains: search, mode: 'insensitive' } },
            { manufacturer: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }

  return where;
}

function countStatus(approvals: ApprovalStatsInput, status: string): number {
  return approvals.filter((approval) => approval.status === status).length;
}

export function buildApprovalStats(
  allApprovals: ApprovalStatsInput,
  userApprovals: ApprovalStatsInput,
  scope: string,
  canReview: boolean,
): ApprovalStats {
  const toReview = canReview ? countStatus(allApprovals, 'PENDING') : 0;
  const myRejected = countStatus(userApprovals, 'REJECTED');
  const myPending = countStatus(userApprovals, 'PENDING');
  const targetApprovals = scope === 'my_requests'
    ? userApprovals
    : scope === 'to_review'
      ? allApprovals.filter((approval) => approval.status === 'PENDING')
      : allApprovals;

  return {
    total: targetApprovals.length,
    pending: countStatus(targetApprovals, 'PENDING'),
    approved: countStatus(targetApprovals, 'APPROVED'),
    rejected: countStatus(targetApprovals, 'REJECTED'),
    cancelled: countStatus(targetApprovals, 'CANCELLED'),
    toReview,
    myRejected,
    myPending,
    actionableCount: toReview + myRejected,
  };
}
