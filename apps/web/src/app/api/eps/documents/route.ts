import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, DocumentType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { saveFile, ALLOWED_EXTENSIONS } from '@/lib/storage';
import { getEquipmentDecimalNumber } from '@/lib/eps-helpers';
import { matchFileNameWithDatabase } from '@/lib/eps-document-matcher';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_VIEW) &&
      !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_UPLOAD) &&
      !user.roles.includes('admin')
    ) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const docType = searchParams.get('docType')?.trim() || '';
    const equipmentId = searchParams.get('equipmentId')?.trim() || '';

    const where: any = { deletedAt: null, equipment: { deletedAt: null } };

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (docType && docType in DocumentType) {
      where.docType = docType as DocumentType;
    }

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          equipment: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { inventoryNumber: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
              { manufacturer: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
              { customFields: { path: ['decimal_number'], string_contains: search } },
              { customFields: { path: ['detsimalnyy_nomer'], string_contains: search } },
              { customFields: { path: ['decimalNumber'], string_contains: search } },
              { customFields: { path: ['децимальный номер'], string_contains: search } },
            ],
          },
        },
      ];
    }

    const [items, total, statsGroup, statsSum] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              inventoryNumber: true,
              manufacturer: true,
              model: true,
              location: true,
              status: true,
              customFields: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              displayName: true,
              ldapLogin: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.document.count({ where }),
      prisma.document.groupBy({
        by: ['docType'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.document.aggregate({
        where: { deletedAt: null },
        _sum: { fileSize: true },
        _count: { _all: true },
      }),
    ]);

    // Calculate aggregated stats across all documents in database
    const byTypeCounts: Record<string, number> = {
      SCHEMA: 0,
      MANUAL: 0,
      CERTIFICATE: 0,
      PASSPORT: 0,
      ACT: 0,
      OTHER: 0,
    };

    statsGroup.forEach((g) => {
      byTypeCounts[g.docType] = g._count._all;
    });

    const totalDocuments = statsSum._count._all || 0;
    const totalSizeBytes = statsSum._sum.fileSize || 0;

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        stats: {
          totalDocuments,
          totalSizeBytes,
          byTypeCounts,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка получения списка документов EPS:', message);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения реестра документов', details: message },
      { status: 500 }
    );
  }
}

async function resolveTargetEquipments(options: {
  bindingMode: string;
  equipmentId?: string | null;
  model?: string | null;
  decimalNumber?: string | null;
  applyToAllModel?: boolean;
  applyToAllDecimal?: boolean;
}): Promise<{ id: string; name: string; inventoryNumber: string | null; model: string | null }[]> {
  const { bindingMode, equipmentId, model, decimalNumber, applyToAllModel, applyToAllDecimal } = options;

  // 1. Привязка по децимальному номеру
  if (bindingMode === 'DECIMAL' || bindingMode === 'DECIMAL_NUMBER') {
    const dec = decimalNumber?.trim();
    if (!dec) return [];
    const candidates = await prisma.equipment.findMany({
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
    return candidates.filter((eq) => {
      const eqDec = getEquipmentDecimalNumber(eq.customFields);
      return (
        eqDec.toLowerCase() === dec.toLowerCase() ||
        eqDec.replace(/[^a-zа-я0-9]/gi, '') === dec.replace(/[^a-zа-я0-9]/gi, '')
      );
    });
  }

  // 2. Привязка по модели
  if (bindingMode === 'MODEL') {
    if (!model) return [];
    return prisma.equipment.findMany({
      where: {
        deletedAt: null,
        model: { equals: model, mode: 'insensitive' },
      },
      select: { id: true, name: true, inventoryNumber: true, model: true },
    });
  }

  // 3. Привязка по конкретной единице оборудования
  if (bindingMode === 'EQUIPMENT' || equipmentId) {
    if (!equipmentId) return [];
    const initialEq = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true, name: true, inventoryNumber: true, model: true, customFields: true },
    });
    if (!initialEq) return [];

    const eqMap = new Map<string, typeof initialEq>();
    eqMap.set(initialEq.id, initialEq);

    if (applyToAllModel && initialEq.model && initialEq.model.trim()) {
      const sameModel = await prisma.equipment.findMany({
        where: {
          deletedAt: null,
          model: { equals: initialEq.model.trim(), mode: 'insensitive' },
        },
        select: { id: true, name: true, inventoryNumber: true, model: true, customFields: true },
      });
      sameModel.forEach((eq) => eqMap.set(eq.id, eq));
    }

    const initialDec = getEquipmentDecimalNumber(initialEq.customFields);
    if (applyToAllDecimal && initialDec) {
      const sameDec = await prisma.equipment.findMany({
        where: {
          deletedAt: null,
          OR: [
            { customFields: { path: ['decimal_number'], string_contains: initialDec } },
            { customFields: { path: ['detsimalnyy_nomer'], string_contains: initialDec } },
            { customFields: { path: ['decimalNumber'], string_contains: initialDec } },
            { customFields: { path: ['децимальный номер'], string_contains: initialDec } },
          ],
        },
        select: { id: true, name: true, inventoryNumber: true, model: true, customFields: true },
      });
      sameDec.forEach((eq) => {
        if (getEquipmentDecimalNumber(eq.customFields).toLowerCase() === initialDec.toLowerCase()) {
          eqMap.set(eq.id, eq);
        }
      });
    }

    return Array.from(eqMap.values());
  }

  return [];
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_UPLOAD)) return forbiddenResponse();

    const formData = await req.formData();
    const bindingMode = (formData.get('bindingMode') as string) || (formData.get('linkScope') as string) || 'EQUIPMENT';
    const equipmentId = formData.get('equipmentId') as string | null;
    const model = (formData.get('model') as string | null)?.trim() || null;
    const decimalNumber = (formData.get('decimalNumber') as string | null)?.trim() || null;
    const applyToAllModel = formData.get('applyToAllModel') === 'true' || formData.get('applyToAllModel') === '1';
    const applyToAllDecimal = formData.get('applyToAllDecimal') === 'true' || formData.get('applyToAllDecimal') === '1';
    const rawDocType = formData.get('docType');
    const docType = (rawDocType || 'OTHER') as DocumentType;
    if (!Object.values(DocumentType).includes(docType)) {
      return NextResponse.json({ success: false, error: 'Недопустимый тип документа' }, { status: 400 });
    }
    const description = formData.get('description') as string | null;

    const filesMetadataRaw = formData.get('filesMetadata') as string | null;
    let filesMetadata: Array<{
      fileName: string;
      docType?: string;
      bindingMode?: string;
      equipmentId?: string | null;
      model?: string | null;
      decimalNumber?: string | null;
      applyToAllModel?: boolean;
      applyToAllDecimal?: boolean;
      description?: string | null;
    }> = [];
    if (filesMetadataRaw) {
      try {
        filesMetadata = JSON.parse(filesMetadataRaw);
      } catch {}
    }

    const isPerFileMode = filesMetadata.length > 0 || bindingMode === 'AUTO';

    const rawFiles = [...formData.getAll('files'), ...formData.getAll('file')];
    const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'Файлы не прикреплены' }, { status: 400 });
    }

    let targetEquipments: { id: string; name: string; inventoryNumber: string | null; model: string | null }[] = [];

    if (!isPerFileMode) {
      if (bindingMode === 'MODEL' || (model && !equipmentId)) {
        if (!model) {
          return NextResponse.json({ success: false, error: 'Необходимо указать модель оборудования' }, { status: 400 });
        }
        targetEquipments = await resolveTargetEquipments({ bindingMode: 'MODEL', model });
        if (targetEquipments.length === 0) {
          return NextResponse.json(
            { success: false, error: `В реестре не найдено оборудования с моделью «${model}»` },
            { status: 404 }
          );
        }
      } else if (bindingMode === 'DECIMAL' || bindingMode === 'DECIMAL_NUMBER' || (decimalNumber && !equipmentId)) {
        if (!decimalNumber) {
          return NextResponse.json({ success: false, error: 'Необходимо указать децимальный номер' }, { status: 400 });
        }
        targetEquipments = await resolveTargetEquipments({ bindingMode: 'DECIMAL', decimalNumber });
        if (targetEquipments.length === 0) {
          return NextResponse.json(
            { success: false, error: `В реестре не найдено оборудования с децимальным номером «${decimalNumber}»` },
            { status: 404 }
          );
        }
      } else {
        if (!equipmentId) {
          return NextResponse.json(
            { success: false, error: 'Необходимо указать единицу оборудования, модель или децимальный номер' },
            { status: 400 }
          );
        }

        targetEquipments = await resolveTargetEquipments({
          bindingMode: 'EQUIPMENT',
          equipmentId,
          applyToAllModel,
          applyToAllDecimal,
        });
        if (targetEquipments.length === 0) {
          return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
        }
      }
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
    const allBoundEquipmentIds = new Set<string>();

    for (const file of files) {
      const saved = await saveFile(file, 'documents');

      let fileTargets: { id: string; name: string; inventoryNumber: string | null; model: string | null }[] = [];
      let fileDocType = docType;
      let fileDesc = description?.trim() || null;
      let fileBindingMode = bindingMode;
      let fileModel: string | null = null;
      let fileDecimal: string | null = null;

      const fileMeta = filesMetadata.find(
        (m) => m.fileName === file.name || m.fileName.toLowerCase() === file.name.toLowerCase()
      );

      if (fileMeta) {
        if (fileMeta.docType && Object.values(DocumentType).includes(fileMeta.docType as DocumentType)) {
          fileDocType = fileMeta.docType as DocumentType;
        }
        if (fileMeta.description !== undefined) {
          fileDesc = fileMeta.description?.trim() || null;
        }
        if (fileMeta.bindingMode) {
          fileBindingMode = fileMeta.bindingMode;
          fileModel = fileMeta.model?.trim() || null;
          fileDecimal = fileMeta.decimalNumber?.trim() || null;
          fileTargets = await resolveTargetEquipments({
            bindingMode: fileMeta.bindingMode,
            equipmentId: fileMeta.equipmentId,
            model: fileMeta.model,
            decimalNumber: fileMeta.decimalNumber,
            applyToAllModel: fileMeta.applyToAllModel,
            applyToAllDecimal: fileMeta.applyToAllDecimal,
          });
        }
      } else if (bindingMode === 'AUTO') {
        const autoMatch = await matchFileNameWithDatabase(file.name, prisma);
        if (autoMatch.detectedDocType && Object.values(DocumentType).includes(autoMatch.detectedDocType as DocumentType)) {
          fileDocType = autoMatch.detectedDocType as DocumentType;
        }
        if (autoMatch.suggestedBindingMode) {
          fileBindingMode = autoMatch.suggestedBindingMode;
          fileModel = autoMatch.matchedModel;
          fileDecimal = autoMatch.matchedDecimalNumber;
          fileTargets = await resolveTargetEquipments({
            bindingMode: autoMatch.suggestedBindingMode,
            equipmentId: autoMatch.matchedEquipment?.id,
            model: autoMatch.matchedModel,
            decimalNumber: autoMatch.matchedDecimalNumber,
          });
        }
      }

      // Если файл загружается не в режиме индивидуального сопоставления, используем общие целевые единицы
      if (fileTargets.length === 0 && !isPerFileMode && targetEquipments.length > 0) {
        fileTargets = targetEquipments;
        fileModel = model;
        fileDecimal = decimalNumber;
      }

      for (const targetEq of fileTargets) {
        allBoundEquipmentIds.add(targetEq.id);
        const document = await prisma.document.create({
          data: {
            equipmentId: targetEq.id,
            fileName: saved.fileName,
            originalName: saved.originalName,
            filePath: saved.filePath,
            fileType: saved.fileType,
            fileSize: saved.fileSize,
            docType: fileDocType,
            description: fileDesc,
            uploadedById: user.userId,
          },
          include: {
            equipment: {
              select: {
                id: true,
                name: true,
                inventoryNumber: true,
                model: true,
              },
            },
            uploadedBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        });

        await logAuditEvent({
          userId: user.userId,
          action: 'CREATE',
          entityType: 'EquipmentDocument',
          entityId: document.id,
          changes: {
            equipmentId: targetEq.id,
            equipmentName: targetEq.name,
            fileName: saved.originalName,
            docType: fileDocType,
            bindingMode: fileBindingMode,
            model: fileModel || targetEq.model,
            decimalNumber: fileDecimal,
          },
        });

        createdDocuments.push(document);
      }
    }

    return NextResponse.json({
      success: true,
      data: createdDocuments.length === 1 ? createdDocuments[0] : createdDocuments,
      items: createdDocuments,
      count: createdDocuments.length,
      equipmentCount: targetEquipments.length,
      allEquipmentCount: allBoundEquipmentIds.size,
      bindingMode,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка создания документа:', message);
    return NextResponse.json(
      { success: false, error: message || 'Ошибка сохранения документа', details: message },
      { status: message.includes('Недопустимый') || message.includes('превышает') ? 400 : 500 }
    );
  }
}
