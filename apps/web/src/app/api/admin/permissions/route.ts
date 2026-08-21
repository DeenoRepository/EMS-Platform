import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_ROLES_MANAGE)) return forbiddenResponse();

    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка получения прав' }, { status: 500 });
  }
}
