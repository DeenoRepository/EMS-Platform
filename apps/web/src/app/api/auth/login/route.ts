import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { authenticateLdap, signSessionToken, verifyPassword, fixKeyboardLayout, getUserRolesAndPermissions, logAuditEvent } from '@ems/auth';
import { JwtUserPayload } from '@ems/shared';
import { enforceRateLimit, getClientIp } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/safe-error';
import { logger } from '@/lib/logger';
import { getSystemSettings } from '@/lib/system-settings-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Укажите корректный логин (до 256 символов)').max(256, 'Укажите корректный логин (до 256 символов)'),
  password: z.string().min(1, 'Укажите корректный пароль').max(256, 'Укажите корректный пароль'),
});

export async function POST(req: NextRequest) {
  // 1. Rate limiting: max 10 attempts per minute per IP
  const rateLimitError = await enforceRateLimit(req, { limit: 10, windowMs: 60 * 1000, prefix: 'login' });
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();
    const { username, password } = loginSchema.parse(body);

    const trimmedUsername = username;
    let authenticatedUser: { id: string; ldapLogin: string; displayName: string; email?: string | null } | null = null;

    // 1. Попытка аутентификации через LDAP с учетом динамических настроек из БД
    const sysSettings = await getSystemSettings();
    const isLdapEnabled = sysSettings.LDAP_ENABLED === true || process.env.LDAP_ENABLED === 'true';
    const ldapUrl = sysSettings.LDAP_URL || process.env.LDAP_URL;
    const searchBase = sysSettings.LDAP_SEARCH_BASE || process.env.LDAP_SEARCH_BASE;

    logger.debug('[LOGIN ROUTE] Попытка входа', { username: trimmedUsername, isLdapEnabled, hasLdapUrl: !!ldapUrl, hasSearchBase: !!searchBase });

    let ldapResult = null;
    if (isLdapEnabled && ldapUrl) {
      try {
        ldapResult = await authenticateLdap(trimmedUsername, password || '', {
          ldapEnabled: true,
          ldapUrl,
          searchBase,
        });
        logger.debug('[LOGIN ROUTE] Результат authenticateLdap', { success: !!ldapResult });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.warn('LDAP authentication attempt failed', {
          username: trimmedUsername,
          error: errorMessage,
        });
      }
    }

    if (ldapResult) {
      // Пользователь аутентифицирован через LDAP. Находим или создаем запись в БД
      const cleanLogin = ldapResult.ldapLogin.trim().toLowerCase();
      const rawCleanLogin = trimmedUsername.trim().toLowerCase();
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { ldapLogin: cleanLogin },
            { ldapLogin: rawCleanLogin },
            { ldapLogin: { equals: cleanLogin, mode: 'insensitive' } },
            { ldapLogin: { equals: rawCleanLogin, mode: 'insensitive' } },
          ],
        },
      });
      logger.debug('[LOGIN ROUTE] Поиск пользователя в базе данных', { found: !!user });

      if (!user) {
        // Создаем пользователя и присваиваем базовую роль guest
        const defaultRole = await prisma.role.findUnique({
          where: { name: 'guest' },
        });

        user = await prisma.user.create({
          data: {
            ldapLogin: ldapResult.ldapLogin,
            displayName: ldapResult.displayName,
            email: ldapResult.email,
            roles: defaultRole
              ? {
                  create: {
                    roleId: defaultRole.id,
                  },
                }
              : undefined,
          },
        });
      } else {
        // Обновляем данные пользователя из LDAP
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            displayName: ldapResult.displayName,
            email: ldapResult.email || user.email,
            lastLoginAt: new Date(),
          },
        });
      }

      authenticatedUser = user;
    } else {
      // 2. Fallback: Проверка локального пользователя в БД (например, admin)
      let user = await prisma.user.findUnique({
        where: { ldapLogin: trimmedUsername },
      });

      if (!user && /[а-яёА-ЯЁ]/.test(trimmedUsername)) {
        const convertedUsername = fixKeyboardLayout(trimmedUsername);
        user = await prisma.user.findUnique({
          where: { ldapLogin: convertedUsername },
        });
      }

      if (user && user.passwordHash && password) {
        const isValid = verifyPassword(password, user.passwordHash);
        if (isValid) {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
          authenticatedUser = user;
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, error: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Проверяем активность
    const dbUser = await prisma.user.findUnique({ where: { id: authenticatedUser.id } });
    if (dbUser && !dbUser.isActive) {
      return NextResponse.json(
        { success: false, error: 'Учетная запись заблокирована администратором' },
        { status: 403 }
      );
    }

    // Получаем актуальные роли и права из БД
    const { roles, permissions } = await getUserRolesAndPermissions(authenticatedUser.id);

    // Проверка режима технического обслуживания (ТО) платформы
    try {
      const maintSetting = await prisma.systemSetting.findUnique({
        where: { key: 'SYSTEM_MAINTENANCE_STATUS' },
      });
      if (maintSetting && maintSetting.value) {
        const maintConfig = JSON.parse(maintSetting.value);
        if (maintConfig.system?.enabled) {
          const isAdmin = roles.includes('admin') || roles.includes('administrator');
          if (!isAdmin) {
            const untilStr = maintConfig.system.estimatedUntil
              ? ` (плановое завершение: ${maintConfig.system.estimatedUntil})`
              : '';
            const msg = maintConfig.system.message || 'В настоящее время на платформе проводятся регламентные технические работы.';
            return NextResponse.json(
              {
                success: false,
                error: `${msg}${untilStr} Вход в систему разрешен только администраторам.`,
                code: 'MAINTENANCE_MODE',
              },
              { status: 403 }
            );
          }
        }
      }
    } catch {
      // ignore
    }

    const payload: JwtUserPayload = {
      userId: authenticatedUser.id,
      ldapLogin: authenticatedUser.ldapLogin,
      displayName: authenticatedUser.displayName,
      email: authenticatedUser.email,
      roles,
      permissions,
    };

    const token = await signSessionToken(payload);

    // Аудит события входа. IP берём через getClientIp(): сырой
    // X-Forwarded-For частично контролируется клиентом и позволяет
    // подделать запись в audit trail.
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent');
    await logAuditEvent({
      userId: authenticatedUser.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: authenticatedUser.id,
      ipAddress: ip,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      data: { user: payload, token },
    });

    // Проверяем HTTPS: cookie secure устанавливается только если соединение реально идет по HTTPS
    const isHttps = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';

    // Устанавливаем cookie со сроком 8 часов (ems_session и ems_token)
    response.cookies.set({
      name: 'ems_session',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    response.cookies.set({
      name: 'ems_token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error: unknown) {
    logger.error('Login handler error', {
      error: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return safeErrorResponse(error, 'Внутренняя ошибка сервера');
  }
}
