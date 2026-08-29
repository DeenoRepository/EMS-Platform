import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, AuditAction } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { logger } from '@/lib/logger';

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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));
    const action = searchParams.get('action')?.trim() || '';
    const equipmentId = searchParams.get('equipmentId')?.trim() || '';
    const userId = searchParams.get('userId')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const startDate = searchParams.get('startDate')?.trim() || '';
    const endDate = searchParams.get('endDate')?.trim() || '';

    const epsEntityTypes = [
      'Equipment',
      'EquipmentDocument',
      'EquipmentApproval',
      'Photo',
      'CustomField',
      'EquipmentCustomSection',
    ];

    const where: any = {
      entityType: { in: epsEntityTypes },
    };

    if (action && action in AuditAction) {
      where.action = action as AuditAction;
    }

    if (userId) {
      where.userId = userId;
    }

    if (equipmentId) {
      where.entityId = equipmentId;
    }

    if (search) {
      where.OR = [
        { user: { displayName: { contains: search, mode: 'insensitive' } } },
        { user: { ldapLogin: { contains: search, mode: 'insensitive' } } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

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
        where: { entityType: { in: epsEntityTypes } },
        select: { action: true },
      }),
    ]);

    // Gather equipment IDs to enrich logs with equipment names and inventory numbers
    const equipmentIdsToFetch = new Set<string>();
    logs.forEach((log) => {
      if (log.entityType === 'Equipment') {
        equipmentIdsToFetch.add(log.entityId);
      }
      const changes = (log.changes as any) || {};
      if (changes.equipmentId) {
        equipmentIdsToFetch.add(changes.equipmentId);
      }
    });

    const equipments = await prisma.equipment.findMany({
      where: { id: { in: Array.from(equipmentIdsToFetch) } },
      select: { id: true, name: true, inventoryNumber: true },
    });

    const equipmentMap = new Map<string, { id: string; name: string; inventoryNumber: string | null }>();
    equipments.forEach((eq) => equipmentMap.set(eq.id, eq));

    const enrichedLogs = logs.map((log) => {
      const changes = (log.changes as any) || {};
      let eqInfo: any = null;

      if (log.entityType === 'Equipment') {
        eqInfo = equipmentMap.get(log.entityId) || {
          id: log.entityId,
          name: changes.name?.new || changes.name || 'Оборудование',
          inventoryNumber: changes.inventoryNumber?.new || changes.inventoryNumber || null,
        };
      } else if (changes.equipmentId) {
        eqInfo = equipmentMap.get(changes.equipmentId) || {
          id: changes.equipmentId,
          name: changes.equipmentName || 'Оборудование',
          inventoryNumber: null,
        };
      }

      return {
        ...log,
        equipment: eqInfo,
      };
    });

    const stats = {
      total: allLogsCount.length,
      creates: allLogsCount.filter((l) => l.action === 'CREATE').length,
      updates: allLogsCount.filter((l) => l.action === 'UPDATE').length,
      deletes: allLogsCount.filter((l) => l.action === 'DELETE').length,
    };

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
