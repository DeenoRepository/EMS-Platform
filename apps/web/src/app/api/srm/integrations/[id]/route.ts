import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.SRM_DASHBOARD_VIEW)) return forbiddenResponse();

    const integration = await prisma.srmIntegration.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { issues: true },
        },
      },
    });

    if (!integration) {
      return NextResponse.json({ success: false, error: 'Подключение не найдено' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: integration });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка получения данных интеграции' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const {
      name,
      providerType,
      baseUrl,
      authType,
      authConfig,
      queryConfig,
      mappingConfig,
      isActive,
      isDefault,
      syncInterval,
    } = body;

    const existing = await prisma.srmIntegration.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Подключение не найдено' }, { status: 404 });
    }

    if (isDefault) {
      await prisma.srmIntegration.updateMany({
        where: { id: { not: params.id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.srmIntegration.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        providerType: providerType || existing.providerType,
        baseUrl: baseUrl !== undefined ? baseUrl.trim() : existing.baseUrl,
        authType: authType || existing.authType,
        authConfig: authConfig !== undefined ? authConfig : existing.authConfig,
        queryConfig: queryConfig !== undefined ? queryConfig : existing.queryConfig,
        mappingConfig: mappingConfig !== undefined ? mappingConfig : existing.mappingConfig,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
        syncInterval: syncInterval !== undefined ? Number(syncInterval) : existing.syncInterval,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Настройки подключения обновлены',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка обновления подключения' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    await prisma.srmIntegration.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Подключение удалено',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка удаления подключения' }, { status: 500 });
  }
}
