import { NextRequest } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PurchaseRequestStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { executeStatusTransition } from '@/lib/prm-transition-handler';

export const dynamic = 'force-dynamic';

// POST /api/prm/requests/[id]/submit - Отправка заявки на согласование (DRAFT -> SUBMITTED)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, prefix: 'prm-request-submit' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.PRM_REQUESTS_CREATE)) return forbiddenResponse();

    const { id } = await params;
    return await executeStatusTransition({
      id,
      user,
      targetStatus: PurchaseRequestStatus.SUBMITTED,
      auditActionLabel: 'SUBMIT',
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка отправки заявки на согласование', 500, {
      endpoint: 'prm-request-submit',
    });
  }
}
