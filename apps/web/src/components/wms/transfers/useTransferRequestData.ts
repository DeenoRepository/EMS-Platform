import { useState, useEffect } from 'react';
import {
  WarehouseOption,
  NomenclatureOption,
  NOMENCLATURE_FETCH_LIMIT,
  STOCK_FETCH_PAGE_SIZE,
} from './TransferRequestSubcomponents';

function selectDefaultWarehouses(warehouses: WarehouseOption[], userId?: string) {
  const myWh = warehouses.find((w) => w.responsibleUserId === userId) || warehouses[0];
  if (!myWh) return { targetId: '', sourceId: '' };
  const firstDonor = warehouses.find((w) => w.id !== myWh.id);
  return {
    targetId: myWh.id,
    sourceId: firstDonor ? firstDonor.id : '',
  };
}

async function fetchTransferWarehouses(
  userId: string | undefined,
  setWarehouses: (w: WarehouseOption[]) => void,
  setTargetWarehouseId: (id: string) => void,
  setSourceWarehouseId: (id: string) => void
) {
  try {
    const r = await fetch('/api/wms/warehouses?forTransfer=true');
    const json = await r.json();
    if (!json.success || !Array.isArray(json.data)) return;
    setWarehouses(json.data);
    const { targetId, sourceId } = selectDefaultWarehouses(json.data, userId);
    if (targetId) setTargetWarehouseId(targetId);
    if (sourceId) setSourceWarehouseId(sourceId);
  } catch (err) {
    console.error(err);
  }
}

async function fetchTransferNomenclature(setNomenclatures: (n: NomenclatureOption[]) => void) {
  try {
    const r = await fetch(`/api/wms/nomenclature?limit=${NOMENCLATURE_FETCH_LIMIT}`);
    const json = await r.json();
    if (json.success) {
      setNomenclatures(json.data.items || json.data || []);
    }
  } catch (err) {
    console.error(err);
  }
}

function useWarehouseAndNomenclatureInit(open: boolean, userId?: string) {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureOption[]>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');

  useEffect(() => {
    if (!open) return;
    setSourceWarehouseId('');
    fetchTransferWarehouses(userId, setWarehouses, setTargetWarehouseId, setSourceWarehouseId);
    fetchTransferNomenclature(setNomenclatures);
  }, [open, userId]);

  return {
    warehouses,
    nomenclatures,
    sourceWarehouseId,
    setSourceWarehouseId,
    targetWarehouseId,
  };
}

function useStockMapFetch(sourceWarehouseId: string) {
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  useEffect(() => {
    if (!sourceWarehouseId) {
      setStockMap({});
      return;
    }
    setIsLoadingStock(true);
    fetch(`/api/wms/stock?warehouseId=${sourceWarehouseId}&pageSize=${STOCK_FETCH_PAGE_SIZE}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const map: Record<string, number> = {};
          (json.data.items || []).forEach((s: { nomenclatureId: string; quantity: string | number }) => {
            map[s.nomenclatureId] = Number(s.quantity);
          });
          setStockMap(map);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingStock(false));
  }, [sourceWarehouseId]);

  return { stockMap, isLoadingStock };
}

export function useTransferRequestData(open: boolean, userId?: string) {
  const initData = useWarehouseAndNomenclatureInit(open, userId);
  const stockData = useStockMapFetch(initData.sourceWarehouseId);

  return {
    ...initData,
    ...stockData,
  };
}

