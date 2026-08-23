import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const scopeParam = searchParams.get('scope') || 'auto';

    const isAdmin =
      user.roles?.includes('admin') ||
      user.roles?.includes('administrator') ||
      hasPermission(user, PERMISSIONS.ADMIN_USERS_MANAGE);

    // Effective scope determination
    const isEnterprise = scopeParam === 'enterprise' ? isAdmin : scopeParam === 'personal' ? false : isAdmin;
    const scope = isEnterprise ? 'ENTERPRISE' : 'PERSONAL';

    // 1. EPS: EQUIPMENT IN SCOPE
    let equipmentWhere: any = { deletedAt: null };
    let userEquipmentIds: string[] = [];

    if (!isEnterprise) {
      // Personal scope: Equipment created by user, maintained by user, or in user's approvals
      equipmentWhere = {
        deletedAt: null,
        OR: [
          { createdById: user.userId },
          { schedules: { some: { completedById: user.userId } } },
          { approvals: { some: { requesterId: user.userId } } },
        ],
      };

      const userEquipList = await prisma.equipment.findMany({
        where: equipmentWhere,
        select: { id: true },
      });
      userEquipmentIds = userEquipList.map((e) => e.id);

      // If user has no directly attached equipment yet, fallback to all active equipment if they have EPS_EQUIPMENT_VIEW
      if (userEquipmentIds.length === 0 && hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) {
        equipmentWhere = { deletedAt: null };
        const allEquip = await prisma.equipment.findMany({
          where: { deletedAt: null },
          select: { id: true },
        });
        userEquipmentIds = allEquip.map((e) => e.id);
      }
    }

    const [
      totalEquipment,
      activeEquipment,
      underRepairEquipment,
      inStorageEquipment,
      decommissionedEquipment,
    ] = await Promise.all([
      prisma.equipment.count({ where: equipmentWhere }),
      prisma.equipment.count({ where: { ...equipmentWhere, status: 'ACTIVE' } }),
      prisma.equipment.count({ where: { ...equipmentWhere, status: 'UNDER_REPAIR' } }),
      prisma.equipment.count({ where: { ...equipmentWhere, status: 'IN_STORAGE' } }),
      prisma.equipment.count({ where: { ...equipmentWhere, status: 'DECOMMISSIONED' } }),
    ]);

    // 2. APPROVALS IN SCOPE
    let approvalsWhere: any = { status: 'PENDING' };
    if (!isEnterprise) {
      approvalsWhere = {
        status: 'PENDING',
        OR: [{ reviewerId: user.userId }, { requesterId: user.userId }],
      };
    }

    const pendingApprovalsCount = await prisma.equipmentApproval.count({
      where: approvalsWhere,
    });

    const myToReviewApprovalsCount = await prisma.equipmentApproval.count({
      where: { status: 'PENDING', reviewerId: user.userId },
    });

    const mySubmittedPendingApprovalsCount = await prisma.equipmentApproval.count({
      where: { status: 'PENDING', requesterId: user.userId },
    });

    // 3. WMS: WAREHOUSES & STOCK IN SCOPE
    const hasWmsPermission = hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW) || isAdmin;
    let wmsStats = {
      accessible: hasWmsPermission,
      warehousesCount: 0,
      nomenclatureCount: 0,
      lowStockCount: 0,
      activeInventoriesCount: 0,
      lowStockItems: [] as Array<{
        id: string;
        name: string;
        warehouseCode: string;
        quantity: number;
        minStock: number;
        unit: string;
      }>,
    };

    if (hasWmsPermission) {
      let warehouseWhere: any = { isActive: true };
      let userWarehouseIds: string[] = [];

      if (!isEnterprise) {
        const userWarehouses = await prisma.warehouse.findMany({
          where: { isActive: true, responsibleUserId: user.userId },
          select: { id: true },
        });

        if (userWarehouses.length > 0) {
          userWarehouseIds = userWarehouses.map((w) => w.id);
          warehouseWhere = { isActive: true, id: { in: userWarehouseIds } };
        }
      }

      const [warehousesCount, nomenclatureCount, activeInventoriesCount, deficitItems] = await Promise.all([
        prisma.warehouse.count({ where: warehouseWhere }),
        prisma.nomenclature.count({ where: { deletedAt: null } }),
        prisma.inventory.count({
          where: {
            status: 'IN_PROGRESS',
            ...(userWarehouseIds.length > 0 ? { warehouseId: { in: userWarehouseIds } } : {}),
          },
        }),
        prisma.stockItem.findMany({
          where: {
            nomenclature: { minStock: { not: null }, deletedAt: null },
            ...(userWarehouseIds.length > 0 ? { warehouseId: { in: userWarehouseIds } } : {}),
          },
          include: {
            nomenclature: { select: { minStock: true, name: true, unit: true } },
            warehouse: { select: { name: true, code: true } },
          },
        }).then((items) =>
          items
            .filter((si) => si.nomenclature.minStock !== null && Number(si.quantity) <= Number(si.nomenclature.minStock))
            .map((si) => ({
              id: si.id,
              name: si.nomenclature.name,
              warehouseCode: si.warehouse.code,
              quantity: Number(si.quantity),
              minStock: Number(si.nomenclature.minStock),
              unit: si.nomenclature.unit,
            }))
        ),
      ]);

      wmsStats = {
        accessible: true,
        warehousesCount,
        nomenclatureCount,
        lowStockCount: deficitItems.length,
        activeInventoriesCount,
        lowStockItems: deficitItems.slice(0, 4),
      };
    }

    // 4. SRM: SERVICE REQUESTS IN SCOPE
    let srmWhere: any = {};
    if (!isEnterprise) {
      const orConditions: any[] = [
        { reporter: user.ldapLogin },
        { assignee: user.ldapLogin },
        { createdById: user.userId },
      ];
      if (userEquipmentIds.length > 0) {
        orConditions.push({ equipmentId: { in: userEquipmentIds } });
      }
      srmWhere = { OR: orConditions };
    }

    const [openIssues, inProgressIssues, resolvedIssues, totalIssues, recentIssuesRaw] =
      await Promise.all([
        prisma.jiraIssueCache.count({ where: { ...srmWhere, status: { in: ['OPEN', 'WAITING'] } } }),
        prisma.jiraIssueCache.count({ where: { ...srmWhere, status: 'IN_PROGRESS' } }),
        prisma.jiraIssueCache.count({ where: { ...srmWhere, status: { in: ['RESOLVED', 'CLOSED'] } } }),
        prisma.jiraIssueCache.count({ where: srmWhere }),
        prisma.jiraIssueCache.findMany({
          where: srmWhere,
          orderBy: { createdDate: 'desc' },
          take: 4,
          select: {
            id: true,
            issueKey: true,
            summary: true,
            status: true,
            priority: true,
            createdDate: true,
            equipmentId: true,
          },
        }),
      ]);

    // Fetch equipment details for recent issues
    const equipmentMap = new Map<string, { name: string; inventoryNumber: string | null }>();
    const eqIdsToFetch = recentIssuesRaw
      .map((i) => i.equipmentId)
      .filter((id): id is string => Boolean(id));

    if (eqIdsToFetch.length > 0) {
      const equipments = await prisma.equipment.findMany({
        where: { id: { in: eqIdsToFetch } },
        select: { id: true, name: true, inventoryNumber: true },
      });
      for (const eq of equipments) {
        equipmentMap.set(eq.id, { name: eq.name, inventoryNumber: eq.inventoryNumber });
      }
    }

    const recentIssues = recentIssuesRaw.map((item) => ({
      id: item.id,
      key: item.issueKey,
      title: item.summary,
      status: item.status,
      priority: item.priority,
      createdAt: item.createdDate.toISOString(),
      equipment: item.equipmentId ? equipmentMap.get(item.equipmentId) || null : null,
    }));

    // 5. MRO: MAINTENANCE SCHEDULES IN SCOPE
    let mroWhere: any = {};
    if (!isEnterprise) {
      const orConditions: any[] = [{ completedById: user.userId }];
      if (userEquipmentIds.length > 0) {
        orConditions.push({ equipmentId: { in: userEquipmentIds } });
      }
      mroWhere = { OR: orConditions };
    }

    const now = new Date();
    const [overdueCount, plannedCount, completedCount, totalMroCount, nextSchedulesRaw] =
      await Promise.all([
        prisma.maintenanceSchedule.count({
          where: {
            ...mroWhere,
            OR: [
              { status: 'MISSED' },
              { status: 'PLANNED', scheduledDate: { lt: now } },
            ],
          },
        }),
        prisma.maintenanceSchedule.count({
          where: { ...mroWhere, status: 'PLANNED', scheduledDate: { gte: now } },
        }),
        prisma.maintenanceSchedule.count({
          where: { ...mroWhere, status: 'COMPLETED' },
        }),
        prisma.maintenanceSchedule.count({ where: mroWhere }),
        prisma.maintenanceSchedule.findMany({
          where: { ...mroWhere, status: { in: ['PLANNED', 'MISSED', 'IN_PROGRESS'] } },
          orderBy: { scheduledDate: 'asc' },
          take: 4,
          include: {
            equipment: { select: { id: true, name: true, inventoryNumber: true } },
            plan: { select: { name: true, frequency: true } },
          },
        }),
      ]);

    const nextSchedules = nextSchedulesRaw.map((s) => ({
      id: s.id,
      equipmentName: s.equipment?.name || 'Оборудование',
      title: s.title || s.plan?.name || s.notes || 'Плановое ТО',
      scheduledDate: s.scheduledDate.toISOString(),
      periodicity: s.plan?.frequency || 'По графику',
      status: s.status,
    }));

    return NextResponse.json({
      success: true,
      data: {
        scope,
        canToggleScope: isAdmin,
        user: {
          userId: user.userId,
          displayName: user.displayName,
          ldapLogin: user.ldapLogin,
          roles: user.roles,
        },
        eps: {
          total: totalEquipment,
          active: activeEquipment,
          underRepair: underRepairEquipment,
          inStorage: inStorageEquipment,
          decommissioned: decommissionedEquipment,
        },
        approvals: {
          pending: pendingApprovalsCount,
          toReview: myToReviewApprovalsCount,
          myPending: mySubmittedPendingApprovalsCount,
        },
        wms: wmsStats,
        srm: {
          openIssues,
          inProgressIssues,
          resolvedIssues,
          totalIssues,
          recentIssues,
        },
        mro: {
          overdueCount,
          plannedCount,
          completedCount,
          totalCount: totalMroCount,
          nextSchedules,
        },
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения данных дашборда:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки данных панели управления' },
      { status: 500 }
    );
  }
}
