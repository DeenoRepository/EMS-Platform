import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, DocumentType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { saveFile, deleteFile, ALLOWED_EXTENSIONS } from '@/lib/storage';
import { getEquipmentDecimalNumber } from '@/lib/eps-helpers';
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
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { id: true, name: true, inventoryNumber: true, model: true, customFields: true },
    });
    if (!equipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    const formData = await req.formData();
    const rawDocType = formData.get('docType');
    const docType = (rawDocType || 'OTHER') as DocumentType;
    if (!Object.values(DocumentType).includes(docType)) {
      return NextResponse.json({ success: false, error: 'Недопустимый тип документа' }, { status: 400 });
    }
    const description = formData.get('description') as string | null;
    const applyToAllModel = formData.get('applyToAllModel') === 'true' || formData.get('applyToAllModel') === '1';
    const applyToAllDecimal = formData.get('applyToAllDecimal') === 'true' || formData.get('applyToAllDecimal') === '1';

    const rawFiles = [...formData.getAll('files'), ...formData.getAll('file')];
    const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'Файлы не прикреплены' }, { status: 400 });
    }

    const eqMap = new Map<string, typeof equipment>();
    eqMap.set(equipment.id, equipment);

    if (applyToAllModel && equipment.model && equipment.model.trim()) {
      const sameModel = await prisma.equipment.findMany({
        where: {
          deletedAt: null,
          model: { equals: equipment.model.trim(), mode: 'insensitive' },
        },
        select: { id: true, name: true, inventoryNumber: true, model: true, customFields: true },
      });
      sameModel.forEach((eq) => eqMap.set(eq.id, eq));
    }

    const dec = getEquipmentDecimalNumber(equipment.customFields);
    if (applyToAllDecimal && dec) {
      const sameDec = await prisma.equipment.findMany({
        where: {
          deletedAt: null,
          OR: [
            { customFields: { path: ['decimal_number'], string_contains: dec } },
            { customFields: { path: ['detsimalnyy_nomer'], string_contains: dec } },
            { customFields: { path: ['decimalNumber'], string_contains: dec } },
            { customFields: { path: ['децимальный номер'], string_contains: dec } },
          ],
        },
        select: { id: true, name: true, inventoryNumber: true, model: true, customFields: true },
      });
      sameDec.forEach((eq) => {
        if (getEquipmentDecimalNumber(eq.customFields).toLowerCase() === dec.toLowerCase()) {
          eqMap.set(eq.id, eq);
        }
      });
    }

    const targetEquipments = Array.from(eqMap.values());

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
    const savedPaths: string[] = [];
    try {
      for (const file of files) {
        const saved = await saveFile(file, 'documents');
        savedPaths.push(saved.filePath);

        for (const targetEq of targetEquipments) {
        const document = await prisma.document.create({
          data: {
            equipmentId: targetEq.id,
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
          changes: { equipmentId: targetEq.id, fileName: saved.originalName, docType },
        });

          createdDocuments.push(document);
        }
      }
    } catch (error) {
      if (createdDocuments.length > 0) {
        await prisma.document.deleteMany({ where: { id: { in: createdDocuments.map((document) => document.id) } } });
      }
      for (const filePath of savedPaths) deleteFile(filePath);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: createdDocuments.length === 1 ? createdDocuments[0] : createdDocuments,
      items: createdDocuments,
      count: createdDocuments.length,
      equipmentCount: targetEquipments.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка загрузки документа:', message);
    return NextResponse.json(
      { success: false, error: message || 'Ошибка загрузки документа' },
      { status: message.includes('Недопустимый') || message.includes('превышает') ? 400 : 500 }
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

    const document = await prisma.document.findFirst({ where: { id: documentId, equipmentId: params.id, deletedAt: null } });
    if (!document) {
      return NextResponse.json({ success: false, error: 'Документ не найден' }, { status: 404 });
    }

    await prisma.document.delete({ where: { id: documentId } });
    const otherDocsCount = await prisma.document.count({ where: { filePath: document.filePath } });
    if (otherDocsCount === 0) deleteFile(document.filePath);

    return NextResponse.json({ success: true, message: 'Документ удален' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Ошибка удаления документа', details: message }, { status: 500 });
  }
}
