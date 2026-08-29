import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/feedback/[id]/comments - Добавление комментария в переписку
export async function POST(req: NextRequest, { params }: RouteParams) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'feedback-comments-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id: ticketId } = await params;
    const body = await req.json();
    const message = body.message?.trim();
    const isInternal = Boolean(body.isInternal);

    if (!message) {
      return NextResponse.json({ success: false, error: 'Введите текст сообщения' }, { status: 400 });
    }

    const ticket = await prisma.feedbackTicket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: true,
        assignedTo: true,
      },
    });

    if (!ticket || ticket.deletedAt) {
      return NextResponse.json({ success: false, error: 'Обращение не найдено' }, { status: 404 });
    }

    const isAdmin =
      user.roles?.includes('admin') ||
      user.roles?.includes('administrator') ||
      hasPermission(user, PERMISSIONS.ADMIN_FEEDBACK_MANAGE);

    // Обычный пользователь не может писать в чужие обращения и не может создавать внутренние заметки
    if (!isAdmin && ticket.createdById !== user.userId) {
      return forbiddenResponse('Вы не можете комментировать данное обращение');
    }

    const effectiveIsInternal = isAdmin ? isInternal : false;

    const comment = await prisma.feedbackComment.create({
      data: {
        ticketId,
        userId: user.userId,
        message,
        isInternal: effectiveIsInternal,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            ldapLogin: true,
          },
        },
      },
    });

    // Отправка уведомлений:
    if (!effectiveIsInternal) {
      try {
        if (isAdmin && ticket.createdById !== user.userId) {
          // Администратор ответил автору -> уведомляем автора
          await prisma.notification.create({
            data: {
              userId: ticket.createdById,
              title: `Новый ответ по обращению ${ticket.ticketNumber}`,
              message: `${user.displayName || user.ldapLogin}: «${message.slice(0, 100)}»`,
              type: 'FEEDBACK_REPLY' as any,
              link: `/?feedbackTicketId=${ticket.id}`,
            },
          });
        } else if (!isAdmin) {
          // Пользователь ответил -> уведомляем ответственного администратора или всех администраторов
          const recipients = ticket.assignedToId
            ? [{ id: ticket.assignedToId }]
            : await prisma.user.findMany({
                where: {
                  isActive: true,
                  roles: {
                    some: {
                      role: {
                        name: 'admin',
                      },
                    },
                  },
                },
                select: { id: true },
              });

          for (const recipient of recipients) {
            if (recipient.id !== user.userId) {
              await prisma.notification.create({
                data: {
                  userId: recipient.id,
                  title: `Ответ автора по обращению ${ticket.ticketNumber}`,
                  message: `${user.displayName || user.ldapLogin}: «${message.slice(0, 100)}»`,
                  type: 'FEEDBACK_REPLY' as any,
                  link: `/admin/feedback?ticketId=${ticket.id}`,
                },
              });
            }
          }
        }
      } catch (notifErr) {
        logger.warn('Failed to send comment notification for feedback', {
          endpoint: 'feedback-comments-post',
          error: notifErr instanceof Error ? notifErr.message : String(notifErr),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: comment,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка отправки комментария');
  }
}
