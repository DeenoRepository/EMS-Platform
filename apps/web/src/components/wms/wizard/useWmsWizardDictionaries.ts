import { useState, useEffect, useMemo } from 'react';
import {
  WarehouseOption,
  EquipmentOption,
  NomenclatureOption,
  CategoryOption,
} from './types';

export function useWmsWizardDictionaries(
  open: boolean,
  userId?: string,
  initialNomenclatureId?: string
) {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [transferWarehouses, setTransferWarehouses] = useState<WarehouseOption[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [nomenclatures, setNomenclatures] = useState<NomenclatureOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch('/api/wms/warehouses').then((r) => r.json()),
        fetch('/api/wms/warehouses?forTransfer=true').then((r) => r.json()),
        fetch('/api/eps/equipment?pageSize=1000').then((r) => r.json()),
        fetch('/api/wms/nomenclature?limit=500').then((r) => r.json()),
        fetch('/api/wms/categories').then((r) => r.json()).catch(() => ({ success: false })),
      ])
        .then(([whData, transferWhData, eqData, nomData, catData]) => {
          if (whData.success && whData.data) {
            setWarehouses(whData.data);
            const userWh = whData.data.find((w: WarehouseOption) => w.responsibleUserId === userId) || whData.data[0];
            if (userWh) {
              setWarehouseId(userWh.id);
            }
          }
          if (transferWhData.success && transferWhData.data) {
            setTransferWarehouses(transferWhData.data);
            const userWh = whData.data?.find((w: WarehouseOption) => w.responsibleUserId === userId) || whData.data?.[0];
            const targetWh = transferWhData.data.find((w: WarehouseOption) => w.id !== userWh?.id) || transferWhData.data[0];
            if (targetWh) {
              setTargetWarehouseId(targetWh.id);
            }
          }
          if (eqData.success) {
            setEquipmentList(eqData.data.items || eqData.data || []);
          }
          if (nomData.success) {
            const nomList = nomData.data.items || nomData.data || [];
            setNomenclatures(nomList);
          }
          if (catData.success && catData.data) {
            setCategories(catData.data);
          }
        })
        .catch(console.error);
    }
  }, [open, userId, initialNomenclatureId]);

  const assignedWarehouse = useMemo(() => {
    if (!warehouses.length) return null;
    const userWh = warehouses.find((w) => w.responsibleUserId === userId);
    if (userWh) return userWh;
    return warehouses[0];
  }, [warehouses, userId]);

  return {
    warehouses,
    transferWarehouses,
    equipmentList,
    nomenclatures,
    setNomenclatures,
    categories,
    warehouseId,
    setWarehouseId,
    targetWarehouseId,
    setTargetWarehouseId,
    assignedWarehouse,
  };
}
