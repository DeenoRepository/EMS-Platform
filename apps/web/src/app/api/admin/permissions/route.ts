import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS, PERMISSION_DEFINITIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'admin-perms-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_ROLES_MANAGE)) return forbiddenResponse();

    // Ensure all permission definitions exist in DB with updated descriptions
    for (const [code, def] of Object.entries(PERMISSION_DEFINITIONS)) {
      await prisma.permission.upsert({
        where: { code },
        create: {
          code: def.code,
          displayName: def.displayName,
          module: def.module,
          description: def.description,
        },
        update: {
          displayName: def.displayName,
          description: def.description,
          module: def.module,
        },
      }).catch(() => null);
    }

    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
      take: 200,
    });

    const enrichedPermissions = permissions.map((p) => {
      const def = (PERMISSION_DEFINITIONS as any)[p.code];
      return {
        ...p,
        displayName: def?.displayName || p.displayName || p.code,
        description: def?.description || p.description || `Право доступа ${p.code}`,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedPermissions,
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка получения прав' }, { status: 500 });
  }
}
