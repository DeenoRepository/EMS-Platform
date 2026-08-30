import { isAdminUser } from '@/lib/auth-guard';
import { hasPermission } from '@ems/auth';
import { PERMISSIONS, JwtUserPayload } from '@ems/shared';

interface ZoneWithWarehouse {
  warehouse: {
    name: string;
    responsibleUserId: string | null;
  };
}

export interface ZoneCellAccessResult {
  allowed: boolean;
  forbiddenMessage?: string;
}

/**
 * Determines whether a user may create/delete storage cells in the given zone.
 * Admins and warehouse managers always have access; otherwise the user must be
 * the warehouse's responsible person AND hold zone/nomenclature management rights.
 *
 * Shared by POST and DELETE handlers — extracted to remove duplicated permission
 * logic and reduce cyclomatic complexity in the route handlers.
 */
export function resolveZoneCellAccess(
  user: JwtUserPayload,
  zone: ZoneWithWarehouse,
  action: 'create' | 'delete'
): ZoneCellAccessResult {
  const isAdmin =
    isAdminUser(user) ||
    hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE);

  const isResponsible = Boolean(
    zone.warehouse.responsibleUserId && zone.warehouse.responsibleUserId === user.userId
  );

  const hasZonePermission =
    hasPermission(user, PERMISSIONS.WMS_ZONES_MANAGE) ||
    hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE);

  const allowed = isAdmin || (isResponsible && hasZonePermission);

  if (allowed) return { allowed: true };

  const actionLabel = action === 'create' ? 'Создание' : 'Удаление';
  return {
    allowed: false,
    forbiddenMessage: `Вы не являетесь ответственным лицом за склад "${zone.warehouse.name}". ${actionLabel} ячеек чужого склада запрещено.`,
  };
}

export interface NormalizedBulkCell {
  code: string;
  name?: string;
}

/**
 * Normalizes one `bulkCodes` entry (string or `{ code, name }` object) into a
 * code/name pair. Returns null when the entry has no usable code.
 *
 * Mirrors the original inline parsing exactly, including that a non-string,
 * non-object item (e.g. `null`) will throw when `.code` is accessed — this is
 * pre-existing behavior preserved for contract parity, not a new defect.
 */
export function normalizeBulkCellEntry(item: unknown): NormalizedBulkCell | null {
  const itemCode =
    typeof item === 'string' ? item.trim() : (item as { code?: string }).code?.trim();
  const itemName =
    typeof item === 'object' ? (item as { name?: string }).name?.trim() : undefined;

  if (!itemCode) return null;
  return { code: itemCode, name: itemName };
}

export interface SingleCellInput {
  cleanCode: string;
  cleanName: string | null;
}

/**
 * Validates and normalizes single-cell creation input (`code`, `name` from
 * the request body). Returns null when `code` is missing/falsy.
 */
export function validateSingleCellInput(code: unknown, name: unknown): SingleCellInput | null {
  if (!code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  const cleanName = name ? String(name).trim() : null;
  return { cleanCode, cleanName };
}
