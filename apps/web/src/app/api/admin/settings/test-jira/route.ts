import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) return forbiddenResponse();

    const body = await req.json();
    const { jiraBaseUrl, projectKey, customFieldId } = body;

    if (!jiraBaseUrl || typeof jiraBaseUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Укажите корректный Jira Base URL (например, http://localhost:8080)' },
        { status: 400 }
      );
    }

    const trimmedUrl = jiraBaseUrl.trim().replace(/\/+$/, '');
    const startTime = Date.now();

    try {
      const email = process.env.JIRA_EMAIL || process.env.JIRA_USER_EMAIL || '';
      const apiToken = process.env.JIRA_API_TOKEN || '';
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (email && apiToken) {
        headers['Authorization'] = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Attempt server info check
      const res = await fetch(`${trimmedUrl}/rest/api/2/serverInfo`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      }).catch(async () => {
        // Fallback to root endpoint check
        return await fetch(trimmedUrl, {
          method: 'HEAD',
          headers,
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!res.ok && res.status >= 500) {
        return NextResponse.json({
          success: false,
          latencyMs,
          error: `Сервер Jira ответил кодом ошибки HTTP ${res.status} (${res.statusText})`,
        });
      }

      let serverTitle = 'Jira Service Desk / Data Center';
      try {
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const json = await res.json();
          if (json.serverTitle) serverTitle = json.serverTitle;
          if (json.version) serverTitle += ` (v${json.version})`;
        }
      } catch {
        // ignore body parse
      }

      return NextResponse.json({
        success: true,
        latencyMs,
        message: `Подключение к Jira успешно проверено (${latencyMs} мс)`,
        details: {
          url: trimmedUrl,
          serverTitle,
          projectKey: projectKey || 'Не указан',
          customFieldId: customFieldId || 'Не указан',
          authProvided: Boolean(email && apiToken),
        },
      });
    } catch (fetchErr: any) {
      const latencyMs = Date.now() - startTime;
      let errorMsg = fetchErr.message || 'Ошибка подключения к Jira';
      if (fetchErr.name === 'AbortError' || errorMsg.includes('timeout')) {
        errorMsg = `Превышено время ожидания ответа от Jira (${trimmedUrl}). Проверьте сетевую доступность.`;
      } else if (errorMsg.includes('ECONNREFUSED')) {
        errorMsg = `Сервер Jira по адресу ${trimmedUrl} недоступен (соединение отклонено).`;
      }

      return NextResponse.json({
        success: false,
        latencyMs,
        error: errorMsg,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка при проверке Jira' },
      { status: 500 }
    );
  }
}
