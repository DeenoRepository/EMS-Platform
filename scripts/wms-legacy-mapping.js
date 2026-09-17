#!/usr/bin/env node

const SUPPORTED_OPERATION_TYPES = new Set([
  'RECEIPT',
  'ISSUE',
  'ISSUE_EMPLOYEE',
  'ISSUE_WRITE_OFF',
]);

function mapLegacyOperation(operation) {
  const movements = [];
  const violations = [];

  if (!SUPPORTED_OPERATION_TYPES.has(operation.type)) {
    return {
      movements,
      violations: [{
        sourceType: 'StockOperation',
        sourceId: operation.id,
        reason: 'AMBIGUOUS_LEGACY_OPERATION_TYPE',
        type: operation.type,
      }],
    };
  }

  for (const item of operation.items || []) {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      violations.push({
        sourceType: 'StockOperationItem',
        sourceId: item.id,
        reason: 'INVALID_QUANTITY',
      });
      continue;
    }

    movements.push({
      sourceId: item.id,
      operationId: operation.id,
      warehouseId: operation.warehouseId,
      nomenclatureId: item.nomenclatureId,
      eventType: operation.type === 'RECEIPT' ? 'RECEIPT' : 'ISSUE',
      deltaQuantity: operation.type === 'RECEIPT' ? String(quantity) : String(-quantity),
    });
  }

  return { movements, violations };
}

function mapLegacyInventory(inventory) {
  const movements = [];
  const violations = [];

  for (const item of inventory.items || []) {
    if (item.actualQty === null || item.actualQty === undefined) {
      violations.push({
        sourceType: 'InventoryItem',
        sourceId: item.id,
        reason: 'MISSING_ACTUAL_QUANTITY',
      });
      continue;
    }

    const expected = Number(item.expectedQty);
    const actual = Number(item.actualQty);
    const delta = actual - expected;
    if (!Number.isFinite(expected) || !Number.isFinite(actual) || actual < 0 || delta === 0) continue;

    movements.push({
      sourceId: item.id,
      inventoryId: inventory.id,
      warehouseId: inventory.warehouseId,
      nomenclatureId: item.nomenclatureId,
      eventType: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      deltaQuantity: String(delta),
      requiresReview: true,
    });
  }

  return { movements, violations };
}

function auditLegacyRecords({ operations = [], inventories = [], transfers = [], stockItems = [] }) {
  const mapped = [];
  const violations = [];

  for (const operation of operations) {
    const result = mapLegacyOperation(operation);
    mapped.push(...result.movements);
    violations.push(...result.violations);
  }
  for (const inventory of inventories) {
    const result = mapLegacyInventory(inventory);
    mapped.push(...result.movements);
    violations.push(...result.violations);
  }

  for (const transfer of transfers) {
    violations.push({
      sourceType: 'StockTransfer',
      sourceId: transfer.id,
      reason: 'TRANSFER_REQUIRES_STATUS_AND_STOCK_TIMELINE_REVIEW',
      status: transfer.status,
    });
  }

  const knownKeys = new Set(stockItems.map((item) => `${item.warehouseId}:${item.nomenclatureId}`));
  for (const movement of mapped) {
    const key = `${movement.warehouseId}:${movement.nomenclatureId}`;
    if (!knownKeys.has(key)) {
      violations.push({
        sourceType: 'StockMovement',
        sourceId: movement.sourceId,
        reason: 'NO_CURRENT_STOCK_ROW',
      });
    }
  }

  return {
    readOnly: true,
    canBackfill: false,
    mapped,
    violations,
    summary: {
      operations: operations.length,
      inventories: inventories.length,
      transfers: transfers.length,
      stockItems: stockItems.length,
      mappedMovements: mapped.length,
      violations: violations.length,
    },
  };
}

module.exports = {
  auditLegacyRecords,
  mapLegacyInventory,
  mapLegacyOperation,
};
