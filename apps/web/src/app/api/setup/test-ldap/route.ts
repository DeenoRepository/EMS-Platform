import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { testLdapConnection } from '@ems/auth';
import { prisma } from '@ems/database';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getCurrentUser } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Rate limiting: max 10 attempts per minute
  const rateLimitError = enforceRateLimit(req, { limit: 10, windowMs: 60 * 1000, prefix: 'test-ldap' });
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
    const { url, bindDn, bindPassword, searchBase } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Укажите URL LDAP-сервера (например, ldap://ad.company.local:389)' },
        { status: 400 }
      );
    }

    const result = await testLdapConnection({
      url,
      bindDn: bindDn || undefined,
      bindPassword: bindPassword || undefined,
      searchBase: searchBase || undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result,
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка тестирования LDAP' },
      { status: 500 }
    );
  }
}
