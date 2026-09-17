import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Пересчет остатков временно отключен до внедрения проверяемого журнала движений',
      },
      { status: 503 }
    );

  } catch (error: any) {
    console.error('Ошибка пересчета остатков:', error);
    return NextResponse.json({ success: false, error: 'Ошибка пересчета остатков' }, { status: 500 });
  }
}
