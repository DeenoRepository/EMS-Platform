import type { EquipmentStatus, Prisma } from '@ems/database';

export type EquipmentPatchBody = {
  name?: string;
  inventoryNumber?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  location?: string | null;
  status?: EquipmentStatus;
  commissionDate?: string | null;
  commissioningDate?: string | null;
  customFields?: unknown;
  tagIds?: string[];
};

export type ExistingEquipmentForPatch = {
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: EquipmentStatus;
  commissionDate: Date | null;
  customFields: unknown;
  tags: Array<{ tagId: string }>;
};

export function parseEquipmentDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getEffectiveCommissionDate(body: EquipmentPatchBody): Date | null {
  const rawDate = body.commissionDate !== undefined ? body.commissionDate : body.commissioningDate;
  return parseEquipmentDate(rawDate);
}

function normalizeNullableString(value: string | null | undefined): string | null | undefined {
  return value === undefined ? undefined : value?.trim() || null;
}

export function buildEquipmentUpdateData(
  body: EquipmentPatchBody,
  commissionDate: Date | null,
): Prisma.EquipmentUpdateInput {
  return {
    name: body.name?.trim(),
    inventoryNumber: normalizeNullableString(body.inventoryNumber),
    serialNumber: normalizeNullableString(body.serialNumber),
    manufacturer: normalizeNullableString(body.manufacturer),
    model: normalizeNullableString(body.model),
    location: normalizeNullableString(body.location),
    status: body.status,
    commissionDate: body.commissionDate !== undefined || body.commissioningDate !== undefined ? commissionDate : undefined,
    customFields: body.customFields !== undefined
      ? (body.customFields ? JSON.parse(JSON.stringify(body.customFields)) as Prisma.InputJsonValue : {})
      : undefined,
  };
}

export function buildEquipmentApprovalProposal(
  body: EquipmentPatchBody,
  existing: ExistingEquipmentForPatch,
  commissionDate: Date | null,
): Prisma.InputJsonObject {
  return {
    name: body.name !== undefined ? body.name.trim() : existing.name,
    inventoryNumber: body.inventoryNumber !== undefined ? (body.inventoryNumber?.trim() || null) : existing.inventoryNumber,
    serialNumber: body.serialNumber !== undefined ? (body.serialNumber?.trim() || null) : existing.serialNumber,
    manufacturer: body.manufacturer !== undefined ? (body.manufacturer?.trim() || null) : existing.manufacturer,
    model: body.model !== undefined ? (body.model?.trim() || null) : existing.model,
    location: body.location !== undefined ? (body.location?.trim() || null) : existing.location,
    status: body.status !== undefined ? body.status : existing.status,
    commissionDate: commissionDate ? commissionDate.toISOString() : (existing.commissionDate ? existing.commissionDate.toISOString() : null),
    customFields: body.customFields !== undefined
      ? (body.customFields ? JSON.parse(JSON.stringify(body.customFields)) as Prisma.InputJsonValue : null)
      : existing.customFields as Prisma.InputJsonValue,
    tagIds: Array.isArray(body.tagIds) ? body.tagIds : existing.tags.map((tag) => tag.tagId),
  };
}
