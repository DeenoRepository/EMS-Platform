import { prisma, PurchaseRequestStatus, type Prisma } from '@ems/database';
import { isAdminUser } from '@/lib/auth-guard';
import { PERMISSIONS, JwtUserPayload } from '@ems/shared';
import {
  buildPurchaseRequestWhereModel,
  PurchaseRequestWhereParams,
} from './prm-request-where-model';

/**
 * True when the user has unrestricted access to purchase requests across all
 * warehouses (platform admin, admin-settings permission, or PRM management
 * permission). Shared by GET/PATCH/status-transition handlers so the same
 * escalation rule is not duplicated per route.
 */
export function isPurchaseAdmin(user: JwtUserPayload): boolean {
  return (
    isAdminUser(user) ||
    user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    user.permissions.includes(PERMISSIONS.PRM_REQUESTS_MANAGE)
  );
}

/**
 * Resolves the set of warehouse IDs a non-admin user is scoped to (MOL —
 * материально ответственное лицо) for the purchase requests list. Admin
 * users bypass the lookup (empty array — caller does not use this for
 * admins).
 */
export async function resolveUserWarehouseIds(params: {
  isAdmin: boolean;
  userId: string;
}): Promise<string[]> {
  const { isAdmin, userId } = params;
  if (isAdmin) return [];

  const userWarehouses = await prisma.warehouse.findMany({
    where: { responsibleUserId: userId },
    select: { id: true },
  });
  return userWarehouses.map((w) => w.id);
}

export function generatePurchaseRequestNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const uniqueSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `PR-${dateStr}-${uniqueSuffix}`;
}

export function buildPurchaseRequestWhereInput(params: PurchaseRequestWhereParams) {
  return buildPurchaseRequestWhereModel(params);
}

export interface PurchaseRequestItemInput {
  requestedQty: number;
  estimatedPrice: number;
}

/** Sums requestedQty * estimatedPrice across all positions of a request. */
export function calculateEstimatedTotal(items: PurchaseRequestItemInput[]): number {
  return items.reduce((sum, item) => sum + item.requestedQty * item.estimatedPrice, 0);
}

/**
 * P1 status transition matrix. Only DRAFT -> SUBMITTED -> APPROVED/REJECTED
 * and *->CANCELLED are allowed; delivery-stage statuses (IN_PROGRESS,
 * PARTIALLY_DELIVERED, DELIVERED, CLOSED) exist in the enum for P2 but are
 * rejected here so P1 cannot short-circuit the not-yet-implemented delivery
 * flow.
 */
const ALLOWED_TRANSITIONS: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
  DRAFT: [PurchaseRequestStatus.SUBMITTED, PurchaseRequestStatus.CANCELLED],
  SUBMITTED: [
    PurchaseRequestStatus.APPROVED,
    PurchaseRequestStatus.REJECTED,
    PurchaseRequestStatus.CANCELLED,
  ],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
  IN_PROGRESS: [],
  PARTIALLY_DELIVERED: [],
  DELIVERED: [],
  CLOSED: [],
};

/**
 * Pure validator: true only for transitions explicitly whitelisted above.
 * Deliberately rejects every P2 delivery-stage target status so P1 cannot
 * be used to fast-forward a request past approval.
 */
export function isValidStatusTransition(
  from: PurchaseRequestStatus,
  to: PurchaseRequestStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Who is allowed to perform a given transition. Requester may submit/cancel
 * their own draft; reviewer (PRM manage permission or admin) approves/
 * rejects; requester may also cancel a submitted-but-not-yet-reviewed
 * request.
 */
export function canPerformTransition(params: {
  to: PurchaseRequestStatus;
  isRequester: boolean;
  isAdmin: boolean;
}): boolean {
  const { to, isRequester, isAdmin } = params;

  if (to === PurchaseRequestStatus.CANCELLED) {
    return isRequester || isAdmin;
  }
  if (to === PurchaseRequestStatus.SUBMITTED) {
    return isRequester || isAdmin;
  }
  // APPROVED / REJECTED
  return isAdmin;
}

/**
 * Pure builder for the Prisma update payload of a status transition. Kept
 * separate from the route handler so the field-selection logic (reviewer
 * fields only touched for APPROVED/REJECTED) is unit-testable without a
 * database.
 */
export function buildStatusTransitionUpdate(params: {
  targetStatus: PurchaseRequestStatus;
  actorId: string;
  resolutionComment?: string | null;
}): Prisma.PurchaseRequestUpdateInput {
  const { targetStatus, actorId, resolutionComment } = params;
  const isReviewDecision =
    targetStatus === PurchaseRequestStatus.APPROVED || targetStatus === PurchaseRequestStatus.REJECTED;

  return {
    status: targetStatus,
    ...(isReviewDecision
      ? {
          reviewer: { connect: { id: actorId } },
          reviewedAt: new Date(),
        }
      : {}),
    ...(resolutionComment !== undefined ? { resolutionComment: resolutionComment?.trim() || null } : {}),
  };
}
