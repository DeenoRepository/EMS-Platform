import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Критическая ошибка безопасности: Переменная окружения JWT_SECRET обязательна в production-режиме.');
    }
    return new TextEncoder().encode('ems-default-dev-secret-jwt-key-not-for-production-min-32-chars-long');
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Исключаем статические ресурсы, favicon, внутренние роуты Next.js, картинки и шрифты
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/setup') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png' ||
    pathname === '/api/auth/login' ||
    pathname.startsWith('/api/files') ||
    /\.(png|jpg|jpeg|svg|webp|ico|gif|woff|woff2|ttf|eot|css|js)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Получение токена сессии
  const token = req.cookies.get('ems_session')?.value;

  // 3. Проверка токена
  let user: { userId: string; ldapLogin: string; displayName: string; roles: string[]; permissions: string[] } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      user = payload as any;
    } catch {
      user = null;
    }
  }

  // 4. Доступ к главной странице (/) и странице логина (/login)
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/eps', req.url));
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/eps', req.url));
    }
    return NextResponse.next();
  }

  // 5. Неавторизованный пользователь для защищенных роутов
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 6. Защита панели администрирования (/admin/*)
  if (pathname.startsWith('/admin')) {
    const isAdmin = user.roles.includes('admin');
    const hasAdminPerm = user.permissions.some((p) => p.startsWith('admin.'));

    if (!isAdmin && !hasAdminPerm) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ success: false, error: 'Недостаточно прав администратора' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/eps', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (.png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
