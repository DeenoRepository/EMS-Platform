import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, DocumentType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { saveFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'eps-documents-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_VIEW) &&
      !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_UPLOAD) &&
      !isAdminUser(user)
    ) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const docType = searchParams.get('docType')?.trim() || '';
    const equipmentId = searchParams.get('equipmentId')?.trim() || '';

    const where: any = {};

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
            ],
          },
        },
      ];
    }

    const [items, total, allDocs] = await Promise.all([
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
      prisma.document.findMany({
        select: {
          docType: true,
          fileSize: true,
        },
      }),
    ]);

    // Calculate aggregated stats across all documents in database
    let totalSize = 0;
    const byTypeCounts: Record<string, number> = {
      SCHEMA: 0,
      MANUAL: 0,
      CERTIFICATE: 0,
      PASSPORT: 0,
      ACT: 0,
      OTHER: 0,
    };

    allDocs.forEach((d) => {
      totalSize += d.fileSize || 0;
      if (byTypeCounts[d.docType] !== undefined) {
        byTypeCounts[d.docType]++;
      } else {
        byTypeCounts[d.docType] = 1;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        stats: {
          totalDocuments: allDocs.length,
          totalSizeBytes: totalSize,
          byTypeCounts,
        },
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения реестра документов');
  }
}

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'eps-documents-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_UPLOAD)) return forbiddenResponse();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const equipmentId = formData.get('equipmentId') as string | null;
    const docType = (formData.get('docType') as DocumentType) || 'OTHER';
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Файл не прикреплен' }, { status: 400 });
    }

    if (!equipmentId) {
      return NextResponse.json(
        { success: false, error: 'Необходимо указать единицу оборудования' },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    const saved = await saveFile(file, 'documents');

    const document = await prisma.document.create({
      data: {
        equipmentId,
        fileName: saved.fileName,
        originalName: saved.originalName,
        filePath: saved.filePath,
        fileType: saved.fileType,
        fileSize: saved.fileSize,
        docType,
        description: description?.trim() || null,
        uploadedById: user.userId,
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            inventoryNumber: true,
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
        equipmentId,
        equipmentName: equipment.name,
        fileName: saved.originalName,
        docType,
      },
    });

    return NextResponse.json({ success: true, data: document });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Недопустимый') || message.includes('превышает')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return safeErrorResponse(error, 'Ошибка сохранения документа');
  }
}
