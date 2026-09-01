import type { JwtUserPayload } from '@ems/shared';
import type { NavChild, NavItemDef } from './sidebar-items';

type PermissionChecker = (permissionCode: string) => boolean;

export function canAccessNavItem(
  user: Pick<JwtUserPayload, 'roles'> | null,
  nav:
    | Pick<NavItemDef, 'permission' | 'permissions'>
    | Pick<NavChild, 'permission' | 'permissions'>
    | null
    | undefined,
  hasPermission: PermissionChecker,
): boolean {
  if (!nav) return true;
  if (user?.roles?.includes('admin') || user?.roles?.includes('administrator')) return true;
  if (nav.permissions && nav.permissions.length > 0) return nav.permissions.some(hasPermission);
  if (nav.permission) return hasPermission(nav.permission);
  return true;
}
