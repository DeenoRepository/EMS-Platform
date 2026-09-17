import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT) && !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_UPLOAD)) {
      return forbiddenResponse();
    }

    const { id } = params;

    const document = await prisma.document.findFirst({
      where: { id, deletedAt: null, equipment: { deletedAt: null } },
      include: {
        equipment: {
          select: { id: true, name: true, inventoryNumber: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Документ не найден' }, { status: 404 });
    }

    await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'EquipmentDocument',
      entityId: id,
      changes: {
        equipmentId: document.equipmentId,
        equipmentName: document.equipment?.name,
        fileName: document.originalName,
        docType: document.docType,
      },
    });

    return NextResponse.json({ success: true, message: 'Документ успешно удален' });
  } catch (error: any) {
    console.error('Ошибка удаления документа:', error);
    return NextResponse.json({ success: false, error: 'Ошибка удаления документа' }, { status: 500 });
  }
}
