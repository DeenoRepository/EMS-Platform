import { prisma } from '@ems/database';

type InventoryLockClient = Pick<typeof prisma, 'inventory'>;

export async function assertNoActiveInventory(warehouseIds: string[], client: InventoryLockClient = prisma): Promise<void> {
  const ids = [...new Set(warehouseIds)].filter(Boolean);
  if (ids.length === 0) return;

  const inventory = await client.inventory.findFirst({
    where: {
      warehouseId: { in: ids },
      status: { in: ['DRAFT', 'IN_PROGRESS'] },
    },
    select: { id: true },
  });
  if (inventory) throw new Error('WMS_INVENTORY_LOCKED');
}
