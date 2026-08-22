import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { getSrmAdapter } from '@/lib/srm-providers';
import { SrmProviderType, SrmAuthType } from '@ems/database';

export const dynamic = 'force-dynamic';

/**
 * POST /api/srm/test-connection
 * Проверка соединения с внешним API (Jira, Redmine, GitLab, REST) до сохранения конфигурации
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [
    PERMISSIONS.ADMIN_SETTINGS_MANAGE,
    PERMISSIONS.SRM_SYNC_TRIGGER,
    PERMISSIONS.SRM_DASHBOARD_VIEW,
  ]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      providerType = 'JIRA',
      baseUrl,
      authType = 'BASIC',
      authConfig = {},
      queryConfig = {},
    }: {
      providerType: SrmProviderType;
      baseUrl: string;
      authType: SrmAuthType;
      authConfig: any;
      queryConfig: any;
    } = body;

    if (!baseUrl || !providerType) {
      return NextResponse.json(
        { success: false, error: 'Укажите тип провайдера и базовый URL сервера' },
        { status: 400 }
      );
    }

    const mockIntegration: any = {
      id: 'transient-test-connection',
      name: 'Transient Test Connection',
      providerType,
      baseUrl: baseUrl.trim(),
      authType,
      authConfig,
      queryConfig,
      isActive: true,
      isDefault: false,
      syncInterval: 60,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const adapter = getSrmAdapter(providerType);
    const testResult = await adapter.testConnection(mockIntegration);

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult,
    });
  } catch (error: any) {
    console.error('Ошибка в POST /api/srm/test-connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Ошибка при проверке подключения: ${error.message || error}`,
      },
      { status: 500 }
    );
  }
}
