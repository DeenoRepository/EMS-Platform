import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
    const defaultSettings = {
      JIRA_BASE_URL: settingsMap['JIRA_BASE_URL'] || process.env.JIRA_BASE_URL || 'https://jira.company.local',
      JIRA_PROJECT_KEY: settingsMap['JIRA_PROJECT_KEY'] || process.env.JIRA_PROJECT_KEY || 'EMS',
      JIRA_EQUIPMENT_CUSTOM_FIELD: settingsMap['JIRA_EQUIPMENT_CUSTOM_FIELD'] || process.env.JIRA_EQUIPMENT_CUSTOM_FIELD || 'customfield_10100',
      LDAP_URL: settingsMap['LDAP_URL'] || process.env.LDAP_URL || 'ldap://ldap.company.local:389',
      LDAP_SEARCH_BASE: settingsMap['LDAP_SEARCH_BASE'] || process.env.LDAP_SEARCH_BASE || 'ou=users,dc=company,dc=local',
      APP_NAME: settingsMap['APP_NAME'] || process.env.NEXT_PUBLIC_APP_NAME || 'EMS — Equipment Management System',
    };

    return NextResponse.json({
      success: true,
      data: defaultSettings,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка получения настроек' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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

    return NextResponse.json({ success: true, message: 'Настройки сохранены' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка сохранения настроек' }, { status: 500 });
  }
}
