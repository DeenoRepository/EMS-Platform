import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { getSrmAdapter } from '@/lib/srm-providers';
import { SrmProviderType, SrmAuthType } from '@ems/database';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateOutboundUrl } from '@/lib/outbound-url';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, {
    limit: 5,
    windowMs: 60 * 1000,
    prefix: 'admin-test-srm',
  });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) return forbiddenResponse();

    const body = await req.json();
    const {
      providerType = 'JIRA',
      providerUrl,
      jiraBaseUrl, // legacy alias
      projectKey,
      apiKey,
      customFieldId,
    } = body;

    const urlValue = providerUrl || jiraBaseUrl || '';
    const url = typeof urlValue === 'string' ? urlValue.trim() : '';

    if (providerType === 'DISABLED') {
      return NextResponse.json({
        success: true,
        latencyMs: 0,
        message: 'Внешняя интеграция отключена. Модуль SRM работает в автономном режиме.',
      });
    }

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Укажите URL сервера внешней системы' },
        { status: 400 }
      );
    }

    const validatedUrl = await validateOutboundUrl(url, {
      allowedSchemes: ['http:', 'https:'],
    });
    if (!validatedUrl.ok) {
      return NextResponse.json({ success: false, error: validatedUrl.error }, { status: 400 });
    }

    // Map UI provider type to SrmProviderType
    let internalProviderType: SrmProviderType = 'JIRA';
    let authType: SrmAuthType = 'NONE';
    let authConfig: any = {};
    let queryConfig: any = {};

    switch (providerType) {
      case 'REDMINE':
        internalProviderType = 'REDMINE';
        authType = 'API_KEY';
        authConfig = { apiKey: typeof apiKey === 'string' ? apiKey : '' };
        queryConfig = { projectId: projectKey || '' };
        break;

      case 'GITLAB':
      case 'GITLAB_ISSUES':
        internalProviderType = 'GITLAB_ISSUES';
        authType = 'BEARER';
        authConfig = { token: typeof apiKey === 'string' ? apiKey : '' };
        queryConfig = { projectPath: projectKey || '' };
        break;

      case 'REST':
      case 'GENERIC_REST':
      case 'REST_GENERIC':
        internalProviderType = 'REST_GENERIC';
        authType = apiKey ? 'BEARER' : 'NONE';
        authConfig = apiKey ? { token: apiKey } : {};
        queryConfig = { endpoint: projectKey || '/issues' };
        break;

      case 'JIRA':
      default:
        internalProviderType = 'JIRA';
        authType = 'BASIC';
        const jiraEmail = typeof body.authUser === 'string'
          ? body.authUser
          : typeof body.email === 'string'
            ? body.email
            : '';
        const jiraToken = typeof apiKey === 'string' ? apiKey : '';
        authConfig = { username: jiraEmail, apiToken: jiraToken, token: jiraToken, password: jiraToken };
        queryConfig = { projectKey: projectKey || 'EMS' };
        break;
    }

    const mockIntegration: any = {
      id: 'transient-settings-test',
      name: `Проверка ${providerType}`,
      providerType: internalProviderType,
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

    const adapter = getSrmAdapter(internalProviderType);
    const startTime = Date.now();
    const result = await adapter.testConnection(mockIntegration);
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: result.success,
      latencyMs,
      message: result.message,
      error: result.success ? undefined : result.message,
      diagnostics: result.diagnostics,
      details: {
        providerType,
        url: validatedUrl.url.toString(),
        projectKey: projectKey || '—',
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка проверки подключения к внешней системе');
  }
}
