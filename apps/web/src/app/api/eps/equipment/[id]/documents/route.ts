import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, DocumentType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { saveFile, deleteFile, ALLOWED_EXTENSIONS } from '@/lib/storage';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_UPLOAD)) return forbiddenResponse();

    const { id } = params;
    const equipment = await prisma.equipment.findUnique({ where: { id } });
    if (!equipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    const formData = await req.formData();
    const docType = (formData.get('docType') as DocumentType) || 'OTHER';
    const description = formData.get('description') as string | null;

    const rawFiles = [...formData.getAll('files'), ...formData.getAll('file')];
    const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'Файлы не прикреплены' }, { status: 400 });
    }

    // Предварительная валидация расширений и размеров всех файлов перед сохранением
    for (const file of files) {
      const ext = path.extname(file.name || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.documents.has(ext)) {
        return NextResponse.json(
          {
            success: false,
            error: `Недопустимый формат файла «${file.name}». Разрешены только: ${Array.from(ALLOWED_EXTENSIONS.documents).join(', ')}`,
          },
          { status: 400 }
        );
      }
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: `Файл «${file.name}» превышает допустимый лимит 50 МБ` },
          { status: 400 }
        );
      }
    }

    const createdDocuments = [];
    for (const file of files) {
      const saved = await saveFile(file, 'documents');

      const document = await prisma.document.create({
        data: {
          equipmentId: id,
          fileName: saved.fileName,
          originalName: saved.originalName,
          filePath: saved.filePath,
          fileType: saved.fileType,
          fileSize: saved.fileSize,
          docType,
          description: description?.trim() || null,
          uploadedById: user.userId,
        },
      });

      await logAuditEvent({
        userId: user.userId,
        action: 'CREATE',
        entityType: 'EquipmentDocument',
        entityId: document.id,
        changes: { equipmentId: id, fileName: saved.originalName, docType },
      });

      createdDocuments.push(document);
    }

    return NextResponse.json({
      success: true,
      data: createdDocuments.length === 1 ? createdDocuments[0] : createdDocuments,
      items: createdDocuments,
      count: createdDocuments.length,
    });
  } catch (error: any) {
    console.error('Ошибка загрузки документа:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка загрузки документа' },
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
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'Не указан documentId' }, { status: 400 });
    }

    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json({ success: false, error: 'Документ не найден' }, { status: 404 });
    }

    deleteFile(document.filePath);
    await prisma.document.delete({ where: { id: documentId } });

    return NextResponse.json({ success: true, message: 'Документ удален' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка удаления документа' }, { status: 500 });
  }
}
