import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/srm/issues/[id] - Детали инцидента
export async function GET(req: NextRequest, { params }: RouteContext) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'srm-issue-id-get' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  try {
    const issue = await prisma.jiraIssueCache.findFirst({
      where: {
        OR: [{ id }, { issueKey: id }],
      },
      include: {
        integration: true,
      },
    });

    if (!issue) {
      return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    }

    let equipment = null;
    if (issue.equipmentId) {
      equipment = await prisma.equipment.findUnique({
        where: { id: issue.equipmentId },
        select: {
          id: true,
          name: true,
          inventoryNumber: true,
          serialNumber: true,
          manufacturer: true,
          model: true,
          status: true,
          location: true,
        },
      });
    }

    let mroSchedule = null;
    if (issue.mroScheduleId) {
      mroSchedule = await prisma.maintenanceSchedule.findUnique({
        where: { id: issue.mroScheduleId },
        select: {
          id: true,
          title: true,
          status: true,
          scheduledDate: true,
          completedDate: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...issue,
        equipment,
        mroSchedule,
      },
    });
  } catch (error: unknown) {
    console.error('Ошибка получения деталей заявки SRM:', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/srm/issues/[id] - Обновление заявки (статус, резолюция, простой, исполнитель)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'srm-issue-id-patch' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_REQUESTS_MANAGE);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  try {
    const existing = await prisma.jiraIssueCache.findFirst({
      where: {
        OR: [{ id }, { issueKey: id }],
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      priority,
      assignee,
      resolutionNotes,
      downtimeMinutes,
      failureCategory,
      warrantyClaim,
      contractorName,
      equipmentId,
    } = body;

    const dataToUpdate: any = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (assignee !== undefined) dataToUpdate.assignee = assignee;
    if (resolutionNotes !== undefined) dataToUpdate.resolutionNotes = resolutionNotes;
    if (downtimeMinutes !== undefined) dataToUpdate.downtimeMinutes = Number(downtimeMinutes) || 0;
    if (failureCategory !== undefined) dataToUpdate.failureCategory = failureCategory;
    if (warrantyClaim !== undefined) dataToUpdate.warrantyClaim = Boolean(warrantyClaim);
    if (contractorName !== undefined) dataToUpdate.contractorName = contractorName;
    if (equipmentId !== undefined) dataToUpdate.equipmentId = equipmentId;

    // Если статус переводится в RESOLVED или CLOSED - проставляем дату решения
    const isNowResolved = status && ['CLOSED', 'RESOLVED', 'DONE', 'РЕШЕН', 'ГОТОВ', 'ЗАКРЫТ'].some((s) =>
      status.toUpperCase().includes(s)
    );

    if (isNowResolved && !existing.resolvedDate) {
      dataToUpdate.resolvedDate = new Date();
      // Если downtimeMinutes не был передан вручную, вычисляем его как время между createdDate и resolvedDate
      if (downtimeMinutes === undefined && !existing.downtimeMinutes) {
        const diffMinutes = Math.round((Date.now() - existing.createdDate.getTime()) / (1000 * 60));
        dataToUpdate.downtimeMinutes = diffMinutes;
      }
    }

    const updated = await prisma.jiraIssueCache.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    // Если заявка закрыта и к ней привязано оборудование в статусе UNDER_REPAIR - возвращаем в ACTIVE,
    // если по нему нет других активных незакрытых инцидентов
    if (isNowResolved && existing.equipmentId) {
      const activeOtherIssues = await prisma.jiraIssueCache.count({
        where: {
          equipmentId: existing.equipmentId,
          id: { not: existing.id },
          status: {
            notIn: ['CLOSED', 'RESOLVED', 'DONE', 'Closed', 'Resolved', 'Done'],
          },
        },
      });

      if (activeOtherIssues === 0) {
        try {
          await prisma.equipment.update({
            where: { id: existing.equipmentId },
            data: { status: 'ACTIVE' },
          });
        } catch (e) {
          console.warn('Не удалось обновить статус оборудования:', e);
        }
      }
    }

    // Аудит лог
    try {
      await prisma.auditLog.create({
        data: {
          userId: auth.user?.userId,
          action: 'UPDATE',
          entityType: 'SrmIssue',
          entityId: existing.id,
          changes: {
            status: { old: existing.status, new: updated.status },
            resolutionNotes: { old: existing.resolutionNotes, new: updated.resolutionNotes },
            downtimeMinutes: { old: existing.downtimeMinutes, new: updated.downtimeMinutes },
          },
        },
      });
    } catch (e) {
      console.warn('Ошибка записи аудита SRM:', e);
    }

    return NextResponse.json({ success: true, data: updated, message: 'Заявка успешно обновлена' });
  } catch (error: unknown) {
    console.error('Ошибка обновления заявки SRM:', error);
    return NextResponse.json({ success: false, error: 'Ошибка сервера при обновлении заявки' }, { status: 500 });
  }
}

// DELETE /api/srm/issues/[id] - Удаление инцидента
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'srm-issue-id-delete' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_REQUESTS_MANAGE);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  try {
    const existing = await prisma.jiraIssueCache.findFirst({
      where: {
        OR: [{ id }, { issueKey: id }],
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    }

    await prisma.jiraIssueCache.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true, message: 'Заявка успешно удалена' });
  } catch (error: unknown) {
    console.error('Ошибка удаления заявки SRM:', error);
    return NextResponse.json({ success: false, error: 'Ошибка сервера при удалении' }, { status: 500 });
  }
}
