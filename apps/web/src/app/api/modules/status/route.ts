import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export interface ModuleStatusMap {
  eps: boolean;
  wms: boolean;
  srm: boolean;
  mro: boolean;
}

const DEFAULT_MODULE_STATUS: ModuleStatusMap = {
  eps: true,
  wms: true,
  srm: true,
  mro: true,
};

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'SYSTEM_MODULES_STATUS' },
    });

    let status: ModuleStatusMap = { ...DEFAULT_MODULE_STATUS };
    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        status = { ...DEFAULT_MODULE_STATUS, ...parsed };
      } catch {
        // ignore parse error, use default
      }
    }

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Ошибка получения статуса модулей' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { moduleId, enabled } = body;

    if (!moduleId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Некорректные параметры: moduleId и enabled обязательны' },
        { status: 400 }
      );
    }

    const currentSetting = await prisma.systemSetting.findUnique({
      where: { key: 'SYSTEM_MODULES_STATUS' },
    });

    let status: ModuleStatusMap = { ...DEFAULT_MODULE_STATUS };
    if (currentSetting && currentSetting.value) {
      try {
        status = { ...DEFAULT_MODULE_STATUS, ...JSON.parse(currentSetting.value) };
      } catch {
        // ignore
      }
    }

    status[moduleId as keyof ModuleStatusMap] = enabled;

    await prisma.systemSetting.upsert({
      where: { key: 'SYSTEM_MODULES_STATUS' },
      update: { value: JSON.stringify(status) },
      create: {
        key: 'SYSTEM_MODULES_STATUS',
        value: JSON.stringify(status),
        description: 'Статусы активности модулей платформы (EPS, WMS, SRM, MRO)',
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: enabled ? 'ENABLE_MODULE' : 'DISABLE_MODULE',
      entityType: 'SystemModule',
      entityId: moduleId,
      details: {
        moduleId,
        enabled,
        updatedBy: user.username,
      },
    });

    return NextResponse.json({
      success: true,
      data: status,
      message: `Модуль ${moduleId.toUpperCase()} ${enabled ? 'включен' : 'отключен'}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка обновления статуса модуля' },
      { status: 500 }
    );
  }
}
