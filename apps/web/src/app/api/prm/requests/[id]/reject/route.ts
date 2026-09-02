import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PurchaseRequestStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { executeStatusTransition } from '@/lib/prm-transition-handler';

export const dynamic = 'force-dynamic';

// POST /api/prm/requests/[id]/reject - Отклонение заявки (SUBMITTED -> REJECTED)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, prefix: 'prm-request-reject' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.PRM_REQUESTS_MANAGE)) return forbiddenResponse();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const resolutionComment = typeof body?.resolutionComment === 'string' ? body.resolutionComment : undefined;

    if (!resolutionComment?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Для отклонения заявки обязательно укажите причину' },
        { status: 400 },
      );
    }

    return await executeStatusTransition({
      id,
      user,
      targetStatus: PurchaseRequestStatus.REJECTED,
      resolutionComment,
      auditActionLabel: 'REJECT',
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка отклонения заявки', 500, {
      endpoint: 'prm-request-reject',
    });
  }
}
