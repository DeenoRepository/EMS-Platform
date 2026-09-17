import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { saveFile, deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT)) return forbiddenResponse();

    const { id } = params;
    const equipment = await prisma.equipment.findFirst({ where: { id, deletedAt: null } });
    if (!equipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const isPrimary = formData.get('isPrimary') === 'true';

    if (!file) {
      return NextResponse.json({ success: false, error: 'Файл не прикреплен' }, { status: 400 });
    }

    // Сохраняем файл на диск
    const saved = await saveFile(file, 'photos');

    let photo;
    try {
      photo = await prisma.$transaction(async (tx) => {
        if (isPrimary) {
          await tx.photo.updateMany({
            where: { equipmentId: id, deletedAt: null },
            data: { isPrimary: false },
          });
        }
        return tx.photo.create({
          data: {
            equipmentId: id,
            fileName: saved.fileName,
            originalName: saved.originalName,
            filePath: saved.filePath,
            isPrimary,
            uploadedById: user.userId,
          },
        });
      });
    } catch (error) {
      deleteFile(saved.filePath);
      throw error;
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'EquipmentPhoto',
      entityId: photo.id,
      changes: { equipmentId: id, fileName: saved.originalName },
    });

    return NextResponse.json({ success: true, data: photo });
  } catch (error: any) {
    console.error('Ошибка загрузки фото:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка загрузки фото' },
      { status: error.message?.includes('Недопустимый') || error.message?.includes('превышает') ? 400 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const { id } = params;
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json({ success: false, error: 'Не указан photoId' }, { status: 400 });
    }

    const photo = await prisma.photo.findFirst({
      where: { id: photoId, equipmentId: id, deletedAt: null, equipment: { deletedAt: null } },
    });
    if (!photo) {
      return NextResponse.json({ success: false, error: 'Фото не найдено' }, { status: 404 });
    }

    await prisma.photo.update({ where: { id: photoId }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true, message: 'Фото удалено' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка удаления фото' }, { status: 500 });
  }
}
