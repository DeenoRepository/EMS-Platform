import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, hasPermission, hasAnyPermission } from '@ems/auth';
import { JwtUserPayload, PermissionCode } from '@ems/shared';

export async function getCurrentUser(req?: NextRequest): Promise<JwtUserPayload | null> {
  // 1. Попытка извлечь токен из cookie
  let token: string | undefined;

  try {
    const cookieStore = await cookies();
    token = cookieStore.get('ems_session')?.value;
  } catch {
    // Fallback if called in context where cookies() is not directly available
  }

  // 2. Попытка извлечь токен из заголовка Authorization
  if (!token && req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);
  if (!session) return null;

  try {
    const { getUserRolesAndPermissions } = await import('@ems/auth');
    const { roles, permissions } = await getUserRolesAndPermissions(session.userId);
    return {
      ...session,
      roles: roles && roles.length > 0 ? roles : session.roles || [],
      permissions: permissions && permissions.length > 0 ? permissions : session.permissions || [],
    };
  } catch {
    return session;
  }
}

export function unauthorizedResponse(message = 'Требуется авторизация') {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

/** Returns true when the user has either supported administrator role name. */
export function isAdminUser(user: Pick<JwtUserPayload, 'roles'>): boolean {
  return user.roles.includes('admin') || user.roles.includes('administrator');
}

export function forbiddenResponse(message = 'Недостаточно прав для выполнения операции') {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export async function requireAuth(
  req: NextRequest,
  requiredPermission?: PermissionCode | PermissionCode[]
): Promise<{ user: JwtUserPayload; errorResponse?: never } | { user?: never; errorResponse: NextResponse }> {
  // CSRF validation on mutating methods
  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host && !origin.includes('localhost')) {
          return { errorResponse: forbiddenResponse('Недопустимый источник запроса (CSRF protection)') };
        }
      } catch {
        // Ignore parsing errors for custom local environments
      }
    }
  }

  const user = await getCurrentUser(req);
  if (!user) {
    return { errorResponse: unauthorizedResponse() };
  }

  const isAdmin = isAdminUser(user);

  if (!isAdmin) {
    try {
      const { prisma } = await import('@ems/database');
      const maintSetting = await prisma.systemSetting.findUnique({
        where: { key: 'SYSTEM_MAINTENANCE_STATUS' },
      });
      if (maintSetting && maintSetting.value) {
        const maint = JSON.parse(maintSetting.value);
        if (maint.system?.enabled) {
          return {
            errorResponse: forbiddenResponse(
              maint.system.message || 'Платформа переведена в режим технического обслуживания. Доступ открыт только администраторам.'
            ),
          };
        }
      }
    } catch {
      // ignore
    }
  }

  if (requiredPermission) {
    if (Array.isArray(requiredPermission)) {
      if (!hasAnyPermission(user, requiredPermission)) {
        return { errorResponse: forbiddenResponse() };
      }
    } else {
      if (!hasPermission(user, requiredPermission)) {
        return { errorResponse: forbiddenResponse() };
      }
    }
  }

  return { user };
}

