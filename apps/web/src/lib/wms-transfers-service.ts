import { prisma, StockTransferStatus } from '@ems/database';
import { isAdminUser } from '@/lib/auth-guard';
import { PERMISSIONS, JwtUserPayload } from '@ems/shared';
import {
  buildTransferWhereModel,
  TransferWhereParams,
} from './wms-transfer-where-model';

/**
 * True when the user has unrestricted access to transfers across all warehouses
 * (platform admin, admin-settings permission, or warehouse-management permission).
 * Shared by GET and POST handlers to avoid duplicating the same permission check.
 */
export function isTransfersAdmin(user: JwtUserPayload): boolean {
  return (
    isAdminUser(user) ||
    user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
    user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
  );
}

/**
 * Resolves the set of warehouse IDs a non-admin user is scoped to for the
 * transfers list. Admin users and requests with an explicit `warehouseId`
 * bypass the lookup (empty array — caller does not use this for admins).
 */
export async function resolveUserWarehouseIds(params: {
  isAdmin: boolean;
  warehouseId: string | null;
  userId: string;
}): Promise<string[]> {
  const { isAdmin, warehouseId, userId } = params;
  if (warehouseId) return [warehouseId];
  if (isAdmin) return [];

  const userWarehouses = await prisma.warehouse.findMany({
    where: { responsibleUserId: userId },
    select: { id: true },
  });
  return userWarehouses.map((w) => w.id);
}

export function generateTransferNumber(isRequest: boolean): string {
  const prefix = isRequest ? 'REQ' : 'TR';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const uniqueSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `${prefix}-${dateStr}-${uniqueSuffix}`;
}

export function buildTransferWhereInput(params: TransferWhereParams) {
  return buildTransferWhereModel(params);
}

export async function getTransferTabCounts(params: {
  isAdmin: boolean;
  warehouseId?: string | null;
  userWarehouseIds: string[];
  total: number;
}): Promise<{ inbound: number; requests: number; outbound: number; total: number }> {
  const { isAdmin, warehouseId, userWarehouseIds, total } = params;

  if (isAdmin) {
    const [inbound, requests, outbound] = await Promise.all([
      prisma.stockTransfer.count({
        where: {
          ...(warehouseId ? { targetWarehouseId: warehouseId } : {}),
          status: StockTransferStatus.IN_TRANSIT,
        },
      }),
      prisma.stockTransfer.count({
        where: {
          ...(warehouseId ? { sourceWarehouseId: warehouseId } : {}),
          status: StockTransferStatus.REQUESTED,
        },
      }),
      prisma.stockTransfer.count({
        where: {
          ...(warehouseId ? { sourceWarehouseId: warehouseId } : {}),
          status: StockTransferStatus.IN_TRANSIT,
        },
      }),
    ]);
    return { inbound, requests, outbound, total };
  }

  if (userWarehouseIds.length > 0) {
    const targetWhFilter = warehouseId
      ? (userWarehouseIds.includes(warehouseId) ? [warehouseId] : [])
      : userWarehouseIds;

    const [inbound, requests, outbound] = await Promise.all([
      prisma.stockTransfer.count({
        where: {
          targetWarehouseId: { in: targetWhFilter },
          status: StockTransferStatus.IN_TRANSIT,
        },
      }),
      prisma.stockTransfer.count({
        where: {
          sourceWarehouseId: { in: targetWhFilter },
          status: StockTransferStatus.REQUESTED,
        },
      }),
      prisma.stockTransfer.count({
        where: {
          sourceWarehouseId: { in: targetWhFilter },
          status: StockTransferStatus.IN_TRANSIT,
        },
      }),
    ]);
    return { inbound, requests, outbound, total };
  }

  return { inbound: 0, requests: 0, outbound: 0, total };
}
