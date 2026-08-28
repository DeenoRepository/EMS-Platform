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
    if (!hasPermission(user, PERMISSIONS.ADMIN_ROLES_MANAGE)) return forbiddenResponse();

    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedRoles = roles.map((r) => ({
      id: r.id,
      name: r.name,
      displayName: r.displayName,
      description: r.description,
      isSystem: r.isSystem,
      userCount: r._count.users,
      permissions: r.permissions.map((p) => p.permission.code),
    }));

    return NextResponse.json({
      success: true,
      data: formattedRoles,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения ролей');
  }
}

const createSchema = z.object({
  name: z.string().min(1, 'Укажите системное имя'),
  displayName: z.string().min(1, 'Укажите отображаемое название'),
  description: z.string().optional(),
  permissionCodes: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_ROLES_MANAGE)) return forbiddenResponse();

    const body = await req.json();
    const { name, displayName, description, permissionCodes } = createSchema.parse(body);

    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '_');

    // Проверяем уникальность
    const existing = await prisma.role.findUnique({ where: { name: cleanName } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Роль с таким системным именем уже существует' }, { status: 400 });
    }

    // Находим ID прав
    const perms = await prisma.permission.findMany({
      where: { code: { in: permissionCodes || [] } },
    });

    const newRole = await prisma.role.create({
      data: {
        name: cleanName,
        displayName: displayName.trim(),
        description: description?.trim() || null,
        isSystem: false,
        permissions: {
          create: perms.map((p) => ({ permissionId: p.id })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'Role',
      entityId: newRole.id,
      changes: { name: cleanName, displayName },
    });

    return NextResponse.json({
      success: true,
      data: newRole,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return safeErrorResponse(error, 'Ошибка создания роли');
  }
}
