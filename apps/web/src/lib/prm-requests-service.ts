import { prisma, PurchaseRequestStatus } from '@ems/database';
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
 * PRM status transition matrix. Delivery statuses are calculated by the
 * delivery service; the only manually executable delivery-stage transition is
 * the explicit DELIVERED -> CLOSED action.
 */
const ALLOWED_TRANSITIONS: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
  [PurchaseRequestStatus.DRAFT]: [
    PurchaseRequestStatus.SUBMITTED,
    PurchaseRequestStatus.CANCELLED,
  ],
  [PurchaseRequestStatus.SUBMITTED]: [
    PurchaseRequestStatus.APPROVED,
    PurchaseRequestStatus.REJECTED,
    PurchaseRequestStatus.CANCELLED,
  ],
  [PurchaseRequestStatus.APPROVED]: [],
  [PurchaseRequestStatus.REJECTED]: [],
  [PurchaseRequestStatus.CANCELLED]: [],
  [PurchaseRequestStatus.IN_PROGRESS]: [],
  [PurchaseRequestStatus.PARTIALLY_DELIVERED]: [],
  [PurchaseRequestStatus.DELIVERED]: [PurchaseRequestStatus.CLOSED],
  [PurchaseRequestStatus.CLOSED]: [],
};

/**
 * Pure validator: true only for transitions explicitly whitelisted above.
 * Delivery-stage statuses cannot be assigned manually, except for the explicit
 * DELIVERED -> CLOSED action.
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
  if (to === PurchaseRequestStatus.CLOSED) {
    return isAdmin;
  }
  // APPROVED / REJECTED
  return isAdmin;
}

export type DecimalLike = number | string | {
  toString(): string;
  comparedTo?: (value: string) => number;
};

function decimalString(value: DecimalLike): string {
  return value.toString().trim();
}

/**
 * Exact decimal comparison. Prisma 6's generated Decimal implementation
 * exposes comparedTo(), which compares decimal values without a Number cast.
 * The string/number fallback keeps this pure validator executable in isolated
 * route tests while retaining exact base-10 semantics.
 */
export function compareDecimalLike(left: DecimalLike, right: DecimalLike): -1 | 0 | 1 {
  const comparedTo = (left as { comparedTo?: (value: string) => number }).comparedTo;
  if (typeof comparedTo === 'function') {
    const result = comparedTo.call(left, decimalString(right));
    return result < 0 ? -1 : result > 0 ? 1 : 0;
  }

  const parse = (value: DecimalLike) => {
    const normalized = decimalString(value).toLowerCase();
    const [coefficient, exponentText = '0'] = normalized.split('e');
    const exponentSign = exponentText.startsWith('-') ? -1 : 1;
    const exponentDigits = exponentText.replace(/^[+-]/, '') || '0';
    const exponent = BigInt(exponentDigits) * BigInt(exponentSign);
    const sign = coefficient.startsWith('-') ? -1n : 1n;
    const unsigned = coefficient.replace(/^[+-]/, '');
    const [whole, fraction = ''] = unsigned.split('.');
    const digits = BigInt(`${whole || '0'}${fraction}` || '0');
    return { sign, digits, scale: BigInt(fraction.length) - exponent };
  };
  const a = parse(left);
  const b = parse(right);
  const scale = a.scale > b.scale ? a.scale : b.scale;
  const aInteger = a.sign * a.digits * 10n ** (scale - a.scale);
  const bInteger = b.sign * b.digits * 10n ** (scale - b.scale);
  return aInteger < bInteger ? -1 : aInteger > bInteger ? 1 : 0;
}

/**
 * Purely validates the prerequisites for explicit closure. Quantity state is
 * read from request items and is never changed by closure.
 */
export function validatePurchaseRequestClosure(params: {
  status: PurchaseRequestStatus;
  items: Array<{ requestedQty: DecimalLike; receivedQty: DecimalLike }>;
}): { valid: boolean; error?: string } {
  if (params.status !== PurchaseRequestStatus.DELIVERED) {
    return { valid: false, error: `Закрыть заявку можно только в статусе «${PurchaseRequestStatus.DELIVERED}»` };
  }
  if (params.items.length === 0 || params.items.some((item) => compareDecimalLike(item.receivedQty, item.requestedQty) < 0)) {
    return { valid: false, error: 'Нельзя закрыть заявку: не все количества поставлены' };
  }
  return { valid: true };
}

/**
 * Pure authorization rule for explicit closure. A PRM manager/admin may close
 * any request; a warehouse MOL may close only their target warehouse request.
 */
export function canPerformPurchaseRequestClosure(params: {
  isPurchaseAdmin: boolean;
  isTargetWarehouseResponsible: boolean;
}): boolean {
  return params.isPurchaseAdmin || params.isTargetWarehouseResponsible;
}

/**
 * Builds the minimal persistence payload for explicit closure. Delivery
 * quantities and delivery records are intentionally not included.
 */
export function buildPurchaseRequestClosureUpdate(params: {
  actorId: string;
  closedAt?: Date;
}): Record<string, unknown> {
  return {
    status: PurchaseRequestStatus.CLOSED,
    closedAt: params.closedAt ?? new Date(),
    closedBy: { connect: { id: params.actorId } },
  };
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
}): Record<string, unknown> {
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

/**
 * Pure validator: checks that when both equipment and schedule are specified,
 * the schedule actually belongs to that equipment.
 */
export function validateScheduleEquipmentConsistency(params: {
  equipmentId?: string | null;
  scheduleEquipmentId?: string | null;
}): { valid: boolean; error?: string } {
  const { equipmentId, scheduleEquipmentId } = params;
  if (equipmentId && scheduleEquipmentId && scheduleEquipmentId !== equipmentId) {
    return {
      valid: false,
      error: 'Указанный график ТО не относится к выбранному оборудованию',
    };
  }
  return { valid: true };
}

/**
 * Validates that referenced equipment and maintenance schedule exist in the
 * database and are consistent with each other.
 */
export async function validatePurchaseRequestSourceLinks(params: {
  equipmentId?: string | null;
  maintenanceScheduleId?: string | null;
}): Promise<{ valid: boolean; error?: string }> {
  const { equipmentId, maintenanceScheduleId } = params;

  if (equipmentId) {
    const equipment = await prisma.equipment.findFirst({
      where: { id: equipmentId, deletedAt: null },
      select: { id: true },
    });
    if (!equipment) {
      return { valid: false, error: 'Оборудование не найдено' };
    }
  }

  if (maintenanceScheduleId) {
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: maintenanceScheduleId },
      select: { id: true, equipmentId: true },
    });
    if (!schedule) {
      return { valid: false, error: 'График ТО не найден' };
    }

    const consistency = validateScheduleEquipmentConsistency({
      equipmentId,
      scheduleEquipmentId: schedule.equipmentId,
    });
    if (!consistency.valid) {
      return consistency;
    }
  }

  return { valid: true };
}

/**
 * Builds the Prisma include clause for purchase requests, conditionally
 * joining EPS equipment and MRO maintenance schedule relations only when the
 * user has the corresponding permissions to prevent unnecessary joins and
 * unintended data disclosure.
 */
export function buildPurchaseRequestInclude(options: {
  canViewEps: boolean;
  canViewMro: boolean;
}) {
  return {
    targetWarehouse: { select: { id: true, name: true, code: true, responsibleUserId: true } },
    requester: { select: { id: true, displayName: true, ldapLogin: true } },
    reviewer: { select: { id: true, displayName: true, ldapLogin: true } },
    closedBy: { select: { id: true, displayName: true, ldapLogin: true } },
    ...(options.canViewEps ? { equipment: { select: { id: true, name: true, inventoryNumber: true } } } : {}),
    ...(options.canViewMro ? { maintenanceSchedule: { select: { id: true, title: true } } } : {}),
    items: {
      include: {
        nomenclature: { select: { id: true, name: true, article: true, unit: true } },
      },
    },
  };
}

/**
 * Server-side permission-aware serialization: sanitizes relation objects and
 * foreign keys so that callers without EPS view or MRO view receive null
 * relations and null foreign keys (equipmentId / maintenanceScheduleId)
 * instead of leaked labels/names/identifiers, while preserving database
 * links in the storage layer.
 */
export function sanitizePurchaseRequestRelations<T extends Record<string, any>>(
  item: T,
  options: { canViewEps: boolean; canViewMro: boolean },
): T {
  return {
    ...item,
    equipmentId: options.canViewEps ? (item.equipmentId ?? null) : null,
    equipment: options.canViewEps ? (item.equipment ?? null) : null,
    maintenanceScheduleId: options.canViewMro ? (item.maintenanceScheduleId ?? null) : null,
    maintenanceSchedule: options.canViewMro ? (item.maintenanceSchedule ?? null) : null,
  };
}
