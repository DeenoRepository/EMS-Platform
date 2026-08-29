import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { deleteFile } from '@/lib/storage';
import { logger } from '@/lib/logger';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'eps-document-delete' });
  if (rateLimitError) return rateLimitError;

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
    logger.error('Failed to delete EPS document', {
      endpoint: 'eps-document-delete',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Ошибка удаления документа' }, { status: 500 });
  }
}
