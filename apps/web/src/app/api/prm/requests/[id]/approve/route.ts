import { NextRequest } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PurchaseRequestStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { executeStatusTransition } from '@/lib/prm-transition-handler';

export const dynamic = 'force-dynamic';

// POST /api/prm/requests/[id]/approve - Согласование заявки (SUBMITTED -> APPROVED)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, prefix: 'prm-request-approve' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.PRM_REQUESTS_MANAGE)) return forbiddenResponse();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const resolutionComment = typeof body?.resolutionComment === 'string' ? body.resolutionComment : undefined;

    return await executeStatusTransition({
      id,
      user,
      targetStatus: PurchaseRequestStatus.APPROVED,
      resolutionComment,
      auditActionLabel: 'APPROVE',
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка согласования заявки', 500, {
      endpoint: 'prm-request-approve',
    });
  }
}
