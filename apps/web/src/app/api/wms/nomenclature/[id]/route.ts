import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'wms-nomencl-id-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const nomenclature = await prisma.nomenclature.findUnique({
      where: { id: (await params).id },
      include: {
        category: true,
        stockItems: {
          include: {
            warehouse: true,
            cell: {
              include: {
                zone: true,
              },
            },
          },
        },
      },
    });

    if (!nomenclature) {
      return NextResponse.json({ success: false, error: 'Номенклатура не найдена' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: nomenclature });
  } catch (error: unknown) {
    console.error('Ошибка получения номенклатуры:', error);
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'wms-nomencl-id-put' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && !user.roles?.includes('admin')) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { name, article, unit, categoryId, description, minStock } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Наименование ТМЦ обязательно' }, { status: 400 });
    }

    const existing = await prisma.nomenclature.findUnique({
      where: { id: (await params).id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Номенклатура не найдена' }, { status: 404 });
    }

    const formattedArticle = article?.trim() || null;
    if (formattedArticle && formattedArticle !== existing.article) {
      const duplicate = await prisma.nomenclature.findUnique({
        where: { article: formattedArticle },
      });
      if (duplicate && duplicate.id !== (await params).id) {
        return NextResponse.json(
          { success: false, error: `Номенклатура с артикулом "${formattedArticle}" уже существует (${duplicate.name})` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.nomenclature.update({
      where: { id: (await params).id },
      data: {
        name: name.trim(),
        article: formattedArticle,
        unit: unit?.trim() || existing.unit,
        categoryId: categoryId !== undefined ? (categoryId || null) : existing.categoryId,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        minStock: minStock !== undefined && minStock !== null && minStock !== '' ? Number(minStock) : null,
      },
      include: {
        category: true,
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'Nomenclature',
      entityId: updated.id,
      changes: {
        name: { from: existing.name, to: updated.name },
        article: { from: existing.article, to: updated.article },
        unit: { from: existing.unit, to: updated.unit },
        description: { from: existing.description, to: updated.description },
        minStock: { from: existing.minStock, to: updated.minStock },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Ошибка обновления номенклатуры:', error);
    return NextResponse.json({ success: false, error: 'Ошибка при сохранении изменений' }, { status: 500 });
  }
}
