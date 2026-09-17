import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, PERMISSIONS.WMS_WAREHOUSES_MANAGE);
    if (auth.errorResponse) return auth.errorResponse;

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
