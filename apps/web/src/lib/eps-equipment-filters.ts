import { EquipmentStatus, Prisma } from '@ems/database';
import { EQUIPMENT_STATUS_MAP } from '@ems/shared';
import { z } from 'zod';

export type EquipmentSortField =
  | 'name'
  | 'inventoryNumber'
  | 'serialNumber'
  | 'manufacturer'
  | 'model'
  | 'location'
  | 'status'
  | 'commissionDate'
  | 'createdAt'
  | 'updatedAt';

export interface EquipmentFilters {
  search: string;
  statuses: EquipmentStatus[];
  tagIds: string[];
  manufacturer: string;
  location: string;
  sortBy: EquipmentSortField;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

const sortFields = Object.keys({
  name: true,
  inventoryNumber: true,
  serialNumber: true,
  manufacturer: true,
  model: true,
  location: true,
  status: true,
  commissionDate: true,
  createdAt: true,
  updatedAt: true,
}) as [EquipmentSortField, ...EquipmentSortField[]];

const querySchema = z.object({
  search: z.string().trim().default(''),
  status: z.string().default(''),
  tagId: z.string().default(''),
  manufacturer: z.string().trim().default(''),
  location: z.string().trim().default(''),
  sortBy: z.enum(sortFields).default('updatedAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(25),
});

function splitParam(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}

export function parseEquipmentFilters(params: URLSearchParams): EquipmentFilters {
  const parsed = querySchema.parse(Object.fromEntries(params.entries()));
  const statuses = splitParam(parsed.status).filter(
    (status): status is EquipmentStatus => status in EQUIPMENT_STATUS_MAP,
  );

  return {
    search: parsed.search,
    statuses,
    tagIds: splitParam(parsed.tagId),
    manufacturer: parsed.manufacturer,
    location: parsed.location,
    sortBy: parsed.sortBy,
    sortDirection: parsed.sortDirection,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export function serializeEquipmentFilters(filters: EquipmentFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.statuses.length) params.set('status', filters.statuses.join(','));
  if (filters.tagIds.length) params.set('tagId', filters.tagIds.join(','));
  if (filters.manufacturer) params.set('manufacturer', filters.manufacturer);
  if (filters.location) params.set('location', filters.location);
  params.set('sortBy', filters.sortBy);
  params.set('sortDirection', filters.sortDirection);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  return params;
}

export function countActiveEquipmentFilters(filters: EquipmentFilters): number {
  return [
    filters.search,
    filters.statuses.length,
    filters.tagIds.length,
    filters.manufacturer,
    filters.location,
  ].filter(Boolean).length;
}

export function buildEquipmentOrderBy(filters: EquipmentFilters): Prisma.EquipmentOrderByWithRelationInput {
  return { [filters.sortBy]: filters.sortDirection };
}
