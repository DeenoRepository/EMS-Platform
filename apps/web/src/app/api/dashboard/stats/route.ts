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

    // Effective scope determination (default to enterprise-wide visibility)
    const isEnterprise = scopeParam === 'personal' ? false : true;
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

    // SRM & MRO prototypes retired from active runtime
    const srmStats = {
      openIssues: 0,
      inProgressIssues: 0,
      resolvedIssues: 0,
      totalIssues: 0,
      recentIssues: [],
    };

    const mroStats = {
      overdueCount: 0,
      plannedCount: 0,
      completedCount: 0,
      totalCount: 0,
      nextSchedules: [],
    };

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
        srm: srmStats,
        mro: mroStats,
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
