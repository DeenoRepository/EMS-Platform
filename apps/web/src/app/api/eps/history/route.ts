import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { logger } from '@/lib/logger';
import {
  buildAuditHistoryStats,
  buildAuditHistoryWhereInput,
  enrichAuditLogs,
  parseAuditHistoryQuery,
} from './get-query';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'eps-history-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_HISTORY_VIEW) && !isAdminUser(user)) {
      return forbiddenResponse();
    }

    const query = parseAuditHistoryQuery(new URL(req.url).searchParams);
    const { page, pageSize } = query;
    const { where, entityTypes } = buildAuditHistoryWhereInput(query);

    const [logs, total, allLogsCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              ldapLogin: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where: { entityType: { in: entityTypes } },
        select: { action: true },
      }),
    ]);

    const equipmentIds = new Set<string>();
    logs.forEach((log) => {
      if (log.entityType === 'Equipment') equipmentIds.add(log.entityId);
      const changes = (log.changes as Record<string, unknown> | null) || {};
      if (typeof changes.equipmentId === 'string') equipmentIds.add(changes.equipmentId);
    });

    const equipments = await prisma.equipment.findMany({
      where: { id: { in: Array.from(equipmentIds) } },
      select: { id: true, name: true, inventoryNumber: true },
    });

    const enrichedLogs = enrichAuditLogs(logs, equipments);
    const stats = buildAuditHistoryStats(allLogsCount);

    return NextResponse.json({
      success: true,
      data: {
        items: enrichedLogs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        stats,
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to get EPS history log', {
      endpoint: 'eps-history-get',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Ошибка получения истории изменений' },
      { status: 500 }
    );
  }
}
