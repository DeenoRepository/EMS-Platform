import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { getSrmAdapter } from '@/lib/srm-providers';
import { SrmProviderType, SrmAuthType } from '@ems/database';
import { validateOutboundUrl } from '@/lib/outbound-url';
import { logger } from '@/lib/logger';
import { toSafeErrorDetails } from '@/lib/safe-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/srm/test-connection
 * Проверка соединения с внешним API (Jira, Redmine, GitLab, REST) до сохранения конфигурации
 */
export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 10, windowMs: 60 * 1000, prefix: 'srm-test-conn' });
  if (rateLimitError) return rateLimitError;

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

    if (!baseUrl || !providerType || typeof baseUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Укажите тип провайдера и базовый URL сервера' },
        { status: 400 }
      );
    }

    const validatedUrl = await validateOutboundUrl(baseUrl, {
      allowedSchemes: ['http:', 'https:'],
    });
    if (!validatedUrl.ok) {
      return NextResponse.json({ success: false, error: validatedUrl.error }, { status: 400 });
    }

    const mockIntegration: any = {
      id: 'transient-test-connection',
      name: 'Transient Test Connection',
      providerType,
      baseUrl: validatedUrl.url.toString(),
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
  } catch (error: unknown) {
    const details = toSafeErrorDetails(error, 'Ошибка при проверке подключения');
    logger.error('Ошибка в POST /api/srm/test-connection', { error: details.logMessage });
    return NextResponse.json(
      {
        success: false,
        error: details.publicError,
      },
      { status: 500 }
    );
  }
}
