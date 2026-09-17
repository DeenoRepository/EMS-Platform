import { JwtUserPayload, PERMISSIONS } from '@ems/shared';

export function isWmsAdmin(user: JwtUserPayload): boolean {
  return Boolean(
    user.roles?.includes('admin') ||
      user.roles?.includes('administrator') ||
      user.permissions?.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions?.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE)
  );
}

export function canManageWarehouse(user: JwtUserPayload, responsibleUserId: string | null | undefined): boolean {
  return isWmsAdmin(user) || responsibleUserId === user.userId;
}
