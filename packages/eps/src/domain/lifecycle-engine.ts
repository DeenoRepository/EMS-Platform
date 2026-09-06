import { EquipmentStatus, ApprovalStatus, ApprovalType } from '@ems/database';

export interface EquipmentEntity {
  id: string;
  name: string;
  status: EquipmentStatus;
  commissionDate?: Date | null;
  customFields?: Record<string, any> | null;
}

export interface ApprovalEntity {
  id: string;
  equipmentId: string;
  type: ApprovalType;
  status: ApprovalStatus;
  proposedChanges?: Record<string, any> | null;
  reviewComment?: string | null;
}

export interface ApprovalResolutionResult {
  updatedEquipment: EquipmentEntity;
  resolvedApprovalStatus: ApprovalStatus;
  notificationTitle: string;
  notificationMessage: string;
}

/**
 * Resolves an approval decision for an equipment item.
 * Strictly guarantees that status transitions follow domain invariants.
 */
export function resolveApprovalDecision(
  equipment: EquipmentEntity,
  approval: ApprovalEntity,
  decision: 'APPROVE' | 'REJECT',
  reviewComment?: string
): ApprovalResolutionResult {
  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error(`Заявка уже рассмотрена со статусом ${approval.status}`);
  }

  if (decision === 'REJECT') {
    return {
      updatedEquipment: { ...equipment },
      resolvedApprovalStatus: ApprovalStatus.REJECTED,
      notificationTitle: 'Заявка на согласование отклонена',
      notificationMessage: reviewComment
        ? `Заявка по оборудованию "${equipment.name}" отклонена. Причина: ${reviewComment}`
        : `Заявка по оборудованию "${equipment.name}" отклонена.`,
    };
  }

  // Decision === 'APPROVE'
  const updated = { ...equipment };

  switch (approval.type) {
    case ApprovalType.COMMISSIONING:
    case ApprovalType.EQUIPMENT_CREATE:
      updated.status = EquipmentStatus.ACTIVE;
      updated.commissionDate = new Date();
      break;

    case ApprovalType.DECOMMISSIONING:
      updated.status = EquipmentStatus.DECOMMISSIONED;
      break;

    case ApprovalType.PARAMETER_CHANGE:
      if (approval.proposedChanges?.customFields) {
        updated.customFields = {
          ...(updated.customFields || {}),
          ...approval.proposedChanges.customFields,
        };
      }
      break;

    case ApprovalType.EQUIPMENT_UPDATE:
      if (approval.proposedChanges) {
        Object.assign(updated, approval.proposedChanges);
      }
      break;

    default:
      break;
  }

  return {
    updatedEquipment: updated,
    resolvedApprovalStatus: ApprovalStatus.APPROVED,
    notificationTitle: 'Паспорт оборудования согласован',
    notificationMessage: `Заявка по оборудованию "${equipment.name}" успешно утверждена.`,
  };
}
