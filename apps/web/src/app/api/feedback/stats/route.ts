import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

// GET /api/feedback/stats - Статистика и KPI для панели обратной связи
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'feedback-stats-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const isAdmin =
      isAdminUser(user) ||
      isAdminUser(user) ||
      hasPermission(user, PERMISSIONS.ADMIN_FEEDBACK_MANAGE);

    if (!isAdmin) {
      return forbiddenResponse();
    }

    const [
      totalCount,
      newCount,
      inReviewCount,
      inProgressCount,
      resolvedCount,
      rejectedCount,
      bugsCount,
      featuresCount,
      questionsCount,
      criticalCount,
    ] = await Promise.all([
      prisma.feedbackTicket.count({ where: { deletedAt: null } }),
      prisma.feedbackTicket.count({ where: { deletedAt: null, status: 'NEW' } }),
      prisma.feedbackTicket.count({ where: { deletedAt: null, status: 'IN_REVIEW' } }),
      prisma.feedbackTicket.count({ where: { deletedAt: null, status: 'IN_PROGRESS' } }),
      prisma.feedbackTicket.count({ where: { deletedAt: null, status: 'RESOLVED' } }),
      prisma.feedbackTicket.count({ where: { deletedAt: null, status: 'REJECTED' } }),
      prisma.feedbackTicket.count({ where: { deletedAt: null, type: 'BUG' } }),
      prisma.feedbackTicket.count({ where: { deletedAt: null, type: 'FEATURE_REQUEST' } }),
      prisma.feedbackTicket.count({ where: { deletedAt: null, type: 'QUESTION' } }),
      prisma.feedbackTicket.count({ where: { deletedAt: null, priority: 'CRITICAL', status: { notIn: ['RESOLVED', 'REJECTED'] } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total: totalCount,
        new: newCount,
        inReview: inReviewCount,
        inProgress: inProgressCount,
        active: newCount + inReviewCount + inProgressCount,
        resolved: resolvedCount,
        rejected: rejectedCount,
        bugs: bugsCount,
        features: featuresCount,
        questions: questionsCount,
        critical: criticalCount,
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения статистики');
  }
}
