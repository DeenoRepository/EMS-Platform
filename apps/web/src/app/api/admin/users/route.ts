import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_USERS_MANAGE)) return forbiddenResponse();

    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      ldapLogin: u.ldapLogin,
      displayName: u.displayName,
      email: u.email,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      roles: u.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        displayName: ur.role.displayName,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка получения пользователей' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_USERS_MANAGE)) return forbiddenResponse();

    const body = await req.json();
    const { userId, roleIds, isActive } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Не указан userId' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    // Обновление ролей если переданы
    if (Array.isArray(roleIds)) {
      await prisma.userRole.deleteMany({ where: { userId } });
      if (roleIds.length > 0) {
        await prisma.userRole.createMany({
          data: roleIds.map((roleId: string) => ({ userId, roleId })),
        });
      }
    }

    // Обновление активности
    if (typeof isActive === 'boolean') {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive },
      });
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      changes: { roleIds, isActive },
    });

    return NextResponse.json({ success: true, message: 'Пользователь обновлен' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка обновления пользователя' }, { status: 500 });
  }
}
