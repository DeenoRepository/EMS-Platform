import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { testLdapConnection } from '@ems/auth';
import { prisma } from '@ems/database';
import { enforceRateLimit } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/safe-error';
import { getCurrentUser } from '@/lib/auth-guard';
import { validateOutboundUrl } from '@/lib/outbound-url';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Rate limiting: max 10 attempts per minute
  const rateLimitError = await enforceRateLimit(req, { limit: 10, windowMs: 60 * 1000, prefix: 'test-ldap' });
  if (rateLimitError) return rateLimitError;

  // 2. SSRF Protection: If already installed, require admin auth
  const rootDir = process.cwd();
  const fileInstalled = fs.existsSync(path.join(rootDir, '.installed')) || fs.existsSync(path.join(rootDir, '..', '..', '.installed'));

  if (fileInstalled) {
    const user = await getCurrentUser(req);
    if (!user || !user.roles.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Диагностика LDAP доступна только авторизованному администратору.' },
        { status: 403 }
      );
    }
  }

  try {
    const body = await req.json();
    const { url, bindDn, bindPassword, searchBase, searchFilter, testLogin, testPassword } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Укажите URL LDAP-сервера (например, ldap://ad.company.local:389)' },
        { status: 400 }
      );
    }

    const validatedUrl = await validateOutboundUrl(url, {
      allowedSchemes: ['ldap:', 'ldaps:'],
    });
    if (!validatedUrl.ok) {
      return NextResponse.json({ success: false, error: validatedUrl.error }, { status: 400 });
    }

    const result = await testLdapConnection({
      url: validatedUrl.url.toString(),
      bindDn: bindDn || undefined,
      bindPassword: bindPassword || undefined,
      searchBase: searchBase || undefined,
      searchFilter: searchFilter || undefined,
      testLogin: testLogin ? String(testLogin).trim() : undefined,
      testPassword: testPassword ? String(testPassword) : undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result,
        user: result.user,
        message: result.message || 'Подключение к LDAP успешно установлено!',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Не удалось подключиться к LDAP-серверу',
        data: result,
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка тестирования LDAP');
  }
}
