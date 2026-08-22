import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { createMroWorkOrderFromIssue } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/srm/issues/[id]/create-mro-order - Создание аварийного заказ-наряда в MRO
export async function POST(req: NextRequest, { params }: RouteContext) {
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
  } catch (error: any) {
    console.error('Ошибка создания заказ-наряда из SRM:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка создания заказ-наряда' },
      { status: 400 }
    );
  }
}
