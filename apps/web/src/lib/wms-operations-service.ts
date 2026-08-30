import { Prisma, OperationType } from '@ems/database';
import { isAdminUser } from '@/lib/auth-guard';
import { PERMISSIONS, JwtUserPayload } from '@ems/shared';

/**
 * True when the user has unrestricted access to stock operations across all
 * warehouses (platform admin, admin-settings permission, or warehouse-management
 * permission). Shared by GET and POST handlers to avoid duplicating the check.
 */
export function isOperationsAdmin(user: JwtUserPayload): boolean {
  return (
    isAdminUser(user) ||
    user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
  );
}

/**
 * Builds the Prisma `where` filter for the stock operations list from
 * validated query parameters. Extracted from the GET handler to remove the
 * inline `any`-typed accumulator and reduce cyclomatic complexity.
 */
export function buildOperationsWhereInput(params: {
  warehouseId?: string;
  type?: OperationType;
}): Prisma.StockOperationWhereInput {
  const { warehouseId, type } = params;
  const where: Prisma.StockOperationWhereInput = {};

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  if (type && type in OperationType) {
    where.type = type;
  }

  return where;
}
