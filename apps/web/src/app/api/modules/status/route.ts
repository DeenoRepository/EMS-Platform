import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
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
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'module-status-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) && !isAdminUser(user)) {
      return forbiddenResponse();
    }

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
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения статуса модулей');
  }
}

export async function PATCH(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'module-status-patch' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) && !isAdminUser(user)) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { moduleId, enabled } = body;

    const ALLOWED_MODULES = ['eps', 'wms', 'srm', 'mro'] as const;
    if (!moduleId || !ALLOWED_MODULES.includes(moduleId as any) || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: `Некорректные параметры: допустимые moduleId: ${ALLOWED_MODULES.join(', ')}` },
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
      action: 'UPDATE',
      entityType: 'SystemModule',
      entityId: moduleId,
      changes: {
        action: enabled ? 'ENABLE_MODULE' : 'DISABLE_MODULE',
        moduleId,
        enabled,
      },
    });

    return NextResponse.json({
      success: true,
      data: status,
      message: `Модуль ${moduleId.toUpperCase()} ${enabled ? 'включен' : 'отключен'}`,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка обновления статуса модуля');
  }
}
