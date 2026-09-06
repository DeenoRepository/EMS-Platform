import { EquipmentStatus, ApprovalStatus, ApprovalType } from '@ems/database';

export interface ResolveApprovalDto {
  approvalId: string;
  reviewerId: string;
  status: ApprovalStatus;
  resolutionComment?: string | null;
}
