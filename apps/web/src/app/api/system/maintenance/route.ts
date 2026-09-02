import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS, PlatformMaintenanceStatus } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DEFAULT_MAINTENANCE_STATUS: PlatformMaintenanceStatus = {
  system: {
    enabled: false,
    message: 'В настоящее время на платформе проводятся плановые технические работы. Приносим извинения за временные неудобства.',
    estimatedUntil: null,
    allowedRoles: ['admin', 'administrator'],
  },
  modules: {
    eps: { enabled: false, message: 'Модуль паспортизации оборудования (EPS) находится на техническом обслуживании.', estimatedUntil: null },
    wms: { enabled: false, message: 'Модуль складского учёта (WMS) находится на техническом обслуживании.', estimatedUntil: null },
    srm: { enabled: false, message: 'Модуль подачи заявок (SRM) находится на техническом обслуживании.', estimatedUntil: null },
    mro: { enabled: false, message: 'Модуль ТО и ремонта (MRO) находится на техническом обслуживании.', estimatedUntil: null },
    prm: { enabled: false, message: 'Модуль закупок (PRM) находится на техническом обслуживании.', estimatedUntil: null },
  },
};

async function getMaintenanceStatus(): Promise<PlatformMaintenanceStatus> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'SYSTEM_MAINTENANCE_STATUS' },
    });

    if (!setting || !setting.value) {
      return DEFAULT_MAINTENANCE_STATUS;
    }

    const parsed = JSON.parse(setting.value);
    return {
      system: { ...DEFAULT_MAINTENANCE_STATUS.system, ...parsed.system },
      modules: {
        eps: { ...DEFAULT_MAINTENANCE_STATUS.modules.eps, ...(parsed.modules?.eps || {}) },
        wms: { ...DEFAULT_MAINTENANCE_STATUS.modules.wms, ...(parsed.modules?.wms || {}) },
        srm: { ...DEFAULT_MAINTENANCE_STATUS.modules.srm, ...(parsed.modules?.srm || {}) },
        mro: { ...DEFAULT_MAINTENANCE_STATUS.modules.mro, ...(parsed.modules?.mro || {}) },
        prm: { ...DEFAULT_MAINTENANCE_STATUS.modules.prm, ...(parsed.modules?.prm || {}) },
      },
    };
  } catch {
    return DEFAULT_MAINTENANCE_STATUS;
  }
}

// GET: Публичный статус ТО (доступен без обязательной авторизации)
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'maint-status-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const status = await getMaintenanceStatus();
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: 'Ошибка получения статуса тех. обслуживания' },
      { status: 500 }
    );
  }
}

const updateMaintenanceSchema = z.object({
  system: z
    .object({
      enabled: z.boolean(),
      message: z.string().optional(),
      estimatedUntil: z.string().nullable().optional(),
    })
    .optional(),
  modules: z
    .object({
      eps: z.object({ enabled: z.boolean(), message: z.string().optional(), estimatedUntil: z.string().nullable().optional() }).optional(),
      wms: z.object({ enabled: z.boolean(), message: z.string().optional(), estimatedUntil: z.string().nullable().optional() }).optional(),
      srm: z.object({ enabled: z.boolean(), message: z.string().optional(), estimatedUntil: z.string().nullable().optional() }).optional(),
      mro: z.object({ enabled: z.boolean(), message: z.string().optional(), estimatedUntil: z.string().nullable().optional() }).optional(),
      prm: z.object({ enabled: z.boolean(), message: z.string().optional(), estimatedUntil: z.string().nullable().optional() }).optional(),
    })
    .optional(),
});

// PATCH: Обновление статусов ТО (только для администраторов)
export async function PATCH(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 20, windowMs: 60 * 1000, prefix: 'maint-status-patch' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!isAdminUser(user) && !hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) {
      return forbiddenResponse('Доступ к управлению техническим обслуживанием разрешен только администраторам');
    }

    const body = await req.json();
    const validated = updateMaintenanceSchema.parse(body);

    const current = await getMaintenanceStatus();

    const updated: PlatformMaintenanceStatus = {
      system: validated.system
        ? {
            ...current.system,
            enabled: validated.system.enabled,
            message: validated.system.message !== undefined ? validated.system.message : current.system.message,
            estimatedUntil: validated.system.estimatedUntil !== undefined ? validated.system.estimatedUntil : current.system.estimatedUntil,
          }
        : current.system,
      modules: {
        eps: validated.modules?.eps ? { ...current.modules.eps, ...validated.modules.eps } : current.modules.eps,
        wms: validated.modules?.wms ? { ...current.modules.wms, ...validated.modules.wms } : current.modules.wms,
        srm: validated.modules?.srm ? { ...current.modules.srm, ...validated.modules.srm } : current.modules.srm,
        mro: validated.modules?.mro ? { ...current.modules.mro, ...validated.modules.mro } : current.modules.mro,
        prm: validated.modules?.prm ? { ...current.modules.prm, ...validated.modules.prm } : current.modules.prm,
      },
    };

    await prisma.systemSetting.upsert({
      where: { key: 'SYSTEM_MAINTENANCE_STATUS' },
      update: { value: JSON.stringify(updated) },
      create: {
        key: 'SYSTEM_MAINTENANCE_STATUS',
        value: JSON.stringify(updated),
        description: 'Конфигурация режима технического обслуживания платформы и модулей',
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'SystemMaintenance',
      entityId: 'global',
      changes: {
        systemEnabled: { old: current.system.enabled, new: updated.system.enabled },
        modules: Object.fromEntries(
          Object.entries(updated.modules).map(([k, v]) => [
            k,
            { old: (current.modules as any)[k]?.enabled, new: v.enabled },
          ])
        ),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Конфигурация технического обслуживания успешно обновлена',
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Некорректные параметры', details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: 'Ошибка сохранения конфигурации тех. обслуживания' },
      { status: 500 }
    );
  }
}
