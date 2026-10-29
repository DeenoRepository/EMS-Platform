import { useState, useEffect, useCallback, useMemo } from 'react';
import { NomenclatureOption, ZoneWithCells } from './types';

export function useWarehouseStockAndZones(warehouseId: string, setNomenclatures: React.Dispatch<React.SetStateAction<NomenclatureOption[]>>) {
  const [warehouseZones, setWarehouseZones] = useState<ZoneWithCells[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, { quantity: number; cell?: string }>>({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  const fetchStock = useCallback(async (whId: string) => {
    if (!whId) {
      setStockMap({});
      return;
    }
    setIsLoadingStock(true);
    try {
      const res = await fetch(`/api/wms/stock?warehouseId=${whId}&pageSize=1000`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const map: Record<string, { quantity: number; cell?: string }> = {};
          const stockNoms: NomenclatureOption[] = [];
          (json.data.items || []).forEach((s: any) => {
            map[s.nomenclatureId] = {
              quantity: Number(s.quantity),
              cell: s.cell?.code || s.cell?.name,
            };
            stockNoms.push({
              id: s.nomenclatureId,
              name: s.name,
              article: s.article && s.article !== '—' ? s.article : undefined,
              unit: s.unit || 'шт',
              category: s.category ? { name: s.category } : null,
            });
          });
          setStockMap(map);
          if (stockNoms.length > 0) {
            setNomenclatures((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const missing = stockNoms.filter((sn) => !existingIds.has(sn.id));
              return missing.length > 0 ? [...prev, ...missing] : prev;
            });
          }
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки остатков склада:', err);
    } finally {
      setIsLoadingStock(false);
    }
  }, [setNomenclatures]);

  useEffect(() => {
    if (warehouseId) {
      fetchStock(warehouseId);
      fetch(`/api/wms/warehouses/${warehouseId}/zones`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setWarehouseZones(json.data);
          } else {
            setWarehouseZones([]);
          }
        })
        .catch(() => setWarehouseZones([]));
    } else {
      setStockMap({});
      setWarehouseZones([]);
    }
  }, [warehouseId, fetchStock]);

  const flatWarehouseCells = useMemo(() => {
    return warehouseZones.flatMap((zone) =>
      zone.cells.map((cell) => ({
        id: cell.id,
        code: cell.code,
        name: cell.name,
        zoneName: `${zone.name} (${zone.code})`,
      }))
    );
  }, [warehouseZones]);

  return {
    warehouseZones,
    setWarehouseZones,
    stockMap,
    isLoadingStock,
    flatWarehouseCells,
  };
}
