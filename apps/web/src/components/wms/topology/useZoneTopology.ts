import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { useConfirm } from '@/components/ui';
import { StorageZone } from './types';
import { fetchWarehouseZones, createZoneApi, deleteZoneApi } from './topologyApi';

interface WarehouseRef {
  id: string;
  name: string;
  code: string;
  responsibleUserId?: string | null;
}

interface UseZoneTopologyParams {
  warehouse: WarehouseRef | null;
  open: boolean;
  onRefreshParent?: () => void;
}

export function useZoneTopology({ warehouse, open, onRefreshParent }: UseZoneTopologyParams) {
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();

  const [zones, setZones] = useState<StorageZone[]>([]);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCode, setNewZoneCode] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [isSavingZone, setIsSavingZone] = useState(false);

  const fetchZones = useCallback(async () => {
    if (!warehouse) return;
    setIsLoading(true);
    try {
      const data = await fetchWarehouseZones(warehouse.id);
      setZones(data);
      if (data.length > 0 && selectedZoneIndex >= data.length) {
        setSelectedZoneIndex(0);
      }
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Не удалось загрузить топологию склада', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [warehouse, selectedZoneIndex, enqueueSnackbar]);

  useEffect(() => {
    if (open && warehouse) {
      fetchZones();
    }
  }, [open, warehouse, fetchZones]);

  const activeZone = zones[selectedZoneIndex] || null;

  const totalCellsInWarehouse = useMemo(
    () => zones.reduce((sum, z) => sum + z.cells.length, 0),
    [zones]
  );

  const totalOccupiedCells = useMemo(
    () => zones.reduce((sum, z) => sum + z.cells.filter((c) => (c._count?.stockItems || 0) > 0).length, 0),
    [zones]
  );

  const handleCreateZoneSubmit = async () => {
    if (!warehouse || !newZoneName.trim() || !newZoneCode.trim()) {
      enqueueSnackbar('Заполните наименование и код зоны', { variant: 'warning' });
      return;
    }
    setIsSavingZone(true);
    try {
      await createZoneApi(warehouse.id, newZoneName, newZoneCode, newZoneDesc);
      enqueueSnackbar('Зона адресного хранения создана', { variant: 'success' });
      setNewZoneName('');
      setNewZoneCode('');
      setNewZoneDesc('');
      setIsCreateZoneOpen(false);
      await fetchZones();
      setSelectedZoneIndex(zones.length);
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Ошибка создания зоны', { variant: 'error' });
    } finally {
      setIsSavingZone(false);
    }
  };

  const handleDeleteZone = async (zone: StorageZone) => {
    if (!warehouse) return;
    const ok = await confirm({
      title: `Удалить зону "${zone.name}"?`,
      message: `Все ячейки (${zone.cells.length} шт.) будут удалены. Если в ячейках есть остатки ТМЦ, они станут без привязки к ячейке.`,
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await deleteZoneApi(zone.id);
      enqueueSnackbar('Зона успешно удалена', { variant: 'success' });
      await fetchZones();
      setSelectedZoneIndex(0);
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Ошибка удаления зоны', { variant: 'error' });
    }
  };

  return {
    zones,
    activeZone,
    selectedZoneIndex,
    setSelectedZoneIndex,
    totalCellsInWarehouse,
    totalOccupiedCells,
    isLoading,
    fetchZones,
    isCreateZoneOpen,
    setIsCreateZoneOpen,
    newZoneName,
    setNewZoneName,
    newZoneCode,
    setNewZoneCode,
    newZoneDesc,
    setNewZoneDesc,
    isSavingZone,
    handleCreateZoneSubmit,
    handleDeleteZone,
  };
}
