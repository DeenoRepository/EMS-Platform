import { EquipmentStatus, Prisma } from '@ems/database';

export type EquipmentListQuery = {
  search: string;
  status: EquipmentStatus | null;
  tagId: string;
  manufacturer: string;
  page: number;
  pageSize: number;
};

export type EquipmentStatusCounts = {
  total: number;
  active: number;
  underRepair: number;
  inStorage: number;
  decommissioned: number;
  draft: number;
};

type EquipmentStatusGroup = {
  status: EquipmentStatus;
  _count: { status: number };
};

export function parseEquipmentListQuery(searchParams: URLSearchParams): EquipmentListQuery {
  const pageSizeValue = searchParams.get('pageSize') || searchParams.get('limit') || '20';

  return {
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as EquipmentStatus | null) || null,
    tagId: searchParams.get('tagId') || '',
    manufacturer: searchParams.get('manufacturer') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
    pageSize: Math.min(1000, Math.max(1, parseInt(pageSizeValue, 10))),
  };
}

export function buildEquipmentWhereInput(
  query: Pick<EquipmentListQuery, 'search' | 'status' | 'tagId' | 'manufacturer'>,
): Prisma.EquipmentWhereInput {
  const where: Prisma.EquipmentWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.manufacturer) {
    where.manufacturer = { contains: query.manufacturer, mode: 'insensitive' };
  }
  if (query.tagId) where.tags = { some: { tagId: query.tagId } };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { inventoryNumber: { contains: query.search, mode: 'insensitive' } },
      { serialNumber: { contains: query.search, mode: 'insensitive' } },
      { manufacturer: { contains: query.search, mode: 'insensitive' } },
      { model: { contains: query.search, mode: 'insensitive' } },
      { location: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export function buildEquipmentStatusCounts(statusGroup: EquipmentStatusGroup[]): EquipmentStatusCounts {
  const statusCounts: EquipmentStatusCounts = {
    total: 0,
    active: 0,
    underRepair: 0,
    inStorage: 0,
    decommissioned: 0,
    draft: 0,
  };

  statusGroup.forEach((group) => {
    statusCounts.total += group._count.status;
    const keyByStatus: Partial<Record<EquipmentStatus, keyof EquipmentStatusCounts>> = {
      ACTIVE: 'active',
      UNDER_REPAIR: 'underRepair',
      IN_STORAGE: 'inStorage',
      DECOMMISSIONED: 'decommissioned',
      DRAFT: 'draft',
    };
    const key = keyByStatus[group.status];
    if (key) statusCounts[key] = group._count.status;
  });

  return statusCounts;
}
