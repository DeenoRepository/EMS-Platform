import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { getUserRolesAndPermissions } from '@ems/auth';
import { JwtUserPayload } from '@ems/shared';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден или заблокирован' }, { status: 401 });
    }

    const { roles, permissions } = await getUserRolesAndPermissions(user.id);

    const payload: JwtUserPayload = {
      userId: user.id,
      ldapLogin: user.ldapLogin,
      displayName: user.displayName,
      email: user.email,
      roles,
      permissions,
    };

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error: any) {
    console.error('Ошибка /api/auth/me:', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
