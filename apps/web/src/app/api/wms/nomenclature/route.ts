import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'wms-nomenclature-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const categoryId = searchParams.get('categoryId')?.trim() || '';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const where: any = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { article: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.nomenclature.findMany({
      where,
      include: {
        category: true,
        stockItems: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
    });

    // Обогащаем суммарным остатком по всем складам
    const enriched = items.map((item) => {
      const totalStock = item.stockItems.reduce((sum, si) => sum + Number(si.quantity), 0);
      return {
        ...item,
        totalStock,
        isLowStock: item.minStock !== null && totalStock <= Number(item.minStock),
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    console.error('Ошибка получения номенклатуры:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения номенклатуры' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'wms-nomenclature-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && !hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { name, article, unit, categoryId, description, minStock } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Наименование ТМЦ обязательно' }, { status: 400 });
    }

    const formattedArticle = article?.trim() || null;
    if (formattedArticle) {
      const existing = await prisma.nomenclature.findUnique({ where: { article: formattedArticle } });
      if (existing) {
        return NextResponse.json({ success: false, error: `Номенклатура с артикулом "${formattedArticle}" уже существует (${existing.name})` }, { status: 400 });
      }
    }

    const nomenclature = await prisma.nomenclature.create({
      data: {
        name: name.trim(),
        article: formattedArticle,
        unit: unit?.trim() || 'шт',
        categoryId: categoryId || null,
        description: description?.trim() || null,
        minStock: minStock !== undefined && minStock !== null && minStock !== '' ? Number(minStock) : null,
      },
      include: {
        category: true,
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'Nomenclature',
      entityId: nomenclature.id,
      changes: { name: nomenclature.name, article: nomenclature.article, unit: nomenclature.unit },
    });

    return NextResponse.json({ success: true, data: nomenclature });
  } catch (error: unknown) {
    console.error('Ошибка создания номенклатуры:', error);
    return NextResponse.json({ success: false, error: 'Ошибка создания номенклатуры' }, { status: 500 });
  }
}
