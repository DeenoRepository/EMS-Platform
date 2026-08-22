import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { authenticateLdap, signSessionToken, verifyPassword, getUserRolesAndPermissions, logAuditEvent } from '@ems/auth';
import { JwtUserPayload } from '@ems/shared';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Укажите корректный логин (до 256 символов)').max(256, 'Укажите корректный логин (до 256 символов)'),
  password: z.string().min(1, 'Укажите корректный пароль').max(256, 'Укажите корректный пароль'),
});

export async function POST(req: NextRequest) {
  // 1. Rate limiting: max 10 attempts per minute per IP
  const rateLimitError = enforceRateLimit(req, { limit: 10, windowMs: 60 * 1000, prefix: 'login' });
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();
    const { username, password } = loginSchema.parse(body);

    const trimmedUsername = username;
    let authenticatedUser: { id: string; ldapLogin: string; displayName: string; email?: string | null } | null = null;

    // 1. Попытка аутентификации через LDAP (если включен)
    const ldapResult = await authenticateLdap(trimmedUsername, password || '');

    if (ldapResult) {
      // Пользователь аутентифицирован через LDAP. Находим или создаем запись в БД
      let user = await prisma.user.findUnique({
        where: { ldapLogin: ldapResult.ldapLogin },
      });

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
      const user = await prisma.user.findUnique({
        where: { ldapLogin: trimmedUsername },
      });

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

    const payload: JwtUserPayload = {
      userId: authenticatedUser.id,
      ldapLogin: authenticatedUser.ldapLogin,
      displayName: authenticatedUser.displayName,
      email: authenticatedUser.email,
      roles,
      permissions,
    };

    const token = await signSessionToken(payload);

    // Аудит события входа
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
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

    // Устанавливаем cookie со сроком 8 часов
    response.cookies.set({
      name: 'ems_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера', details: message }, { status: 500 });
  }
}
