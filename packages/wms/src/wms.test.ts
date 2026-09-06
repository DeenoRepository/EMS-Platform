import { test, describe } from 'node:test';
import assert from 'node:assert';
import { OperationType, StockTransferStatus } from '@ems/database';
import { calculateStockIssue, validatePositiveQuantity, isDeductingOperation } from './domain/stock-engine';
import { dispatchTransfer, receiveTransfer, rejectTransfer, TransferState } from './domain/transfer-engine';
import { reconcileInventoryCounts, InventoryCountRow } from './domain/inventory-engine';

describe('Modular WMS Domain Package (@ems/wms)', () => {
  // ─── 1. Stock Calculations & Overdraft Invariants ───
  describe('Stock Engine', () => {
    test('validatePositiveQuantity accepts valid positive numbers', () => {
      assert.strictEqual(validatePositiveQuantity(5), 5);
      assert.strictEqual(validatePositiveQuantity('12.5'), 12.5);
    });

    test('validatePositiveQuantity rejects non-positive or invalid quantities', () => {
      assert.throws(() => validatePositiveQuantity(0), /больше нуля/);
      assert.throws(() => validatePositiveQuantity(-3), /больше нуля/);
      assert.throws(() => validatePositiveQuantity(NaN), /больше нуля/);
      assert.throws(() => validatePositiveQuantity(Infinity), /больше нуля/);
    });

    test('calculateStockIssue deducts stock cleanly and triggers low stock alert when applicable', () => {
      const res = calculateStockIssue(20, 15, 10);
      assert.strictEqual(res.newQuantity, 5);
      assert.strictEqual(res.isLowStock, true);
    });

    test('calculateStockIssue strictly throws on overdraft', () => {
      assert.throws(() => calculateStockIssue(10, 15), /Недостаточно остатка/);
    });

    test('isDeductingOperation correctly identifies issue and transfer types', () => {
      assert.strictEqual(isDeductingOperation(OperationType.RECEIPT), false);
      assert.strictEqual(isDeductingOperation(OperationType.ISSUE), true);
      assert.strictEqual(isDeductingOperation(OperationType.ISSUE_WRITE_OFF), true);
      assert.strictEqual(isDeductingOperation(OperationType.TRANSFER), true);
    });

    test('low stock notification threshold triggers when balance falls to or below minStock', () => {
      const atThreshold = calculateStockIssue(10, 5, 5);
      assert.strictEqual(atThreshold.newQuantity, 5);
      assert.strictEqual(atThreshold.isLowStock, true);

      const belowThreshold = calculateStockIssue(10, 8, 5);
      assert.strictEqual(belowThreshold.newQuantity, 2);
      assert.strictEqual(belowThreshold.isLowStock, true);

      const aboveThreshold = calculateStockIssue(10, 2, 5);
      assert.strictEqual(aboveThreshold.newQuantity, 8);
      assert.strictEqual(aboveThreshold.isLowStock, false);

      const noMinStock = calculateStockIssue(10, 8, null);
      assert.strictEqual(noMinStock.newQuantity, 2);
      assert.strictEqual(noMinStock.isLowStock, false);
    });
  });

  // ─── 2. Stock Transfer State Machine ───
  describe('Transfer Engine', () => {
    test('State pipeline: REQUESTED -> IN_TRANSIT -> COMPLETED', () => {
      const initial: TransferState = {
        id: 'tr-test-1',
        status: StockTransferStatus.REQUESTED,
        sourceWarehouseStock: 100,
        targetWarehouseStock: 20,
        transferQty: 30,
      };

      const inTransit = dispatchTransfer(initial);
      assert.strictEqual(inTransit.status, StockTransferStatus.IN_TRANSIT);
      assert.strictEqual(inTransit.sourceWarehouseStock, 70);

      const completed = receiveTransfer(inTransit);
      assert.strictEqual(completed.status, StockTransferStatus.COMPLETED);
      assert.strictEqual(completed.targetWarehouseStock, 50);
    });

    test('Rejection during IN_TRANSIT safely restores source warehouse stock', () => {
      const inTransit: TransferState = {
        id: 'tr-test-2',
        status: StockTransferStatus.IN_TRANSIT,
        sourceWarehouseStock: 40,
        targetWarehouseStock: 10,
        transferQty: 25,
      };

      const rejected = rejectTransfer(inTransit, 'Транспортная поломка');
      assert.strictEqual(rejected.status, StockTransferStatus.REJECTED);
      assert.strictEqual(rejected.sourceWarehouseStock, 65);
      assert.strictEqual(rejected.targetWarehouseStock, 10);
    });
  });

  // ─── 3. Inventory Reconciliation ───
  describe('Inventory Engine', () => {
    test('Accurately identifies shortages and surpluses', () => {
      const counts: InventoryCountRow[] = [
        { id: '1', nomenclatureId: 'nom-a', expectedQty: 10, actualQty: 10 },
        { id: '2', nomenclatureId: 'nom-b', expectedQty: 20, actualQty: 18 }, // shortage of 2
        { id: '3', nomenclatureId: 'nom-c', expectedQty: 5, actualQty: 7 },   // surplus of 2
      ];

      const result = reconcileInventoryCounts(counts);
      assert.strictEqual(result.matchCount, 1);
      assert.strictEqual(result.shortageCount, 1);
      assert.strictEqual(result.surplusCount, 1);
      assert.strictEqual(result.discrepancies[1].diffQty, -2);
      assert.strictEqual(result.discrepancies[2].diffQty, 2);
    });
  });
});
