import { prisma } from '@ems/database';
import { JwtUserPayload } from '@ems/shared';

export async function getUserRolesAndPermissions(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return { roles: [], permissions: [] };
  }

  const rolesSet = new Set<string>();
  const permissionsSet = new Set<string>();

  for (const userRole of user.roles) {
    rolesSet.add(userRole.role.name);
    for (const rp of userRole.role.permissions) {
      permissionsSet.add(rp.permission.code);
    }
  }

  return {
    roles: Array.from(rolesSet),
    permissions: Array.from(permissionsSet),
  };
}

export function hasPermission(user: JwtUserPayload | null | undefined, permissionCode: string): boolean {
  if (!user) return false;
  if (user.roles?.includes('admin') || user.roles?.includes('administrator')) return true; // Суперпользователь имеет полный доступ
  return user.permissions?.includes(permissionCode) || false;
}

export function hasAnyPermission(user: JwtUserPayload | null | undefined, permissionCodes: string[]): boolean {
  if (!user) return false;
  if (user.roles?.includes('admin') || user.roles?.includes('administrator')) return true;
  return permissionCodes.some((code) => user.permissions?.includes(code)) || false;
}

export function hasAllPermissions(user: JwtUserPayload | null | undefined, permissionCodes: string[]): boolean {
  if (!user) return false;
  if (user.roles?.includes('admin') || user.roles?.includes('administrator')) return true;
  return permissionCodes.every((code) => user.permissions?.includes(code)) || false;
}
