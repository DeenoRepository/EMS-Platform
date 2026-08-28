import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения пользователей');
  }
}

const updateSchema = z.object({
  userId: z.string().min(1),
  roleIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_USERS_MANAGE)) return forbiddenResponse();

    const body = await req.json();
    const { userId, roleIds, isActive } = updateSchema.parse(body);

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    // Защита от самоблокировки
    const isSelf = userId === user.userId;
    if (isSelf && typeof isActive === 'boolean' && !isActive) {
      return NextResponse.json(
        { success: false, error: 'Запрещено деактивировать собственную учетную запись администратора' },
        { status: 400 }
      );
    }

    // Выполняем изменения атомарно в транзакции
    await prisma.$transaction(async (tx) => {
      // Обновление ролей если переданы
      if (Array.isArray(roleIds)) {
        if (isSelf) {
          // Проверяем, что администратор не лишает сам себя роли admin
          const adminRoles = await tx.role.findMany({ where: { name: 'admin' } });
          const adminRoleIds = adminRoles.map((r) => r.id);
          const retainsAdmin = roleIds.some((id: string) => adminRoleIds.includes(id));
          if (!retainsAdmin) {
            throw new Error('Запрещено удалять у себя роль администратора');
          }
        }

        await tx.userRole.deleteMany({ where: { userId } });
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId: string) => ({ userId, roleId })),
          });
        }
      }

      // Обновление активности
      if (typeof isActive === 'boolean') {
        await tx.user.update({
          where: { id: userId },
          data: { isActive },
        });
      }
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      changes: { roleIds, isActive },
    });

    return NextResponse.json({ success: true, message: 'Пользователь обновлен' });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Ошибка обновления пользователя' },
      { status: 400 }
    );
  }
}
