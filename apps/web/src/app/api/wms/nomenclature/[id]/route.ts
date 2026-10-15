import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const nomenclature = await prisma.nomenclature.findUnique({
      where: { id: params.id },
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка получения номенклатуры:', message);
    return NextResponse.json({ success: false, error: 'Ошибка сервера', details: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Номенклатура не найдена' }, { status: 404 });
    }

    const formattedArticle = article?.trim() || null;
    if (formattedArticle && formattedArticle !== existing.article) {
      const duplicate = await prisma.nomenclature.findUnique({
        where: { article: formattedArticle },
      });
      if (duplicate && duplicate.id !== params.id) {
        return NextResponse.json(
          { success: false, error: `Номенклатура с артикулом "${formattedArticle}" уже существует (${duplicate.name})` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.nomenclature.update({
      where: { id: params.id },
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка обновления номенклатуры:', message);
    return NextResponse.json({ success: false, error: 'Ошибка при сохранении изменений', details: message }, { status: 500 });
  }
}

// DELETE /api/wms/nomenclature/[id] - Удаление номенклатуры
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    const nomenclature = await prisma.nomenclature.findUnique({
      where: { id: params.id },
      include: {
        stockItems: true,
      },
    });

    if (!nomenclature) {
      return NextResponse.json({ success: false, error: 'Номенклатура не найдена' }, { status: 404 });
    }

    const currentTotalStock = nomenclature.stockItems.reduce((acc, si) => acc + Number(si.quantity), 0);
    if (currentTotalStock > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Нельзя удалить номенклатуру с ненулевым фактическим остатком (${currentTotalStock} ${nomenclature.unit}). Сначала выполните списание или расход со склада.`,
        },
        { status: 400 }
      );
    }

    // Мягкое удаление (Soft Delete)
    await prisma.nomenclature.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Удаляем пустые нулевые строки из StockItem, чтобы не засорять реестр
    await prisma.stockItem.deleteMany({
      where: { nomenclatureId: params.id, quantity: 0 },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'Nomenclature',
      entityId: params.id,
      changes: {
        deletedName: nomenclature.name,
        article: nomenclature.article,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Номенклатура "${nomenclature.name}" успешно удалена из справочника`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка удаления номенклатуры:', message);
    return NextResponse.json({ success: false, error: 'Ошибка при удалении номенклатуры', details: message }, { status: 500 });
  }
}
