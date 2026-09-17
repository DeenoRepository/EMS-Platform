import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string; roleId: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_USERS_MANAGE)) return forbiddenResponse();

    const { userId, roleId } = params;
    const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!targetRole) return NextResponse.json({ success: false, error: 'Роль не найдена' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      const assignment = await tx.userRole.findUnique({
        where: { userId_roleId: { userId, roleId } },
      });
      if (!assignment) throw new Error('Назначение роли не найдено');

      if (userId === user.userId && targetRole.name === 'admin') {
        throw new Error('Запрещено удалять у себя роль администратора');
      }

      await tx.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'UserRole',
      entityId: `${userId}:${roleId}`,
      changes: { userId, roleId, roleName: targetRole.name, action: 'REVOKE' },
    });

    return NextResponse.json({ success: true, message: 'Роль отозвана' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Запрещено удалять у себя роль администратора') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Назначение роли не найдено') {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Ошибка отзыва роли' }, { status: 500 });
  }
}
