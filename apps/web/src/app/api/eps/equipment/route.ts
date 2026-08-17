import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, EquipmentStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status') as EquipmentStatus | null;
    const tagId = searchParams.get('tagId');
    const manufacturer = searchParams.get('manufacturer');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (manufacturer) {
      where.manufacturer = { contains: manufacturer, mode: 'insensitive' };
    }

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { inventoryNumber: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items, statusGroup] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
        include: {
          tags: {
            include: { tag: true },
          },
          photos: {
            where: { isPrimary: true },
            take: 1,
          },
          _count: {
            select: {
              documents: true,
              photos: true,
              maintenancePlans: true,
              spareParts: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.equipment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const statusCounts = {
      total: 0,
      active: 0,
      underRepair: 0,
      inStorage: 0,
      decommissioned: 0,
    };

    statusGroup.forEach((g) => {
      const count = g._count.status;
      statusCounts.total += count;
      if (g.status === 'ACTIVE') statusCounts.active = count;
      else if (g.status === 'UNDER_REPAIR') statusCounts.underRepair = count;
      else if (g.status === 'IN_STORAGE') statusCounts.inStorage = count;
      else if (g.status === 'DECOMMISSIONED') statusCounts.decommissioned = count;
    });

    const formatted = items.map((item) => ({
      id: item.id,
      name: item.name,
      inventoryNumber: item.inventoryNumber,
      serialNumber: item.serialNumber,
      manufacturer: item.manufacturer,
      model: item.model,
      location: item.location,
      status: item.status,
      commissionDate: item.commissionDate,
      primaryPhoto: item.photos[0]?.filePath || null,
      tags: item.tags.map((t) => t.tag),
      counts: item._count,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items: formatted,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        statusCounts,
      },
    });
  } catch (error: any) {
    console.error('Ошибка /api/eps/equipment:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения реестра оборудования' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_CREATE)) return forbiddenResponse();

    const body = await req.json();
    const {
      name,
      inventoryNumber,
      serialNumber,
      manufacturer,
      model,
      location,
      status,
      commissionDate,
      customFields,
      tagIds,
    } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Укажите наименование оборудования' }, { status: 400 });
    }

    // Проверка уникальности инвентарного номера если указан
    if (inventoryNumber) {
      const existing = await prisma.equipment.findUnique({
        where: { inventoryNumber: inventoryNumber.trim() },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Оборудование с таким инвентарным номером уже зарегистрировано' },
          { status: 400 }
        );
      }
    }

    const newEquipment = await prisma.equipment.create({
      data: {
        name: name.trim(),
        inventoryNumber: inventoryNumber?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        manufacturer: manufacturer?.trim() || null,
        model: model?.trim() || null,
        location: location?.trim() || null,
        status: status || 'ACTIVE',
        commissionDate: commissionDate ? new Date(commissionDate) : null,
        customFields: customFields || {},
        createdById: user.userId,
        tags: Array.isArray(tagIds) && tagIds.length > 0
          ? {
              create: tagIds.map((tagId: string) => ({ tagId })),
            }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    // Аудит события
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'Equipment',
      entityId: newEquipment.id,
      changes: {
        name: newEquipment.name,
        inventoryNumber: newEquipment.inventoryNumber,
        status: newEquipment.status,
      },
    });

    return NextResponse.json({ success: true, data: newEquipment });
  } catch (error: any) {
    console.error('Ошибка создания оборудования:', error);
    return NextResponse.json({ success: false, error: 'Ошибка сохранения оборудования' }, { status: 500 });
  }
}
