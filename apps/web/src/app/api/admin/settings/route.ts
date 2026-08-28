import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { invalidateSystemSettingsCache } from '@/lib/system-settings-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'admin-settings-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) return forbiddenResponse();

    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // Дополняем дефолтными значениями из env если в БД еще нет
    const providerUrl = settingsMap['SRM_PROVIDER_URL'] || settingsMap['JIRA_BASE_URL'] || process.env.JIRA_BASE_URL || '';
    const projectKey = settingsMap['SRM_PROJECT_KEY'] || settingsMap['JIRA_PROJECT_KEY'] || process.env.JIRA_PROJECT_KEY || 'EMS';
    const customFieldId = settingsMap['SRM_CUSTOM_FIELD_ID'] || settingsMap['JIRA_EQUIPMENT_CUSTOM_FIELD'] || process.env.JIRA_EQUIPMENT_CUSTOM_FIELD || 'customfield_10100';
    const providerType = settingsMap['SRM_PROVIDER_TYPE'] || (providerUrl ? 'JIRA' : 'JIRA');

    const defaultSettings = {
      APP_NAME: settingsMap['APP_NAME'] || process.env.NEXT_PUBLIC_APP_NAME || 'EMS — Equipment Management System',
      LDAP_URL: settingsMap['LDAP_URL'] || process.env.LDAP_URL || '',
      LDAP_SEARCH_BASE: settingsMap['LDAP_SEARCH_BASE'] || process.env.LDAP_SEARCH_BASE || 'dc=company,dc=local',
      SRM_PROVIDER_TYPE: providerType,
      SRM_PROVIDER_URL: providerUrl,
      SRM_PROJECT_KEY: projectKey,
      SRM_API_KEY: settingsMap['SRM_API_KEY'] || '',
      SRM_CUSTOM_FIELD_ID: customFieldId,
      // Backward compatibility aliases
      JIRA_BASE_URL: providerUrl,
      JIRA_PROJECT_KEY: projectKey,
      JIRA_EQUIPMENT_CUSTOM_FIELD: customFieldId,
    };

    return NextResponse.json({
      success: true,
      data: defaultSettings,
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка получения настроек' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'admin-settings-patch' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) return forbiddenResponse();

    const body = await req.json();

    const KEY_REGEX = /^[A-Z0-9_]{3,64}$/;
    for (const [key, value] of Object.entries(body)) {
      if (KEY_REGEX.test(key) && typeof value === 'string' && value.length <= 10000) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'SystemSetting',
      entityId: 'SYSTEM',
      changes: body,
    });

    // Invalidate in-memory cache so updates take effect immediately
    invalidateSystemSettingsCache();

    return NextResponse.json({ success: true, message: 'Настройки сохранены' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка сохранения настроек' }, { status: 500 });
  }
}
