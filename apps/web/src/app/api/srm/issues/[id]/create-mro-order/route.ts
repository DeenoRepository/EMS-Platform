import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/safe-error';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { createMroWorkOrderFromIssue } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/srm/issues/[id]/create-mro-order - Создание аварийного заказ-наряда в MRO
export async function POST(req: NextRequest, { params }: RouteContext) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'srm-create-mro-order' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.MRO_SCHEDULE_MANAGE);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  try {
    const result = await createMroWorkOrderFromIssue(id, auth.user?.userId);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Заказ-наряд ТОиР успешно сформирован на основе заявки ${result.issue.issueKey}`,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка создания заказ-наряда', 500, { endpoint: 'srm-create-mro-order' });
  }
}
