import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, SrmProviderType, SrmAuthType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { getAvailableSrmProviders } from '@/lib/srm-providers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.SRM_DASHBOARD_VIEW)) return forbiddenResponse();

    const [integrations, providerTemplates] = await Promise.all([
      prisma.srmIntegration.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { issues: true },
          },
        },
      }),
      getAvailableSrmProviders(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        integrations,
        providerTemplates,
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения списка интеграций SRM:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения списка подключений' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
      isActive = true,
      isDefault = false,
      syncInterval = 60,
    }: {
      name: string;
      providerType: SrmProviderType;
      baseUrl: string;
      authType: SrmAuthType;
      authConfig: any;
      queryConfig: any;
      mappingConfig?: any;
      isActive?: boolean;
      isDefault?: boolean;
      syncInterval?: number;
    } = body;

    if (!name || !baseUrl || !providerType) {
      return NextResponse.json(
        { success: false, error: 'Укажите название, тип провайдера и базовый URL' },
        { status: 400 }
      );
    }

    if (isDefault) {
      // Сбрасываем другие дефолтные подключения
      await prisma.srmIntegration.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const integration = await prisma.srmIntegration.create({
      data: {
        name: name.trim(),
        providerType,
        baseUrl: baseUrl.trim(),
        authType: authType || 'BASIC',
        authConfig: authConfig || {},
        queryConfig: queryConfig || {},
        mappingConfig: mappingConfig || null,
        isActive: Boolean(isActive),
        isDefault: Boolean(isDefault),
        syncInterval: Number(syncInterval) || 60,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Подключение успешно создано',
      data: integration,
    });
  } catch (error: any) {
    console.error('Ошибка создания подключения SRM:', error);
    return NextResponse.json(
      { success: false, error: `Ошибка создания интеграции: ${error.message || error}` },
      { status: 500 }
    );
  }
}
