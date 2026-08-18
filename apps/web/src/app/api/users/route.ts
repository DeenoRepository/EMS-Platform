import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';

export const dynamic = 'force-dynamic';

// GET /api/users - Получение списка активных пользователей для селекторов и назначения ответственных
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        displayName: true,
        ldapLogin: true,
        email: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      ldapLogin: u.ldapLogin,
      email: u.email,
      roles: u.roles.map((r) => r.role.name),
    }));

    return NextResponse.json({ success: true, data: formattedUsers });
  } catch (error: any) {
    console.error('Ошибка получения списка пользователей:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения пользователей' }, { status: 500 });
  }
}
