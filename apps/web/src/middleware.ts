import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET is not set. Application cannot start without it. ' +
      'Set JWT_SECRET environment variable (minimum 32 characters).'
    );
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Setup-status cache — предотвращает DB/HTTP-запрос на каждый входящий запрос
// ---------------------------------------------------------------------------
// Setup-status cache — предотвращает лишний оверхед
// ---------------------------------------------------------------------------
let setupCache: { value: boolean; expiresAt: number } | null = null;
const SETUP_CACHE_TTL_MS = 2_000; // 2 секунды для мгновенной реакции на статус установки

async function isSetupCompleted(): Promise<boolean> {
  const now = Date.now();

  // Возвращаем кешированный результат если он свежий
  if (setupCache && setupCache.expiresAt > now) {
    return setupCache.value;
  }

  // Fail-closed: если статус установки подтвердить не удалось, считаем
  // систему установленной и оставляем мастер настройки заблокированным.
  // Обратное поведение открывало /api/setup/* анонимному пользователю при
  // любой недоступности status-эндпоинта.
  let isConfigured = true;

  try {
    const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/setup/status`;
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        // Internal middleware probes must not consume the public per-IP setup
        // quota shared by real browser requests and E2E login navigations.
        'x-forwarded-for': '127.0.0.2',
      },
    });
    if (res.ok) {
      const data = await res.json();
      isConfigured = data?.data?.isInstalled === true;
    }
  } catch {
    isConfigured = true;
  }

  setupCache = { value: isConfigured, expiresAt: now + SETUP_CACHE_TTL_MS };
  return isConfigured;
}

/** Сбросить кеш при успешном завершении setup (вызывается из /api/setup/execute) */
export function invalidateSetupCache(): void {
  setupCache = null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Исключаем статические ресурсы, favicon, внутренние роуты Next.js, картинки и шрифты
  if (
    pathname.startsWith('/_next') ||
    pathname === '/api/setup/status' ||
    pathname === '/api/system/health' ||
    pathname === '/api/system/maintenance' ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png' ||
    pathname === '/api/auth/login' ||
    pathname.startsWith('/api/files') ||
    /\.(png|jpg|jpeg|svg|webp|ico|gif|woff|woff2|ttf|eot|css|js)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 1.5. Проверка статуса первоначальной инициализации системы
  const setupDone = await isSetupCompleted();

  if (!setupDone) {
    // Если система еще НЕ настроена — все пользователи направляются в мастер настройки
    if (!pathname.startsWith('/setup') && !pathname.startsWith('/api/setup')) {
      return NextResponse.redirect(new URL('/setup', req.url));
    }
    return NextResponse.next();
  } else {
    // Если система УЖЕ настроена — блокируем мастер настройки и перенаправляем на /login
    if (pathname.startsWith('/setup')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/api/setup')) {
      return NextResponse.json(
        { success: false, error: 'Система уже настроена. Мастер первоначальной настройки заблокирован.' },
        { status: 403 }
      );
    }
  }

  // 2. Получение токена сессии (поддерживаем ems_token и ems_session)
  const token = req.cookies.get('ems_token')?.value || req.cookies.get('ems_session')?.value;

  // 3. Проверка токена
  let user: { userId: string; ldapLogin: string; displayName: string; roles: string[]; permissions: string[] } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      user = payload as unknown as { userId: string; ldapLogin: string; displayName: string; roles: string[]; permissions: string[] };
    } catch {
      user = null;
    }
  }

  // 4. Доступ к главной странице (/) и странице логина (/login)
  if (pathname === '/') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/', req.url));
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
