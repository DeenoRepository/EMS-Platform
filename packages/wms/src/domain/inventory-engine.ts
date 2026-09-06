export interface InventoryCountRow {
  id: string;
  nomenclatureId: string;
  expectedQty: number;
  actualQty: number;
}

export interface InventoryDiscrepancy {
  id: string;
  nomenclatureId: string;
  expectedQty: number;
  actualQty: number;
  diffQty: number; // actual - expected
  type: 'SHORTAGE' | 'SURPLUS' | 'MATCH';
}

export interface InventoryReconciliationResult {
  discrepancies: InventoryDiscrepancy[];
  shortageCount: number;
  surplusCount: number;
  matchCount: number;
}

/**
 * Pure domain algorithm for inventory reconciliation and discrepancy calculation.
 */
export function reconcileInventoryCounts(
  items: InventoryCountRow[]
): InventoryReconciliationResult {
  const discrepancies: InventoryDiscrepancy[] = [];
  let shortageCount = 0;
  let surplusCount = 0;
  let matchCount = 0;

  for (const item of items) {
    const expected = Number(item.expectedQty) || 0;
    const actual = Number(item.actualQty) || 0;
    const diff = actual - expected;

    let type: 'SHORTAGE' | 'SURPLUS' | 'MATCH' = 'MATCH';
    if (diff < 0) {
      type = 'SHORTAGE';
      shortageCount++;
    } else if (diff > 0) {
      type = 'SURPLUS';
      surplusCount++;
    } else {
      matchCount++;
    }

    discrepancies.push({
      id: item.id,
      nomenclatureId: item.nomenclatureId,
      expectedQty: expected,
      actualQty: actual,
      diffQty: diff,
      type,
    });
  }

  return {
    discrepancies,
    shortageCount,
    surplusCount,
    matchCount,
  };
}
