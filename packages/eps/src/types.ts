import { EquipmentStatus, ApprovalStatus, ApprovalType } from '@ems/database';

export interface EquipmentPassportDetailDto {
  id: string;
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
  status: EquipmentStatus;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  commissionDate: Date | null;
  customFields?: Record<string, any> | null;
  maintenanceHistory: Array<{
    id: string;
    scheduledDate: Date;
    status: string;
    title: string;
  }>;
  incidentHistory: Array<{
    id: string;
    issueKey: string;
    summary: string;
    status: string;
    priority: string;
    createdDate: Date;
    resolvedDate: Date | null;
  }>;
}

export interface ResolveApprovalDto {
  approvalId: string;
  reviewerId: string;
  decision: 'APPROVE' | 'REJECT';
  comment?: string;
}
