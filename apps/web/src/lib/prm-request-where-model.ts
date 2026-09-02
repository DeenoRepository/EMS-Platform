import { PurchaseRequestStatus, Prisma } from '@ems/database';

export interface PurchaseRequestWhereParams {
  scope: string; // 'all' | 'my_requests' | 'to_review'
  status?: string;
  warehouseId?: string | null;
  search?: string;
  userId: string;
  isAdmin: boolean;
  userWarehouseIds: string[];
}

function applyStatusFilter(
  where: Prisma.PurchaseRequestWhereInput,
  params: PurchaseRequestWhereParams,
): void {
  const { status, scope } = params;

  if (status && Object.values(PurchaseRequestStatus).includes(status as PurchaseRequestStatus)) {
    where.status = status as PurchaseRequestStatus;
  }

  if (scope === 'to_review') {
    where.status = PurchaseRequestStatus.SUBMITTED;
  }
}

function applyScopeFilter(
  where: Prisma.PurchaseRequestWhereInput,
  params: PurchaseRequestWhereParams,
): void {
  const { scope, warehouseId, userId, isAdmin, userWarehouseIds } = params;

  if (scope === 'my_requests') {
    where.requesterId = userId;
    return;
  }

  if (warehouseId) {
    if (isAdmin || userWarehouseIds.includes(warehouseId)) {
      where.targetWarehouseId = warehouseId;
    } else {
      where.targetWarehouseId = { in: [] };
    }
    return;
  }

  if (!isAdmin) {
    where.OR = [
      { requesterId: userId },
      ...(userWarehouseIds.length > 0 ? [{ targetWarehouseId: { in: userWarehouseIds } }] : []),
    ];
  }
}

function applySearchFilter(
  where: Prisma.PurchaseRequestWhereInput,
  search: string | undefined,
): void {
  if (!search) return;

  where.AND = [
    {
      OR: [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { justification: { contains: search, mode: 'insensitive' } },
        { supplierName: { contains: search, mode: 'insensitive' } },
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

export function buildPurchaseRequestWhereModel(
  params: PurchaseRequestWhereParams,
): Prisma.PurchaseRequestWhereInput {
  const where: Prisma.PurchaseRequestWhereInput = {};

  applyStatusFilter(where, params);
  applyScopeFilter(where, params);
  applySearchFilter(where, params.search);
  return where;
}
