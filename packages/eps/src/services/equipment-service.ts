import { prisma, ApprovalStatus } from '@ems/database';
import { resolveApprovalDecision } from '../domain/lifecycle-engine';
import { ResolveApprovalDto, EquipmentPassportDetailDto } from '../types';

export class EquipmentService {
  /**
   * Loads full equipment passport with read-only legacy maintenance and incident records.
   * Strictly guarantees NO external HTTP sync or MRO calculations are invoked.
   */
  static async getEquipmentPassportWithHistory(equipmentId: string): Promise<EquipmentPassportDetailDto | null> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        maintenancePlans: {
          include: {
            schedules: {
              orderBy: { scheduledDate: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!equipment) return null;

    // Load read-only historical incident cache without invoking Jira API
    const jiraIssues = await prisma.jiraIssueCache.findMany({
      where: { equipmentId },
      orderBy: { createdDate: 'desc' },
      take: 10,
    });

    const maintenanceHistory: EquipmentPassportDetailDto['maintenanceHistory'] = [];
    equipment.maintenancePlans.forEach((plan: any) => {
      plan.schedules.forEach((sch: any) => {
        maintenanceHistory.push({
          id: sch.id,
          scheduledDate: sch.scheduledDate,
          status: sch.status,
          title: sch.title || plan.name,
        });
      });
    });

    const incidentHistory: EquipmentPassportDetailDto['incidentHistory'] = jiraIssues.map((issue: any) => ({
      id: issue.id,
      issueKey: issue.issueKey,
      summary: issue.summary,
      status: issue.status,
      priority: issue.priority,
      createdDate: issue.createdDate,
      resolvedDate: issue.resolvedDate,
    }));

    return {
      id: equipment.id,
      name: equipment.name,
      inventoryNumber: equipment.inventoryNumber,
      serialNumber: equipment.serialNumber,
      status: equipment.status,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      location: equipment.location,
      commissionDate: equipment.commissionDate,
      customFields: equipment.customFields as Record<string, any> | null,
      maintenanceHistory,
      incidentHistory,
    };
  }

  /**
   * Resolves an approval request atomically within a database transaction.
   */
  static async resolveApproval(dto: ResolveApprovalDto) {
    const { approvalId, reviewerId, decision, comment } = dto;

    const approval = await prisma.equipmentApproval.findUnique({
      where: { id: approvalId },
      include: { equipment: true },
    });

    if (!approval) throw new Error('Заявка на согласование не найдена');
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new Error(`Заявка уже рассмотрена со статусом ${approval.status}`);
    }

    const eq = approval.equipment;
    if (!eq) throw new Error('Привязанное оборудование не найдено');

    const { updatedEquipment, resolvedApprovalStatus, notificationTitle, notificationMessage } =
      resolveApprovalDecision(
        {
          id: eq.id,
          name: eq.name,
          status: eq.status,
          commissionDate: eq.commissionDate,
          customFields: eq.customFields as Record<string, any> | null,
        },
        {
          id: approval.id,
          equipmentId: eq.id,
          type: approval.type,
          status: approval.status,
          proposedChanges: (approval.proposedData as Record<string, any> | null) || null,
        },
        decision,
        comment
      );

    return await prisma.$transaction(async (tx: any) => {
      // 1. Update equipment state if approved
      if (decision === 'APPROVE') {
        await tx.equipment.update({
          where: { id: updatedEquipment.id },
          data: {
            status: updatedEquipment.status,
            commissionDate: updatedEquipment.commissionDate,
            customFields: updatedEquipment.customFields || undefined,
          },
        });
      }

      // 2. Update approval request status
      const updatedApproval = await tx.equipmentApproval.update({
        where: { id: approvalId },
        data: {
          status: resolvedApprovalStatus,
          reviewerId,
          reviewedAt: new Date(),
          resolutionComment: comment?.trim() || null,
        },
      });

      // 3. Create notification for requester
      try {
        await tx.notification.create({
          data: {
            userId: approval.requesterId,
            title: notificationTitle,
            message: notificationMessage,
            type: 'APPROVAL_DECISION',
            link: `/eps/${approval.equipmentId}`,
          },
        });
      } catch (e) {
        console.warn('Non-blocking secondary notification error in approval resolution:', e);
      }

      return updatedApproval;
    });
  }
}
