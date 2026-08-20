import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hasPermission } from './rbac';
import { JwtUserPayload, PERMISSIONS } from '@ems/shared';
import { StockTransferStatus, OperationType } from '@ems/database';

describe('WMS Domain Logic & Business Rules', () => {
  // ─── 1. МОЛ (Responsible User) & RBAC Warehouse Security ───
  describe('Warehouse Authorization & МОЛ Security', () => {
    const warehouseMolUser: JwtUserPayload = {
      userId: 'mol-user-1',
      ldapLogin: 'mol.ivanov',
      displayName: 'Иванов И.И. (МОЛ)',
      roles: ['storekeeper'],
      permissions: [
        PERMISSIONS.WMS_STOCK_VIEW,
        PERMISSIONS.WMS_OPERATIONS_CREATE,
        PERMISSIONS.WMS_INVENTORY_MANAGE,
      ],
    };

    const regularEngineer: JwtUserPayload = {
      userId: 'eng-user-2',
      ldapLogin: 'eng.petrov',
      displayName: 'Петров П.П. (Инженер)',
      roles: ['engineer'],
      permissions: [PERMISSIONS.WMS_STOCK_VIEW],
    };

    const adminUser: JwtUserPayload = {
      userId: 'admin-1',
      ldapLogin: 'admin',
      displayName: 'Администратор Системы',
      roles: ['admin'],
      permissions: [],
    };

    const warehouseA = { id: 'wh-a', name: 'Центральный склад', responsibleUserId: 'mol-user-1' };
    const warehouseB = { id: 'wh-b', name: 'Участок ТОиР №2', responsibleUserId: 'mol-user-other' };

    function canPerformWarehouseOperation(user: JwtUserPayload, warehouse: { responsibleUserId: string }) {
      if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)) return false;
      if (user.roles.includes('admin') || user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE)) return true;
      return warehouse.responsibleUserId === user.userId;
    }

    test('МОЛ can execute operations on their assigned warehouse', () => {
      assert.strictEqual(canPerformWarehouseOperation(warehouseMolUser, warehouseA), true);
    });

    test('МОЛ is forbidden from executing operations on unassigned warehouse', () => {
      assert.strictEqual(canPerformWarehouseOperation(warehouseMolUser, warehouseB), false);
    });

    test('Regular engineer without WMS_OPERATIONS_CREATE is rejected', () => {
      assert.strictEqual(canPerformWarehouseOperation(regularEngineer, warehouseA), false);
    });

    test('Admin has universal access across all warehouses', () => {
      assert.strictEqual(canPerformWarehouseOperation(adminUser, warehouseA), true);
      assert.strictEqual(canPerformWarehouseOperation(adminUser, warehouseB), true);
    });
  });

  // ─── 2. Stock Calculations & Deficit Alert Triggers ───
  describe('Stock Calculations & Low Stock Detection', () => {
    function processStockIssue(currentQty: number, issueQty: number, minStock: number | null) {
      if (issueQty <= 0) {
        throw new Error('Количество позиции должно быть больше нуля');
      }
      if (currentQty < issueQty) {
        throw new Error(`Недостаточно остатка: доступно ${currentQty}, требуется ${issueQty}`);
      }

      const remainingQty = currentQty - issueQty;
      const isLowStock = minStock !== null && remainingQty <= minStock;

      return {
        remainingQty,
        isLowStock,
      };
    }

    test('Correctly deducts quantity and detects low stock alert threshold', () => {
      const result = processStockIssue(10, 6, 5);
      assert.strictEqual(result.remainingQty, 4);
      assert.strictEqual(result.isLowStock, true);
    });

    test('Does not trigger low stock alert when balance is strictly above minStock', () => {
      const result = processStockIssue(20, 5, 10);
      assert.strictEqual(result.remainingQty, 15);
      assert.strictEqual(result.isLowStock, false);
    });

    test('Handles null minStock correctly without triggering alert', () => {
      const result = processStockIssue(10, 9, null);
      assert.strictEqual(result.remainingQty, 1);
      assert.strictEqual(result.isLowStock, false);
    });

    test('Prevents overdraft and throws when requested quantity exceeds available stock', () => {
      assert.throws(
        () => processStockIssue(3, 5, 2),
        /Недостаточно остатка: доступно 3, требуется 5/
      );
    });

    test('Rejects zero or negative issue quantity', () => {
      assert.throws(() => processStockIssue(10, 0, 5), /Количество позиции должно быть больше нуля/);
      assert.throws(() => processStockIssue(10, -2, 5), /Количество позиции должно быть больше нуля/);
    });
  });

  // ─── 3. Stock Transfer State Machine Transitions & Rollback ───
  describe('Stock Transfer State Machine & Rollback', () => {
    interface TransferSimulation {
      id: string;
      status: StockTransferStatus;
      sourceWarehouseStock: number;
      targetWarehouseStock: number;
      quantity: number;
    }

    function dispatchTransfer(t: TransferSimulation): TransferSimulation {
      if (t.status !== StockTransferStatus.REQUESTED) {
        throw new Error(`Невозможно отгрузить перемещение в статусе ${t.status}`);
      }
      if (t.sourceWarehouseStock < t.quantity) {
        throw new Error('Недостаточно остатка для отгрузки');
      }
      return {
        ...t,
        status: StockTransferStatus.IN_TRANSIT,
        sourceWarehouseStock: t.sourceWarehouseStock - t.quantity,
      };
    }

    function receiveTransfer(t: TransferSimulation): TransferSimulation {
      if (t.status !== StockTransferStatus.IN_TRANSIT) {
        throw new Error(`Перемещение не находится в статусе IN_TRANSIT`);
      }
      return {
        ...t,
        status: StockTransferStatus.COMPLETED,
        targetWarehouseStock: t.targetWarehouseStock + t.quantity,
      };
    }

    function rejectTransfer(t: TransferSimulation, reason: string): TransferSimulation {
      if (!reason || reason.trim().length < 3) {
        throw new Error('Причина отклонения обязательна');
      }
      if (t.status !== StockTransferStatus.REQUESTED && t.status !== StockTransferStatus.IN_TRANSIT) {
        throw new Error(`Перемещение в статусе ${t.status} не может быть отклонено`);
      }

      // Если было IN_TRANSIT — возвращаем остаток на склад-отправитель
      const restoredSourceStock =
        t.status === StockTransferStatus.IN_TRANSIT
          ? t.sourceWarehouseStock + t.quantity
          : t.sourceWarehouseStock;

      return {
        ...t,
        status: StockTransferStatus.REJECTED,
        sourceWarehouseStock: restoredSourceStock,
      };
    }

    test('Full successful transfer flow: REQUESTED -> IN_TRANSIT -> COMPLETED', () => {
      const initial: TransferSimulation = {
        id: 'tr-1',
        status: StockTransferStatus.REQUESTED,
        sourceWarehouseStock: 50,
        targetWarehouseStock: 10,
        quantity: 15,
      };

      const dispatched = dispatchTransfer(initial);
      assert.strictEqual(dispatched.status, StockTransferStatus.IN_TRANSIT);
      assert.strictEqual(dispatched.sourceWarehouseStock, 35);
      assert.strictEqual(dispatched.targetWarehouseStock, 10);

      const completed = receiveTransfer(dispatched);
      assert.strictEqual(completed.status, StockTransferStatus.COMPLETED);
      assert.strictEqual(completed.sourceWarehouseStock, 35);
      assert.strictEqual(completed.targetWarehouseStock, 25);
    });

    test('Transfer rejection during IN_TRANSIT rolls back stock to source warehouse', () => {
      const inTransitState: TransferSimulation = {
        id: 'tr-2',
        status: StockTransferStatus.IN_TRANSIT,
        sourceWarehouseStock: 30, // 20 already deducted from 50
        targetWarehouseStock: 5,
        quantity: 20,
      };

      const rejected = rejectTransfer(inTransitState, 'Повреждение упаковки при транспортировке');
      assert.strictEqual(rejected.status, StockTransferStatus.REJECTED);
      assert.strictEqual(rejected.sourceWarehouseStock, 50); // Restored!
      assert.strictEqual(rejected.targetWarehouseStock, 5);
    });

    test('Transfer rejection in REQUESTED status does not double-restore stock', () => {
      const requestedState: TransferSimulation = {
        id: 'tr-3',
        status: StockTransferStatus.REQUESTED,
        sourceWarehouseStock: 50,
        targetWarehouseStock: 5,
        quantity: 10,
      };

      const rejected = rejectTransfer(requestedState, 'Нет свободного транспорта');
      assert.strictEqual(rejected.status, StockTransferStatus.REJECTED);
      assert.strictEqual(rejected.sourceWarehouseStock, 50);
      assert.strictEqual(rejected.targetWarehouseStock, 5);
    });

    test('Rejects invalid status transitions', () => {
      const completed: TransferSimulation = {
        id: 'tr-4',
        status: StockTransferStatus.COMPLETED,
        sourceWarehouseStock: 35,
        targetWarehouseStock: 25,
        quantity: 15,
      };

      assert.throws(() => dispatchTransfer(completed), /Невозможно отгрузить перемещение в статусе COMPLETED/);
      assert.throws(() => receiveTransfer(completed), /Перемещение не находится в статусе IN_TRANSIT/);
      assert.throws(() => rejectTransfer(completed, 'Ошибка'), /Перемещение в статусе COMPLETED не может быть отклонено/);
    });
  });

  // ─── 4. Inventory Reconciliation & Adjustment Calculation ───
  describe('Inventory Reconciliation Algorithm', () => {
    interface InventoryItemCheck {
      id: string;
      expectedQty: number;
      actualQty: number;
    }

    function reconcileInventory(items: InventoryItemCheck[]) {
      const discrepancies = items
        .map((i) => {
          const diff = i.actualQty - i.expectedQty;
          return {
            ...i,
            diffQty: diff,
            hasDiscrepancy: diff !== 0,
          };
        })
        .filter((i) => i.hasDiscrepancy);

      const adjustmentsToCreate = discrepancies.map((d) => ({
        itemId: d.id,
        adjustmentQty: Math.abs(d.diffQty),
        type: d.diffQty < 0 ? 'SHORTAGE_WRITEOFF' : 'SURPLUS_POSTING',
        newStockQty: d.actualQty,
      }));

      return {
        discrepanciesCount: discrepancies.length,
        adjustmentsToCreate,
      };
    }

    test('Calculates shortages, surpluses and adjustments correctly', () => {
      const countSheet: InventoryItemCheck[] = [
        { id: 'item-1', expectedQty: 10, actualQty: 10 }, // match
        { id: 'item-2', expectedQty: 15, actualQty: 12 }, // shortage of 3
        { id: 'item-3', expectedQty: 5, actualQty: 8 },   // surplus of 3
      ];

      const result = reconcileInventory(countSheet);
      assert.strictEqual(result.discrepanciesCount, 2);
      assert.strictEqual(result.adjustmentsToCreate.length, 2);

      // Item 2: Shortage
      assert.strictEqual(result.adjustmentsToCreate[0].itemId, 'item-2');
      assert.strictEqual(result.adjustmentsToCreate[0].adjustmentQty, 3);
      assert.strictEqual(result.adjustmentsToCreate[0].type, 'SHORTAGE_WRITEOFF');
      assert.strictEqual(result.adjustmentsToCreate[0].newStockQty, 12);

      // Item 3: Surplus
      assert.strictEqual(result.adjustmentsToCreate[1].itemId, 'item-3');
      assert.strictEqual(result.adjustmentsToCreate[1].adjustmentQty, 3);
      assert.strictEqual(result.adjustmentsToCreate[1].type, 'SURPLUS_POSTING');
      assert.strictEqual(result.adjustmentsToCreate[1].newStockQty, 8);
    });

    test('Zero discrepancies returns empty adjustments list', () => {
      const cleanCountSheet: InventoryItemCheck[] = [
        { id: 'item-1', expectedQty: 10, actualQty: 10 },
        { id: 'item-2', expectedQty: 25, actualQty: 25 },
      ];

      const result = reconcileInventory(cleanCountSheet);
      assert.strictEqual(result.discrepanciesCount, 0);
      assert.strictEqual(result.adjustmentsToCreate.length, 0);
    });
  });
});
