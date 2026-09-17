import { EquipmentStatus } from '@ems/database';

export function canTransitionEquipmentStatus(
  current: EquipmentStatus,
  next: EquipmentStatus,
  viaApproval = false,
): boolean {
  if (current === next) return true;
  if (current === 'DECOMMISSIONED') return false;
  if (current === 'DRAFT') return viaApproval && next !== 'DRAFT';
  if (next === 'DECOMMISSIONED') return viaApproval;
  return true;
}

export function equipmentVisibilityWhere(userId: string, canManageDrafts: boolean) {
  if (canManageDrafts) return { deletedAt: null };
  return {
    deletedAt: null,
    OR: [{ status: { not: 'DRAFT' as const } }, { status: 'DRAFT' as const, createdById: userId }],
  };
}
