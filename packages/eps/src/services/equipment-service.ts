import { prisma, Prisma, ApprovalStatus, ApprovalType, EquipmentStatus } from '@ems/database';
import { ResolveApprovalDto } from '../types';

export class EquipmentService {
  /**
   * Loads full equipment passport with read-only legacy maintenance and incident records.
   * Strictly guarantees NO external HTTP sync or MRO calculations are invoked.
   */
  static async getEquipmentPassport(equipmentId: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        tags: { include: { tag: true } },
        photos: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        documents: {
          include: { uploadedBy: { select: { displayName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        spareParts: {
          include: {
            nomenclature: {
              include: {
                stockItems: {
                  include: { warehouse: true },
                },
              },
            },
          },
        },
        maintenancePlans: {
          include: {
            checklist: true,
            schedules: {
              orderBy: { scheduledDate: 'desc' },
              take: 5,
            },
          },
        },
        createdBy: {
          select: { displayName: true, ldapLogin: true },
        },
        approvals: {
          include: {
            requester: { select: { displayName: true, ldapLogin: true } },
            reviewer: { select: { displayName: true, ldapLogin: true } },
          },
          orderBy: { createdAt: 'desc' },
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

    return {
      ...equipment,
      jiraIssues,
    };
  }

  /**
   * Resolves an approval request atomically within a database transaction.
   */
  static async resolveApproval(dto: ResolveApprovalDto) {
    const { approvalId, reviewerId, status, resolutionComment } = dto;

    const approval = await prisma.equipmentApproval.findUnique({
      where: { id: approvalId },
      include: { equipment: true },
    });

    if (!approval) throw new Error('Заявка на согласование не найдена');
    if (approval.status !== ApprovalStatus.PENDING && status !== ApprovalStatus.CANCELLED) {
      throw new Error('Решение по этой заявке уже было принято');
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Execute automatic equipment update if APPROVED
      if (status === ApprovalStatus.APPROVED && approval.equipment) {
        const proposed = (approval.proposedData as any) || {};

        if (approval.type === ApprovalType.EQUIPMENT_CREATE || approval.type === ApprovalType.COMMISSIONING) {
          const targetStatus =
            proposed.targetStatus && proposed.targetStatus in EquipmentStatus
              ? (proposed.targetStatus as EquipmentStatus)
              : EquipmentStatus.ACTIVE;

          await tx.equipment.update({
            where: { id: approval.equipment.id },
            data: {
              status: targetStatus,
              commissionDate:
                approval.equipment.commissionDate ||
                (proposed.commissionDate ? new Date(proposed.commissionDate) : new Date()),
              name: proposed.name ? proposed.name.trim() : undefined,
              inventoryNumber: proposed.inventoryNumber !== undefined ? (proposed.inventoryNumber?.trim() || null) : undefined,
              serialNumber: proposed.serialNumber !== undefined ? (proposed.serialNumber?.trim() || null) : undefined,
              manufacturer: proposed.manufacturer !== undefined ? (proposed.manufacturer?.trim() || null) : undefined,
              model: proposed.model !== undefined ? (proposed.model?.trim() || null) : undefined,
              location: proposed.location !== undefined ? (proposed.location?.trim() || null) : undefined,
              customFields: proposed.customFields !== undefined ? proposed.customFields : undefined,
            },
          });
        } else if (approval.type === ApprovalType.EQUIPMENT_UPDATE || approval.type === ApprovalType.PARAMETER_CHANGE) {
          const eqId = approval.equipment.id;
          const updatePayload: any = {};
          if (proposed.name) updatePayload.name = proposed.name.trim();
          if (proposed.inventoryNumber !== undefined) updatePayload.inventoryNumber = proposed.inventoryNumber?.trim() || null;
          if (proposed.serialNumber !== undefined) updatePayload.serialNumber = proposed.serialNumber?.trim() || null;
          if (proposed.manufacturer !== undefined) updatePayload.manufacturer = proposed.manufacturer?.trim() || null;
          if (proposed.model !== undefined) updatePayload.model = proposed.model?.trim() || null;
          if (proposed.location !== undefined) updatePayload.location = proposed.location?.trim() || null;
          if (proposed.status && proposed.status in EquipmentStatus) updatePayload.status = proposed.status;
          if (proposed.commissionDate) updatePayload.commissionDate = new Date(proposed.commissionDate);
          if (proposed.customFields) {
            const currentCustomFields = (approval.equipment.customFields as any) || {};
            updatePayload.customFields = { ...currentCustomFields, ...proposed.customFields };
          }

          if (Array.isArray(proposed.tagIds)) {
            await tx.equipmentTag.deleteMany({ where: { equipmentId: eqId } });
            if (proposed.tagIds.length > 0) {
              await tx.equipmentTag.createMany({
                data: proposed.tagIds.map((tagId: string) => ({ equipmentId: eqId, tagId })),
              });
            }
          }

          if (Object.keys(updatePayload).length > 0) {
            await tx.equipment.update({
              where: { id: eqId },
              data: updatePayload,
            });
          }
        } else if (approval.type === ApprovalType.DECOMMISSIONING || approval.type === ApprovalType.EQUIPMENT_DELETE) {
          await tx.equipment.update({
            where: { id: approval.equipment.id },
            data: { status: EquipmentStatus.DECOMMISSIONED },
          });
        } else if (approval.type === ApprovalType.STATUS_CHANGE && proposed.targetStatus && proposed.targetStatus in EquipmentStatus) {
          await tx.equipment.update({
            where: { id: approval.equipment.id },
            data: { status: proposed.targetStatus as EquipmentStatus },
          });
        }
      }

      // 2. Update approval record
      const updatedApproval = await tx.equipmentApproval.update({
        where: { id: approvalId },
        data: {
          status,
          reviewerId: status === ApprovalStatus.CANCELLED ? approval.reviewerId : reviewerId,
          reviewedAt: status === ApprovalStatus.CANCELLED ? approval.reviewedAt : new Date(),
          resolutionComment: resolutionComment?.trim() || null,
        },
        include: {
          equipment: {
            select: { id: true, name: true, inventoryNumber: true, status: true },
          },
          requester: {
            select: { id: true, displayName: true, ldapLogin: true },
          },
          reviewer: {
            select: { id: true, displayName: true, ldapLogin: true },
          },
        },
      });

      // 3. Send notification to requester
      try {
        if (approval.requesterId && (status === ApprovalStatus.APPROVED || status === ApprovalStatus.REJECTED)) {
          const eqName = approval.equipment?.name || approval.title;
          const isApproved = status === ApprovalStatus.APPROVED;

          await tx.notification.create({
            data: {
              userId: approval.requesterId,
              title: isApproved ? 'Паспорт оборудования согласован' : 'Заявка на согласование отклонена',
              message: isApproved
                ? `Заявка по оборудованию «${eqName}» успешно утверждена и опубликована в реестре.`
                : `Заявка по оборудованию «${eqName}» отклонена. Причина: "${resolutionComment || 'Замечания проверяющего'}".`,
              type: 'EQUIPMENT_CHANGED',
              link: approval.equipmentId ? `/eps/${approval.equipmentId}` : '/eps/approvals',
            },
          });
        }
      } catch (notifErr) {
        console.warn('Non-blocking secondary notification failure in approval resolution:', notifErr);
      }

      return updatedApproval;
    });
  }
}
