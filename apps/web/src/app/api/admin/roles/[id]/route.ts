import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  displayName: z.string().optional(),
  description: z.string().nullable().optional(),
  permissionCodes: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_ROLES_MANAGE)) return forbiddenResponse();

    const { id } = params;
    const { displayName, description, permissionCodes } = updateSchema.parse(await req.json());

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ success: false, error: 'Роль не найдена' }, { status: 404 });
    }

    const updatedRole = await prisma.$transaction(async (tx) => {
      if (Array.isArray(permissionCodes)) {
        const uniqueCodes = [...new Set(permissionCodes)];
        const perms = await tx.permission.findMany({ where: { code: { in: uniqueCodes } } });
        if (perms.length !== uniqueCodes.length) {
          throw new Error('Передан неизвестный код разрешения');
        }

        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
        });
      }

      return tx.role.update({
        where: { id },
        data: {
          displayName: displayName !== undefined ? displayName.trim() : undefined,
          description: description !== undefined ? description?.trim() || null : undefined,
        },
      });
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
    const isValidationError = error?.message === 'Передан неизвестный код разрешения' || error instanceof z.ZodError;
    return NextResponse.json({ success: false, error: isValidationError ? 'Validation error' : 'Ошибка обновления роли' }, { status: isValidationError ? 400 : 500 });
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
