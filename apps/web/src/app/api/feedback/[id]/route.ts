import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/feedback/[id] - Детали обращения
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = params;

    const isAdmin =
      user.roles?.includes('admin') ||
      user.roles?.includes('administrator') ||
      hasPermission(user, PERMISSIONS.ADMIN_FEEDBACK_MANAGE);

    const ticket = await prisma.feedbackTicket.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            ldapLogin: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            displayName: true,
            ldapLogin: true,
          },
        },
        attachments: {
          orderBy: { createdAt: 'asc' },
        },
        comments: {
          where: isAdmin ? undefined : { isInternal: false },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                ldapLogin: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket || ticket.deletedAt) {
      return NextResponse.json({ success: false, error: 'Обращение не найдено' }, { status: 404 });
    }

    // Обычный пользователь может просматривать только свои обращения
    if (!isAdmin && ticket.createdById !== user.userId) {
      return forbiddenResponse('У вас нет доступа к просмотру данного обращения');
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Ошибка получения данных обращения', details: message }, { status: 500 });
  }
}

// PATCH /api/feedback/[id] - Обновление статуса, ответственного или резолюции
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const isAdmin =
      user.roles?.includes('admin') ||
      user.roles?.includes('administrator') ||
      hasPermission(user, PERMISSIONS.ADMIN_FEEDBACK_MANAGE);

    if (!isAdmin) {
      return forbiddenResponse('Только администраторы могут изменять статус и параметры обращений');
    }

    const { id } = params;
    const body = await req.json();

    const existing = await prisma.feedbackTicket.findUnique({
      where: { id },
      include: {
        createdBy: true,
      },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ success: false, error: 'Обращение не найдено' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId || null;
    if (body.resolution !== undefined) {
      updateData.resolution = body.resolution;
      if (body.status === 'RESOLVED' && !existing.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    }

    if (body.status === 'RESOLVED' && !updateData.resolvedAt && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.feedbackTicket.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            ldapLogin: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            displayName: true,
            ldapLogin: true,
          },
        },
      },
    });

    // Оповещение автора при смене статуса или добавлении резолюции
    if (body.status && body.status !== existing.status && existing.createdById) {
      try {
        const STATUS_RU: Record<string, string> = {
          NEW: 'Новое',
          IN_REVIEW: 'На рассмотрении',
          IN_PROGRESS: 'В работе',
          RESOLVED: 'Решено / Реализовано',
          REJECTED: 'Отклонено',
          DUPLICATE: 'Дубликат',
        };

        const statusLabel = STATUS_RU[body.status] || body.status;

        await prisma.notification.create({
          data: {
            userId: existing.createdById,
            title: `Статус обращения ${existing.ticketNumber} изменен`,
            message: `Статус вашего обращения «${existing.title.slice(0, 60)}» изменен на «${statusLabel}»${
              body.resolution ? `. Резолюция: "${body.resolution}"` : ''
            }`,
            type: 'FEEDBACK_STATUS_CHANGED' as any,
            link: `/?feedbackTicketId=${existing.id}`,
          },
        });
      } catch (notifErr) {
        console.error('Ошибка отправки уведомления об изменении статуса:', notifErr);
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'FeedbackTicket',
      entityId: updated.id,
      changes: {
        oldStatus: existing.status,
        newStatus: updated.status,
        assignedToId: updated.assignedToId,
        resolution: updated.resolution,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Ошибка обновления обращения', details: message }, { status: 500 });
  }
}

// DELETE /api/feedback/[id] - Удаление обращения (Soft delete)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const isAdmin =
      user.roles?.includes('admin') ||
      user.roles?.includes('administrator') ||
      hasPermission(user, PERMISSIONS.ADMIN_FEEDBACK_MANAGE);

    if (!isAdmin) {
      return forbiddenResponse();
    }

    const { id } = params;
    await prisma.feedbackTicket.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'FeedbackTicket',
      entityId: id,
    });

    return NextResponse.json({
      success: true,
      message: 'Обращение успешно удалено',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Ошибка удаления обращения', details: message }, { status: 500 });
  }
}
