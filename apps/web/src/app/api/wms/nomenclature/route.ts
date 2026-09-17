import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { parseStockQuantity } from '@/lib/wms-validation';
import { isWmsAdmin } from '@/lib/wms-access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const categoryId = searchParams.get('categoryId')?.trim() || '';
    const limit = Math.min(5000, Math.max(1, parseInt(searchParams.get('limit') || '1000', 10)));

    const admin = isWmsAdmin(user);
    const accessibleWarehouseIds = admin
      ? null
      : (await prisma.warehouse.findMany({
          where: { responsibleUserId: user.userId, isActive: true, deletedAt: null },
          select: { id: true },
        })).map((warehouse) => warehouse.id);

    const where: any = { deletedAt: null };
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
      const visibleStockItems = admin
        ? item.stockItems
        : item.stockItems.filter((stockItem) => accessibleWarehouseIds?.includes(stockItem.warehouseId) ?? false);
      const totalStock = visibleStockItems.reduce((sum, si) => sum + Number(si.quantity), 0);
      return {
        ...item,
        stockItems: visibleStockItems,
        totalStock,
        isLowStock: item.minStock !== null && totalStock <= Number(item.minStock),
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error('Ошибка получения номенклатуры:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения номенклатуры' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [PERMISSIONS.WMS_NOMENCLATURE_MANAGE, PERMISSIONS.WMS_OPERATIONS_CREATE]);
    if (auth.errorResponse) return auth.errorResponse;
    const { user } = auth;

    const body = await req.json();
    const { name, article, unit, categoryId, description, minStock } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Наименование ТМЦ обязательно' }, { status: 400 });
    }

    const formattedArticle = article?.trim() || null;
    const normalizedMinStock = minStock === undefined || minStock === null || minStock === ''
      ? null
      : parseStockQuantity(minStock);
    if (minStock !== undefined && minStock !== null && minStock !== '' && normalizedMinStock === null) {
      return NextResponse.json({ success: false, error: 'Минимальный остаток должен быть конечным неотрицательным числом' }, { status: 400 });
    }
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
        minStock: normalizedMinStock,
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
  } catch (error: any) {
    console.error('Ошибка создания номенклатуры:', error);
    return NextResponse.json({ success: false, error: 'Ошибка создания номенклатуры' }, { status: 500 });
  }
}
