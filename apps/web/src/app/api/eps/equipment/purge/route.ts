import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { deleteFile } from '@/lib/storage';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function canPurgeDatabase(user: any): boolean {
  if (!user) return false;
  return hasPermission(user, PERMISSIONS.EPS_DATABASE_PURGE);
}

// GET: Получение статистики позиций перед очисткой (требуется разрешение eps.database.purge)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!canPurgeDatabase(user)) return forbiddenResponse();

    const [equipmentCount, documentsCount, photosCount] = await Promise.all([
      prisma.equipment.count(),
      prisma.document.count(),
      prisma.photo.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        equipmentCount,
        documentsCount,
        photosCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка получения статистики', details: message },
      { status: 500 }
    );
  }
}

// DELETE / POST: Полная очистка всех позиций оборудования из базы данных EPS (требуется разрешение eps.database.purge)
export async function DELETE(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, {
    limit: 5,
    windowMs: 60 * 1000,
    prefix: 'eps-purge',
  });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!canPurgeDatabase(user)) return forbiddenResponse();

    // Проверка слова-подтверждения
    let confirmation = '';
    try {
      const body = await req.json();
      confirmation = body?.confirmation || '';
    } catch {
      confirmation = req.nextUrl.searchParams.get('confirmation') || '';
    }

    const normalizedConfirmation = confirmation.trim().toUpperCase();
    if (normalizedConfirmation !== 'УДАЛИТЬ' && normalizedConfirmation !== 'DELETE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Для выполнения операции требуется подтверждение словом «УДАЛИТЬ»',
        },
        { status: 400 }
      );
    }

    // 1. Получаем список путей физических файлов перед очисткой записей
    const [docs, photos, totalCount] = await Promise.all([
      prisma.document.findMany({ select: { filePath: true } }),
      prisma.photo.findMany({ select: { filePath: true } }),
      prisma.equipment.count(),
    ]);

    for (const doc of docs) {
      if (doc.filePath) deleteFile(doc.filePath);
    }
    for (const photo of photos) {
      if (photo.filePath) deleteFile(photo.filePath);
    }

    // 2. Атомарное каскадное удаление всех данных оборудования в транзакции
    await prisma.$transaction(async (tx) => {
      await tx.equipmentTag.deleteMany();
      await tx.document.deleteMany();
      await tx.photo.deleteMany();
      await tx.equipmentSparePart.deleteMany();
      await tx.equipmentApproval.deleteMany();
      await tx.maintenanceSchedule.deleteMany();
      await tx.maintenancePlan.deleteMany();

      await tx.stockOperationItem.updateMany({
        where: { equipmentId: { not: null } },
        data: { equipmentId: null },
      });

      await tx.jiraIssueCache.updateMany({
        where: { equipmentId: { not: null } },
        data: { equipmentId: null },
      });

      await tx.equipment.deleteMany();
    });

    // 3. Запись в системный журнал аудита
    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'EquipmentPurge',
      entityId: 'all',
      changes: {
        deletedEquipmentCount: totalCount,
        deletedDocumentsCount: docs.length,
        deletedPhotosCount: photos.length,
        purgedBy: user.ldapLogin || user.displayName,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Все позиции оборудования (${totalCount} шт.) успешно удалены из базы данных модуля EPS`,
      deletedCount: totalCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка при очистке базы данных оборудования', details: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return DELETE(req);
}
