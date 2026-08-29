import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasSecureSrmWebhookAuth, sanitizeAuthConfig, mergeAuthConfig } from '@/lib/srm-providers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'srm-integration-id-get' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const integration = await prisma.srmIntegration.findUnique({
      where: { id: (await params).id },
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
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка получения данных интеграции' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'srm-integration-id-put' });
  if (rateLimitError) return rateLimitError;

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

    const existing = await prisma.srmIntegration.findUnique({ where: { id: (await params).id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Подключение не найдено' }, { status: 404 });
    }

    if (isDefault) {
      await prisma.srmIntegration.updateMany({
        where: { id: { not: (await params).id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Сохраняем существующие секреты при передаче маскированного плейсхолдера
    const resolvedAuthConfig = authConfig !== undefined ? mergeAuthConfig(authConfig, existing.authConfig as any) : existing.authConfig;
    const resolvedIsActive = isActive !== undefined ? Boolean(isActive) : existing.isActive;

    if (resolvedIsActive && !hasSecureSrmWebhookAuth(resolvedAuthConfig)) {
      return NextResponse.json(
        { success: false, error: 'Для активной интеграции укажите секрет вебхука или явно разрешите unsigned webhooks' },
        { status: 400 }
      );
    }

    const updated = await prisma.srmIntegration.update({
      where: { id: (await params).id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        providerType: providerType || existing.providerType,
        baseUrl: baseUrl !== undefined ? baseUrl.trim() : existing.baseUrl,
        authType: authType || existing.authType,
        authConfig: resolvedAuthConfig as any,
        queryConfig: queryConfig !== undefined ? queryConfig : existing.queryConfig,
        mappingConfig: mappingConfig !== undefined ? mappingConfig : existing.mappingConfig,
        isActive: resolvedIsActive,
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
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка сохранения настроек интеграции' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitError = await enforceRateLimit(req, { limit: 15, windowMs: 60 * 1000, prefix: 'srm-integration-id-delete' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.ADMIN_SETTINGS_MANAGE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const integrationId = (await params).id;

    // Удаляем связанные кэшированные инциденты
    await prisma.jiraIssueCache.deleteMany({
      where: { integrationId },
    });

    await prisma.srmIntegration.delete({
      where: { id: integrationId },
    });

    return NextResponse.json({
      success: true,
      message: 'Подключение SRM успешно удалено',
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка удаления подключения' }, { status: 500 });
  }
}
