import { useState, useMemo, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { useConfirm } from '@/components/ui';
import { StorageCell, StorageZone, generateCellCodes } from './types';
import { fetchCellDetails, createCellApi, deleteCellApi, batchCreateCellsApi } from './topologyApi';

interface UseCellTopologyParams {
  activeZone: StorageZone | null;
  fetchZones: () => Promise<void>;
  onRefreshParent?: () => void;
}

export function useCellTopology({ activeZone, fetchZones, onRefreshParent }: UseCellTopologyParams) {
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');

  // Single cell creation
  const [isCreateCellOpen, setIsCreateCellOpen] = useState(false);
  const [newCellCode, setNewCellCode] = useState('');
  const [newCellName, setNewCellName] = useState('');
  const [isSavingCell, setIsSavingCell] = useState(false);

  // Batch cell generator modal
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('A');
  const [batchRacks, setBatchRacks] = useState('4');
  const [batchTiers, setBatchTiers] = useState('4');
  const [batchSlots, setBatchSlots] = useState('2');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  // Cell content inspection modal
  const [selectedCellForDetail, setSelectedCellForDetail] = useState<StorageCell | null>(null);
  const [cellDetailData, setCellDetailData] = useState<any | null>(null);
  const [isLoadingCellDetail, setIsLoadingCellDetail] = useState(false);

  const filteredCells = useMemo(() => {
    if (!activeZone) return [];
    if (!searchQuery.trim()) return activeZone.cells;
    const q = searchQuery.toLowerCase();
    return activeZone.cells.filter(
      (c) => c.code.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q))
    );
  }, [activeZone, searchQuery]);

  const handleOpenCellDetail = useCallback(async (cell: StorageCell) => {
    setSelectedCellForDetail(cell);
    setIsLoadingCellDetail(true);
    setCellDetailData(null);
    try {
      const data = await fetchCellDetails(cell.id);
      setCellDetailData(data);
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Ошибка сети при запросе данных ячейки', { variant: 'error' });
    } finally {
      setIsLoadingCellDetail(false);
    }
  }, [enqueueSnackbar]);

  const handleCreateCellSubmit = async () => {
    if (!activeZone || !newCellCode.trim()) {
      enqueueSnackbar('Укажите код ячейки (например, A-01-01)', { variant: 'warning' });
      return;
    }
    setIsSavingCell(true);
    try {
      await createCellApi(activeZone.id, newCellCode, newCellName);
      enqueueSnackbar('Ячейка добавлена', { variant: 'success' });
      setNewCellCode('');
      setNewCellName('');
      setIsCreateCellOpen(false);
      await fetchZones();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Ошибка добавления ячейки', { variant: 'error' });
    } finally {
      setIsSavingCell(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!activeZone) return;
    const racks = parseInt(batchRacks, 10) || 1;
    const tiers = parseInt(batchTiers, 10) || 1;
    const slots = parseInt(batchSlots, 10) || 1;
    const prefix = batchPrefix.trim().toUpperCase() || activeZone.code;
    const generatedCodes = generateCellCodes(prefix, racks, tiers, slots);

    if (generatedCodes.length === 0) {
      enqueueSnackbar('Укажите корректные параметры генерации', { variant: 'warning' });
      return;
    }

    setIsGeneratingBatch(true);
    try {
      const existingCodes = new Set(activeZone.cells.map((c) => c.code));
      const successCount = await batchCreateCellsApi(activeZone.id, generatedCodes, existingCodes);

      enqueueSnackbar(`Сгенерировано ${successCount} новых ячеек адресного хранения`, {
        variant: 'success',
      });
      setIsBatchOpen(false);
      await fetchZones();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Ошибка при генерации ячеек', { variant: 'error' });
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleDeleteCell = async (cell: StorageCell) => {
    if (!activeZone) return;
    const ok = await confirm({
      title: `Удалить ячейку "${cell.code}"?`,
      message: 'Если к ячейке привязаны остатки ТМЦ, они останутся на складе без конкретного адреса.',
      variant: 'warning',
    });
    if (!ok) return;

    try {
      await deleteCellApi(activeZone.id, cell.id);
      enqueueSnackbar('Ячейка удалена', { variant: 'success' });
      await fetchZones();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Ошибка удаления ячейки', { variant: 'error' });
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    filteredCells,
    isCreateCellOpen,
    setIsCreateCellOpen,
    newCellCode,
    setNewCellCode,
    newCellName,
    setNewCellName,
    isSavingCell,
    handleCreateCellSubmit,
    isBatchOpen,
    setIsBatchOpen,
    batchPrefix,
    setBatchPrefix,
    batchRacks,
    setBatchRacks,
    batchTiers,
    setBatchTiers,
    batchSlots,
    setBatchSlots,
    isGeneratingBatch,
    handleBatchGenerate,
    selectedCellForDetail,
    setSelectedCellForDetail,
    cellDetailData,
    isLoadingCellDetail,
    handleOpenCellDetail,
    handleDeleteCell,
  };
}
