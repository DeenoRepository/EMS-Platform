import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { deleteFile } from '@/lib/storage';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT) && !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_UPLOAD)) {
      return forbiddenResponse();
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        equipment: {
          select: { id: true, name: true, inventoryNumber: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Документ не найден' }, { status: 404 });
    }

    deleteFile(document.filePath);
    await prisma.document.delete({ where: { id } });

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
  } catch (error: unknown) {
    console.error('Ошибка удаления документа:', error);
    return NextResponse.json({ success: false, error: 'Ошибка удаления документа' }, { status: 500 });
  }
}
