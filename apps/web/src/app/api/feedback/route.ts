import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { saveFile } from '@/lib/storage';
import { logger } from '@/lib/logger';
import {
  parseFeedbackJsonInput,
  parseFeedbackMultipartInput,
} from './input-model';

export const dynamic = 'force-dynamic';

// GET /api/feedback - Список обращений
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'feedback-list-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const isAdmin =
      isAdminUser(user) ||
      isAdminUser(user) ||
      hasPermission(user, PERMISSIONS.ADMIN_FEEDBACK_MANAGE);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const feedbackModule = searchParams.get('module');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const onlyOwn = searchParams.get('onlyOwn') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: any = {
      deletedAt: null,
    };

    // Если не админ или запрошены только свои
    if (!isAdmin || onlyOwn) {
      where.createdById = user.userId;
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }
    if (feedbackModule && feedbackModule !== 'ALL') {
      where.module = feedbackModule;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { createdBy: { displayName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.feedbackTicket.count({ where }),
      prisma.feedbackTicket.findMany({
        where,
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
          _count: {
            select: {
              comments: true,
              attachments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    const formatted = tickets.map((t) => ({
      ...t,
      commentsCount: t._count.comments,
      attachmentsCount: t._count.attachments,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения обращений');
  }
}

// POST /api/feedback - Создание нового обращения
export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 20, windowMs: 60 * 1000, prefix: 'feedback-create-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const contentType = req.headers.get('content-type') || '';
    const input = contentType.includes('multipart/form-data')
      ? parseFeedbackMultipartInput(await req.formData())
      : parseFeedbackJsonInput(await req.json());
    const {
      title,
      description,
      type,
      feedbackModule,
      priority,
      pageUrl,
      browserInfo,
      uploadedFiles,
    } = input;

    if (!title.trim()) {
      return NextResponse.json({ success: false, error: 'Укажите тему обращения' }, { status: 400 });
    }
    if (!description.trim()) {
      return NextResponse.json({ success: false, error: 'Укажите описание проблемы или предложения' }, { status: 400 });
    }

    // Генерация номера FB-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await prisma.feedbackTicket.count({
      where: {
        createdAt: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        },
      },
    });
    const seqNum = String(countThisYear + 1).padStart(4, '0');
    const ticketNumber = `FB-${currentYear}-${seqNum}`;

    // Создание тикета
    const ticket = await prisma.feedbackTicket.create({
      data: {
        ticketNumber,
        title: title.trim(),
        description: description.trim(),
        type: type as any,
        module: feedbackModule as any,
        priority: priority as any,
        pageUrl,
        browserInfo: browserInfo ?? {},
        createdById: user.userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            ldapLogin: true,
          },
        },
      },
    });

    // Сохранение прикрепленных файлов/скриншотов
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        try {
          const saved = await saveFile(file, 'feedback');
          await prisma.feedbackAttachment.create({
            data: {
              ticketId: ticket.id,
              fileName: saved.fileName,
              originalName: saved.originalName,
              filePath: saved.filePath,
              fileType: saved.fileType,
              fileSize: saved.fileSize,
              uploadedById: user.userId,
            },
          });
        } catch (uploadErr) {
          logger.warn('Failed to save feedback attachment', {
            endpoint: 'feedback-post',
            error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
          });
        }
      }
    }

    // Системное оповещение администраторам
    try {
      const adminUsers = await prisma.user.findMany({
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

      const typeRu =
        type === 'BUG'
          ? 'Сообщение об ошибке'
          : type === 'FEATURE_REQUEST'
            ? 'Предложение по улучшению'
            : 'Новое обращение';

      for (const admin of adminUsers) {
        if (admin.id !== user.userId) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: `${typeRu} ${ticketNumber}`,
              message: `Пользователь ${user.displayName || user.ldapLogin} создал(а) обращение «${title.slice(0, 80)}»`,
              type: 'FEEDBACK_CREATED' as any,
              link: `/admin/feedback?ticketId=${ticket.id}`,
            },
          });
        }
      }
    } catch (notifErr) {
      logger.warn('Failed to send admin notifications for new feedback', {
        endpoint: 'feedback-post',
        error: notifErr instanceof Error ? notifErr.message : String(notifErr),
      });
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'FeedbackTicket',
      entityId: ticket.id,
      changes: { ticketNumber, title, type, module: feedbackModule },
    });

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка создания обращения');
  }
}
