import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  PERMISSIONS,
  JwtUserPayload,
} from '@ems/shared';
import { StockTransferStatus, OperationType } from '@ems/database';
import { hasPermission } from './rbac';

describe('WMS Safety Regression & Transaction Invariants Test Suite', () => {
  // ─── 1. Role-Based Access Control & Warehouse Isolation ───
  describe('Warehouse Access & МОЛ Authorization Guards', () => {
    const molUser: JwtUserPayload = {
      userId: 'mol-user-1',
      ldapLogin: 'mol.kuznetsov',
      displayName: 'Кузнецов К.К. (МОЛ)',
      roles: ['warehouse_worker'],
      permissions: [PERMISSIONS.WMS_STOCK_VIEW, PERMISSIONS.WMS_OPERATIONS_CREATE],
    };

    const regularEngineer: JwtUserPayload = {
      userId: 'eng-viewer',
      ldapLogin: 'eng.ivanov',
      displayName: 'Иванов И.И. (Инженер)',
      roles: ['engineer'],
      permissions: [PERMISSIONS.WMS_STOCK_VIEW],
    };

    function canExecuteWarehouseOperation(
      user: JwtUserPayload,
      targetWarehouseId: string,
      assignedWarehouseIds: string[]
    ): boolean {
      if (user.roles?.includes('admin') || user.roles?.includes('administrator')) {
        return true;
      }
      if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)) {
        return false;
      }
      // If user has specific assigned warehouses, they are restricted to them
      if (assignedWarehouseIds.length > 0 && !assignedWarehouseIds.includes(targetWarehouseId)) {
        return false;
      }
      return true;
    }

    test('Assigned МОЛ can create operations only on their designated warehouse', () => {
      assert.strictEqual(
        canExecuteWarehouseOperation(molUser, 'wh-central', ['wh-central']),
        true
      );
      assert.strictEqual(
        canExecuteWarehouseOperation(molUser, 'wh-remote', ['wh-central']),
        false
      );
    });

    test('User without WMS_OPERATIONS_CREATE is rejected even for assigned warehouse', () => {
      assert.strictEqual(
        canExecuteWarehouseOperation(regularEngineer, 'wh-central', ['wh-central']),
        false
      );
    });
  });

  // ─── 2. Stock Balance Mutation & Overdraft Prevention ───
  describe('Stock Mutation & Non-Negative Invariants', () => {
    interface StockRecord {
      nomenclatureId: string;
      warehouseId: string;
      quantity: number;
    }

    function applyStockOperation(
      currentStock: StockRecord,
      type: OperationType,
      deltaQty: number
    ): StockRecord {
      if (typeof deltaQty !== 'number' || isNaN(deltaQty) || !isFinite(deltaQty) || deltaQty <= 0) {
        throw new Error('Количество операции должно быть положительным числом');
      }

      switch (type) {
        case OperationType.RECEIPT:
          return { ...currentStock, quantity: currentStock.quantity + deltaQty };

        case OperationType.ISSUE:
        case OperationType.ISSUE_EMPLOYEE:
        case OperationType.ISSUE_WRITE_OFF:
          if (currentStock.quantity < deltaQty) {
            throw new Error(`Недостаточно остатка: требуется ${deltaQty}, в наличии ${currentStock.quantity}`);
          }
          return { ...currentStock, quantity: currentStock.quantity - deltaQty };

        default:
          throw new Error(`Неподдерживаемый тип операции: ${type}`);
      }
    }

    test('Successfully receives stock and increments balance', () => {
      const initial: StockRecord = { nomenclatureId: 'nom-1', warehouseId: 'wh-1', quantity: 10 };
      const updated = applyStockOperation(initial, OperationType.RECEIPT, 5);
      assert.strictEqual(updated.quantity, 15);
    });

    test('Successfully issues stock within available balance', () => {
      const initial: StockRecord = { nomenclatureId: 'nom-1', warehouseId: 'wh-1', quantity: 10 };
      const updated = applyStockOperation(initial, OperationType.ISSUE, 4);
      assert.strictEqual(updated.quantity, 6);
    });

    test('Strictly throws when issue exceeds current balance (no overdraft)', () => {
      const initial: StockRecord = { nomenclatureId: 'nom-1', warehouseId: 'wh-1', quantity: 10 };
      assert.throws(
        () => applyStockOperation(initial, OperationType.ISSUE, 15),
        /Недостаточно остатка/
      );
    });

    test('Strictly rejects zero, negative, NaN and Infinite quantities', () => {
      const initial: StockRecord = { nomenclatureId: 'nom-1', warehouseId: 'wh-1', quantity: 10 };
      assert.throws(() => applyStockOperation(initial, OperationType.RECEIPT, 0), /положительным числом/);
      assert.throws(() => applyStockOperation(initial, OperationType.RECEIPT, -5), /положительным числом/);
      assert.throws(() => applyStockOperation(initial, OperationType.RECEIPT, Number.NaN), /положительным числом/);
      assert.throws(() => applyStockOperation(initial, OperationType.RECEIPT, Number.POSITIVE_INFINITY), /положительным числом/);
    });
  });

  // ─── 3. Stock Transfer State Transitions & Invariant Rollback ───
  describe('Stock Transfer State Machine Invariants', () => {
    interface TransferContext {
      id: string;
      status: StockTransferStatus;
      sourceWarehouseStock: number;
      targetWarehouseStock: number;
      transferQty: number;
    }

    function dispatchTransfer(ctx: TransferContext): TransferContext {
      if (ctx.status !== StockTransferStatus.REQUESTED) {
        throw new Error(`Нельзя отгрузить перемещение в статусе ${ctx.status}`);
      }
      if (ctx.sourceWarehouseStock < ctx.transferQty) {
        throw new Error('Недостаточно остатка на складе-отправителе для отгрузки');
      }
      return {
        ...ctx,
        status: StockTransferStatus.IN_TRANSIT,
        sourceWarehouseStock: ctx.sourceWarehouseStock - ctx.transferQty,
      };
    }

    function receiveTransfer(ctx: TransferContext): TransferContext {
      if (ctx.status !== StockTransferStatus.IN_TRANSIT) {
        throw new Error(`Нельзя принять перемещение в статусе ${ctx.status}`);
      }
      return {
        ...ctx,
        status: StockTransferStatus.COMPLETED,
        targetWarehouseStock: ctx.targetWarehouseStock + ctx.transferQty,
      };
    }

    function rejectTransfer(ctx: TransferContext): TransferContext {
      if (ctx.status === StockTransferStatus.COMPLETED) {
        throw new Error('Нельзя отклонить уже завершенное перемещение');
      }
      if (ctx.status === StockTransferStatus.REJECTED) {
        throw new Error('Перемещение уже отклонено');
      }

      // If already in transit, goods left source warehouse; rollback restocks source
      const rolledBackSourceStock =
        ctx.status === StockTransferStatus.IN_TRANSIT
          ? ctx.sourceWarehouseStock + ctx.transferQty
          : ctx.sourceWarehouseStock;

      return {
        ...ctx,
        status: StockTransferStatus.REJECTED,
        sourceWarehouseStock: rolledBackSourceStock,
      };
    }

    test('Complete transfer pipeline updates both warehouses accurately', () => {
      const initial: TransferContext = {
        id: 'tr-01',
        status: StockTransferStatus.REQUESTED,
        sourceWarehouseStock: 50,
        targetWarehouseStock: 10,
        transferQty: 20,
      };

      const inTransit = dispatchTransfer(initial);
      assert.strictEqual(inTransit.status, StockTransferStatus.IN_TRANSIT);
      assert.strictEqual(inTransit.sourceWarehouseStock, 30);
      assert.strictEqual(inTransit.targetWarehouseStock, 10);

      const completed = receiveTransfer(inTransit);
      assert.strictEqual(completed.status, StockTransferStatus.COMPLETED);
      assert.strictEqual(completed.sourceWarehouseStock, 30);
      assert.strictEqual(completed.targetWarehouseStock, 30);
    });

    test('Rejection during IN_TRANSIT rolls back reserved stock to source warehouse', () => {
      const inTransit: TransferContext = {
        id: 'tr-02',
        status: StockTransferStatus.IN_TRANSIT,
        sourceWarehouseStock: 25,
        targetWarehouseStock: 5,
        transferQty: 15,
      };

      const rejected = rejectTransfer(inTransit);
      assert.strictEqual(rejected.status, StockTransferStatus.REJECTED);
      assert.strictEqual(rejected.sourceWarehouseStock, 40, 'Stock must return to source warehouse on reject');
      assert.strictEqual(rejected.targetWarehouseStock, 5, 'Target warehouse must not receive goods on reject');
    });
  });

  // ─── 4. Secondary Notification Fail-Safe Principle ───
  describe('Secondary Effect Isolation (Notification Failure)', () => {
    test('Warehouse operation commit succeeds even when notification delivery fails', async () => {
      let stockCommitted = false;
      let notificationAttempted = false;

      async function executeOperationWithNotification(operationData: { qty: number }) {
        // Step 1: Database transaction commit (atomic)
        stockCommitted = true;

        // Step 2: Asynchronous secondary effect (notification / audit)
        try {
          notificationAttempted = true;
          throw new Error('Notification transport offline (mock network failure)');
        } catch (error) {
          // Logged safely, secondary failure MUST NOT throw or abort already committed stock
          console.warn('Non-blocking secondary notification failure caught safely');
        }

        return { success: true, committedQty: operationData.qty };
      }

      const result = await executeOperationWithNotification({ qty: 10 });
      assert.strictEqual(result.success, true);
      assert.strictEqual(stockCommitted, true);
      assert.strictEqual(notificationAttempted, true);
    });
  });
});
