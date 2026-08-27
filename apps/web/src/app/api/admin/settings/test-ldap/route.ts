import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, testLdapConnection } from '@ems/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, {
    limit: 5,
    windowMs: 60 * 1000,
    prefix: 'admin-test-ldap',
  });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) return forbiddenResponse();

    const body = await req.json();
    const { ldapUrl, searchBase } = body;

    if (!ldapUrl || typeof ldapUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Укажите корректный LDAP URL (например, ldap://127.0.0.1:389)' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const bindDn = process.env.LDAP_BIND_DN;
    const bindPassword = process.env.LDAP_BIND_PASSWORD;

    const result = await testLdapConnection({
      url: ldapUrl.trim(),
      bindDn,
      bindPassword,
      searchBase: searchBase?.trim(),
    });

    const latencyMs = Date.now() - startTime;

    if (result.success) {
      return NextResponse.json({
        success: true,
        latencyMs,
        message: result.message || `Подключение к LDAP-серверу успешно установлено (${latencyMs} мс)`,
        details: {
          url: ldapUrl,
          searchBase: searchBase || 'Не указана',
          authMode: bindDn ? 'Сервисная учетная запись (Bind DN)' : 'Анонимное подключение',
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        latencyMs,
        error: result.error || 'Не удалось подключиться к LDAP-серверу',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка при проверке LDAP' },
      { status: 500 }
    );
  }
}
