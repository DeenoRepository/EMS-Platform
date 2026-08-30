import { StockTransferStatus, Prisma } from '@ems/database';

export interface TransferWhereParams {
  mode: string;
  status?: StockTransferStatus;
  warehouseId?: string | null;
  search?: string;
  userId: string;
}

function applyModeScope(
  where: Prisma.StockTransferWhereInput,
  params: TransferWhereParams,
): void {
  const { mode, status, warehouseId, userId } = params;

  if (mode === 'my_requests') {
    where.createdById = userId;
    if (!status) where.status = StockTransferStatus.REQUESTED;
    return;
  }

  if (mode === 'inbound' || mode === 'outbound') {
    where.status = StockTransferStatus.IN_TRANSIT;
    if (warehouseId) {
      where[mode === 'inbound' ? 'targetWarehouseId' : 'sourceWarehouseId'] = warehouseId;
    }
    return;
  }

  if (mode === 'requests') {
    where.status = StockTransferStatus.REQUESTED;
    if (warehouseId) where.sourceWarehouseId = warehouseId;
    return;
  }

  if (warehouseId) {
    where.OR = [
      { sourceWarehouseId: warehouseId },
      { targetWarehouseId: warehouseId },
    ];
  }
}

function applySearchFilter(
  where: Prisma.StockTransferWhereInput,
  search: string | undefined,
): void {
  if (!search) return;

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

export function buildTransferWhereModel(
  params: TransferWhereParams,
): Prisma.StockTransferWhereInput {
  const { status } = params;
  const where: Prisma.StockTransferWhereInput = {};

  if (status && Object.values(StockTransferStatus).includes(status)) {
    where.status = status;
  }

  applyModeScope(where, params);
  applySearchFilter(where, params.search);
  return where;
}
