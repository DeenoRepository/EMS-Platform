import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { authenticateLdap, signSessionToken, verifyPassword, getUserRolesAndPermissions, logAuditEvent } from '@ems/auth';
import { JwtUserPayload } from '@ems/shared';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ success: false, error: 'Укажите логин' }, { status: 400 });
    }

    const trimmedUsername = username.trim();
    let authenticatedUser: { id: string; ldapLogin: string; displayName: string; email?: string | null } | null = null;

    // 1. Попытка аутентификации через LDAP (если включен)
    const ldapResult = await authenticateLdap(trimmedUsername, password || '');

    if (ldapResult) {
      // Пользователь аутентифицирован через LDAP. Находим или создаем запись в БД
      let user = await prisma.user.findUnique({
        where: { ldapLogin: ldapResult.ldapLogin },
      });

      if (!user) {
        // Создаем пользователя и присваиваем базовую роль guest (или admin если первый)
        const userCount = await prisma.user.count();
        const defaultRole = await prisma.role.findUnique({
          where: { name: userCount === 0 ? 'admin' : 'guest' },
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
      data: { user: payload },
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
  } catch (error: any) {
    console.error('Ошибка логина:', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
