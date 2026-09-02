import { NextRequest } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PurchaseRequestStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { executeStatusTransition } from '@/lib/prm-transition-handler';

export const dynamic = 'force-dynamic';

// POST /api/prm/requests/[id]/cancel - Отмена заявки инициатором или админом
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1_000, prefix: 'prm-request-cancel' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.PRM_REQUESTS_CREATE) &&
      !hasPermission(user, PERMISSIONS.PRM_REQUESTS_MANAGE)
    ) {
      return forbiddenResponse();
    }

    const { id } = await params;
    return await executeStatusTransition({
      id,
      user,
      targetStatus: PurchaseRequestStatus.CANCELLED,
      auditActionLabel: 'CANCEL',
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка отмены заявки', 500, {
      endpoint: 'prm-request-cancel',
    });
  }
}
