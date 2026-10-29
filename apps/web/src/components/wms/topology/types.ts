export interface StorageCell {
  id: string;
  zoneId: string;
  code: string;
  name?: string | null;
  _count?: {
    stockItems: number;
  };
}

export interface StorageZone {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  description?: string | null;
  cells: StorageCell[];
}

export function generateCellCodes(prefix: string, racks: number, tiers: number, slots: number): string[] {
  const codes: string[] = [];
  for (let r = 1; r <= racks; r++) {
    const rackStr = r.toString().padStart(2, '0');
    for (let t = 1; t <= tiers; t++) {
      const tierStr = t.toString().padStart(2, '0');
      if (slots > 1) {
        for (let s = 1; s <= slots; s++) {
          codes.push(`${prefix}-${rackStr}-${tierStr}-${s}`);
        }
      } else {
        codes.push(`${prefix}-${rackStr}-${tierStr}`);
      }
    }
  }
  return codes;
}
