import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_ROLES_MANAGE)) return forbiddenResponse();

    const { id } = params;
    const body = await req.json();
    const { displayName, description, permissionCodes } = body;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ success: false, error: 'Роль не найдена' }, { status: 404 });
    }

    // Если передан список кодов прав, обновляем связи
    if (Array.isArray(permissionCodes)) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
      });

      // Удаляем старые связи и вставляем новые
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
      });
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        displayName: displayName !== undefined ? displayName.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'Role',
      entityId: id,
      changes: { displayName, permissionCount: permissionCodes?.length },
    });

    return NextResponse.json({ success: true, data: updatedRole });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка обновления роли' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_ROLES_MANAGE)) return forbiddenResponse();

    const { id } = params;
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ success: false, error: 'Роль не найдена' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ success: false, error: 'Системные роли (admin, guest) нельзя удалять' }, { status: 400 });
    }

    await prisma.role.delete({ where: { id } });

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'Role',
      entityId: id,
      changes: { deletedRole: role.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка удаления роли' }, { status: 500 });
  }
}
