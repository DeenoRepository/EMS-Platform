export interface ShortageStockRow {
  id: string;
  warehouseId: string;
  nomenclatureId: string;
  quantity: unknown;
  nomenclature: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
    minStock: unknown;
    deletedAt?: Date | string | null;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

export interface ShortageSuggestion {
  stockItemId: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  nomenclatureId: string;
  name: string;
  article: string | null;
  unit: string;
  quantity: number;
  minStock: number;
  shortageQty: number;
}

/**
 * Returns a suggestion exactly when quantity < minStock. Equality is not a
 * shortage for PRM suggestions. Deleted nomenclature is always excluded.
 */
export function calculateShortageSuggestions(rows: ShortageStockRow[]): ShortageSuggestion[] {
  return rows.flatMap((row) => {
    const quantity = Number(row.quantity);
    const minStock = row.nomenclature.minStock === null ? null : Number(row.nomenclature.minStock);

    if (row.nomenclature.deletedAt || minStock === null || !Number.isFinite(minStock) || quantity >= minStock) {
      return [];
    }

    return [{
      stockItemId: row.id,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouse.name,
      warehouseCode: row.warehouse.code,
      nomenclatureId: row.nomenclatureId,
      name: row.nomenclature.name,
      article: row.nomenclature.article ?? null,
      unit: row.nomenclature.unit,
      quantity,
      minStock,
      shortageQty: minStock - quantity,
    }];
  });
}
