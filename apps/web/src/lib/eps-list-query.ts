import type { Prisma } from '@ems/database';

export type EpsSortDirection = 'asc' | 'desc';

export interface EpsListQuery<TSort extends string> {
  page: number;
  pageSize: number;
  sortBy: TSort;
  sortDirection: EpsSortDirection;
}

export function parseEpsListQuery<TSort extends string>(
  params: URLSearchParams,
  sortFields: readonly TSort[],
  defaultSortBy: TSort,
): EpsListQuery<TSort> {
  const page = parsePositiveInt(params.get('page'), 1);
  const pageSize = Math.min(100, parsePositiveInt(params.get('pageSize'), 25));
  const requestedSort = params.get('sortBy') as TSort | null;
  const sortBy = requestedSort && sortFields.includes(requestedSort) ? requestedSort : defaultSortBy;
  const sortDirection = params.get('sortDirection') === 'asc' ? 'asc' : 'desc';

  return { page, pageSize, sortBy, sortDirection };
}

export function serializeEpsListQuery<TSort extends string>(
  query: EpsListQuery<TSort>,
  extra: Record<string, string | undefined> = {},
): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(extra).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  params.set('sortBy', query.sortBy);
  params.set('sortDirection', query.sortDirection);
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  return params;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const APPROVAL_SORT_FIELDS = [
  'title', 'inventoryNumber', 'equipment', 'manufacturer', 'type', 'status', 'requester', 'date', 'reviewer',
] as const;
export type ApprovalSortField = (typeof APPROVAL_SORT_FIELDS)[number];

export function buildApprovalOrderBy(
  sortBy: ApprovalSortField,
  sortDirection: EpsSortDirection,
): Prisma.EquipmentApprovalOrderByWithRelationInput {
  const relationFields = {
    inventoryNumber: { equipment: { inventoryNumber: sortDirection } },
    equipment: { equipment: { name: sortDirection } },
    manufacturer: { equipment: { manufacturer: sortDirection } },
    requester: { requester: { displayName: sortDirection } },
    reviewer: { reviewer: { displayName: sortDirection } },
  } as const;
  if (sortBy in relationFields) return relationFields[sortBy as keyof typeof relationFields];
  return { [sortBy === 'date' ? 'createdAt' : sortBy]: sortDirection };
}

export const DOCUMENT_SORT_FIELDS = ['name', 'equipment', 'docType', 'description', 'size', 'uploadedBy', 'date'] as const;
export type DocumentSortField = (typeof DOCUMENT_SORT_FIELDS)[number];

export function buildDocumentOrderBy(
  sortBy: DocumentSortField,
  sortDirection: EpsSortDirection,
): Prisma.DocumentOrderByWithRelationInput {
  const orderBy = {
    name: { originalName: sortDirection },
    equipment: { equipment: { name: sortDirection } },
    docType: { docType: sortDirection },
    description: { description: sortDirection },
    size: { fileSize: sortDirection },
    uploadedBy: { uploadedBy: { displayName: sortDirection } },
    date: { createdAt: sortDirection },
  } as const;
  return orderBy[sortBy];
}

export const HISTORY_SORT_FIELDS = ['createdAt', 'user', 'action', 'entityType', 'equipment'] as const;
export type HistorySortField = (typeof HISTORY_SORT_FIELDS)[number];

export function buildHistoryOrderBy(
  sortBy: HistorySortField,
  sortDirection: EpsSortDirection,
): Prisma.AuditLogOrderByWithRelationInput {
  const orderBy = {
    createdAt: { createdAt: sortDirection },
    user: { user: { displayName: sortDirection } },
    action: { action: sortDirection },
    entityType: { entityType: sortDirection },
    equipment: { entityId: sortDirection },
  } as const;
  return orderBy[sortBy];
}
