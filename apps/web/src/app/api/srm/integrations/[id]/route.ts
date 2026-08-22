import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { sanitizeAuthConfig, mergeAuthConfig } from '@/lib/srm-providers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
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

    return NextResponse.json({
      success: true,
      data: {
        ...integration,
        authConfig: sanitizeAuthConfig(integration.authConfig),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка получения данных интеграции' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, [PERMISSIONS.ADMIN_SETTINGS_MANAGE, PERMISSIONS.SRM_SYNC_TRIGGER]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
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

    // Сохраняем существующие секреты при передаче маскированного плейсхолдера
    const resolvedAuthConfig = authConfig !== undefined ? mergeAuthConfig(authConfig, existing.authConfig) : existing.authConfig;

    const updated = await prisma.srmIntegration.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        providerType: providerType || existing.providerType,
        baseUrl: baseUrl !== undefined ? baseUrl.trim() : existing.baseUrl,
        authType: authType || existing.authType,
        authConfig: resolvedAuthConfig,
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
      data: {
        ...updated,
        authConfig: sanitizeAuthConfig(updated.authConfig),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка обновления подключения' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, [PERMISSIONS.ADMIN_SETTINGS_MANAGE, PERMISSIONS.SRM_SYNC_TRIGGER]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
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
