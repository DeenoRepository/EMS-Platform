import { prisma, StockTransferStatus, Prisma } from '@ems/database';
import { isAdminUser } from '@/lib/auth-guard';
import { PERMISSIONS, JwtUserPayload } from '@ems/shared';

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

export function buildTransferWhereInput(params: {
  mode: string;
  status?: StockTransferStatus;
  warehouseId?: string | null;
  search?: string;
  userId: string;
}): Prisma.StockTransferWhereInput {
  const { mode, status, warehouseId, search, userId } = params;
  const where: Prisma.StockTransferWhereInput = {};

  if (status && Object.values(StockTransferStatus).includes(status)) {
    where.status = status;
  }

  if (warehouseId) {
    if (mode === 'inbound') {
      where.targetWarehouseId = warehouseId;
      where.status = StockTransferStatus.IN_TRANSIT;
    } else if (mode === 'requests') {
      where.sourceWarehouseId = warehouseId;
      where.status = StockTransferStatus.REQUESTED;
    } else if (mode === 'outbound') {
      where.sourceWarehouseId = warehouseId;
      where.status = StockTransferStatus.IN_TRANSIT;
    } else if (mode === 'my_requests') {
      where.createdById = userId;
      if (!status) where.status = StockTransferStatus.REQUESTED;
    } else {
      where.OR = [
        { sourceWarehouseId: warehouseId },
        { targetWarehouseId: warehouseId },
      ];
    }
  } else {
    if (mode === 'inbound') {
      where.status = StockTransferStatus.IN_TRANSIT;
    } else if (mode === 'requests') {
      where.status = StockTransferStatus.REQUESTED;
    } else if (mode === 'outbound') {
      where.status = StockTransferStatus.IN_TRANSIT;
    } else if (mode === 'my_requests') {
      where.createdById = userId;
      if (!status) where.status = StockTransferStatus.REQUESTED;
    }
  }

  if (search) {
    where.AND = [
      {
        OR: [
          { transferNumber: { contains: search, mode: 'insensitive' } },
          { requestReason: { contains: search, mode: 'insensitive' } },
          { rejectionReason: { contains: search, mode: 'insensitive' } },
          { sourceWarehouse: { name: { contains: search, mode: 'insensitive' } } },
          { targetWarehouse: { name: { contains: search, mode: 'insensitive' } } },
          {
            items: {
              some: {
                nomenclature: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      },
    ];
  }

  return where;
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
