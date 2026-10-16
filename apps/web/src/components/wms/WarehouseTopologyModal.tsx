'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  IconButton,
  TextField,
  Stack,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import GridViewIcon from '@mui/icons-material/GridView';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { useSnackbar } from 'notistack';
import { FormDialog, EmptyState, useConfirm, SearchInput, DataTableWrapper, StatusBadge } from '@/components/ui';
import { PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';

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

interface WarehouseTopologyModalProps {
  open: boolean;
  onClose: () => void;
  warehouse: { id: string; name: string; code: string; responsibleUserId?: string | null } | null;
  onRefreshParent?: () => void;
}

export default function WarehouseTopologyModal({
  open,
  onClose,
  warehouse,
  onRefreshParent,
}: WarehouseTopologyModalProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission, user } = useAuth();
  const confirm = useConfirm();

  const canManageZones =
    hasPermission(PERMISSIONS.WMS_ZONES_MANAGE) ||
    hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE) ||
    Boolean(user?.roles?.includes('admin')) ||
    Boolean(user?.userId && warehouse?.responsibleUserId === user.userId);

  const [zones, setZones] = useState<StorageZone[]>([]);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Zone creation dialog
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCode, setNewZoneCode] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [isSavingZone, setIsSavingZone] = useState(false);

  // Single cell creation
  const [isCreateCellOpen, setIsCreateCellOpen] = useState(false);
  const [newCellCode, setNewCellCode] = useState('');
  const [newCellName, setNewCellName] = useState('');
  const [isSavingCell, setIsSavingCell] = useState(false);

  // Batch cell generator modal
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('A');
  const [batchRacks, setBatchRacks] = useState('4'); // Стеллажей
  const [batchTiers, setBatchTiers] = useState('4'); // Ярусов
  const [batchSlots, setBatchSlots] = useState('2'); // Мест на полке
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  // Cell content inspection modal
  const [selectedCellForDetail, setSelectedCellForDetail] = useState<StorageCell | null>(null);
  const [cellDetailData, setCellDetailData] = useState<any | null>(null);
  const [isLoadingCellDetail, setIsLoadingCellDetail] = useState(false);

  const fetchZones = useCallback(async () => {
    if (!warehouse) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/wms/warehouses/${warehouse.id}/zones`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setZones(json.data);
          if (json.data.length > 0 && selectedZoneIndex >= json.data.length) {
            setSelectedZoneIndex(0);
          }
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки зон склада:', err);
      enqueueSnackbar('Не удалось загрузить топологию склада', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [warehouse, selectedZoneIndex, enqueueSnackbar]);

  useEffect(() => {
    if (open && warehouse) {
      fetchZones();
    }
  }, [open, warehouse, fetchZones]);

  const handleOpenCellDetail = useCallback(async (cell: StorageCell) => {
    setSelectedCellForDetail(cell);
    setIsLoadingCellDetail(true);
    setCellDetailData(null);
    try {
      const res = await fetch(`/api/wms/cells/${cell.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCellDetailData(json.data);
        } else {
          enqueueSnackbar(json.error || 'Ошибка загрузки содержимого ячейки', { variant: 'error' });
        }
      } else {
        enqueueSnackbar('Не удалось получить данные о ТМЦ в ячейке', { variant: 'error' });
      }
    } catch (err) {
      console.error('Ошибка загрузки содержимого ячейки:', err);
      enqueueSnackbar('Ошибка сети при запросе данных ячейки', { variant: 'error' });
    } finally {
      setIsLoadingCellDetail(false);
    }
  }, [enqueueSnackbar]);

  const activeZone = zones[selectedZoneIndex] || null;

  const filteredCells = useMemo(() => {
    if (!activeZone) return [];
    if (!searchQuery.trim()) return activeZone.cells;
    const q = searchQuery.toLowerCase();
    return activeZone.cells.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q))
    );
  }, [activeZone, searchQuery]);

  const totalCellsInWarehouse = useMemo(
    () => zones.reduce((sum, z) => sum + z.cells.length, 0),
    [zones]
  );

  const totalOccupiedCells = useMemo(
    () =>
      zones.reduce(
        (sum, z) =>
          sum + z.cells.filter((c) => (c._count?.stockItems || 0) > 0).length,
        0
      ),
    [zones]
  );

  // Handle Zone Creation
  const handleCreateZoneSubmit = async () => {
    if (!warehouse || !newZoneName.trim() || !newZoneCode.trim()) {
      enqueueSnackbar('Заполните наименование и код зоны', { variant: 'warning' });
      return;
    }
    setIsSavingZone(true);
    try {
      const res = await fetch(`/api/wms/warehouses/${warehouse.id}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newZoneName.trim(),
          code: newZoneCode.trim().toUpperCase(),
          description: newZoneDesc.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Зона адресного хранения создана', { variant: 'success' });
        setNewZoneName('');
        setNewZoneCode('');
        setNewZoneDesc('');
        setIsCreateZoneOpen(false);
        await fetchZones();
        setSelectedZoneIndex(zones.length); // switch to new zone
        if (onRefreshParent) onRefreshParent();
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания зоны', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setIsSavingZone(false);
    }
  };

  // Handle Zone Delete
  const handleDeleteZone = async (zone: StorageZone) => {
    if (!warehouse) return;
    const ok = await confirm({
      title: `Удалить зону "${zone.name}"?`,
      message: `Все ячейки (${zone.cells.length} шт.) будут удалены. Если в ячейках есть остатки ТМЦ, они станут без привязки к ячейке.`,
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/wms/zones/${zone.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Зона успешно удалена', { variant: 'success' });
        await fetchZones();
        setSelectedZoneIndex(0);
        if (onRefreshParent) onRefreshParent();
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления зоны', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    }
  };

  // Handle Single Cell Creation
  const handleCreateCellSubmit = async () => {
    if (!activeZone || !newCellCode.trim()) {
      enqueueSnackbar('Укажите код ячейки (например, A-01-01)', { variant: 'warning' });
      return;
    }
    setIsSavingCell(true);
    try {
      const res = await fetch(`/api/wms/zones/${activeZone.id}/cells`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCellCode.trim().toUpperCase(),
          name: newCellName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Ячейка добавлена', { variant: 'success' });
        setNewCellCode('');
        setNewCellName('');
        setIsCreateCellOpen(false);
        await fetchZones();
        if (onRefreshParent) onRefreshParent();
      } else {
        enqueueSnackbar(json.error || 'Ошибка добавления ячейки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    } finally {
      setIsSavingCell(false);
    }
  };

  // Handle Batch Generation of Cells
  const handleBatchGenerate = async () => {
    if (!activeZone) return;
    const racks = parseInt(batchRacks, 10) || 1;
    const tiers = parseInt(batchTiers, 10) || 1;
    const slots = parseInt(batchSlots, 10) || 1;
    const prefix = batchPrefix.trim().toUpperCase() || activeZone.code;

    const generatedCodes: string[] = [];
    for (let r = 1; r <= racks; r++) {
      const rackStr = r.toString().padStart(2, '0');
      for (let t = 1; t <= tiers; t++) {
        const tierStr = t.toString().padStart(2, '0');
        if (slots > 1) {
          for (let s = 1; s <= slots; s++) {
            generatedCodes.push(`${prefix}-${rackStr}-${tierStr}-${s}`);
          }
        } else {
          generatedCodes.push(`${prefix}-${rackStr}-${tierStr}`);
        }
      }
    }

    if (generatedCodes.length === 0) {
      enqueueSnackbar('Укажите корректные параметры генерации', { variant: 'warning' });
      return;
    }

    setIsGeneratingBatch(true);
    let successCount = 0;
    try {
      // Create sequentially to avoid concurrency conflicts
      for (const code of generatedCodes) {
        // Check if code already exists in this zone
        if (activeZone.cells.some((c) => c.code === code)) continue;
        const res = await fetch(`/api/wms/zones/${activeZone.id}/cells`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (res.ok) successCount++;
      }

      enqueueSnackbar(`Сгенерировано ${successCount} новых ячеек адресного хранения`, {
        variant: 'success',
      });
      setIsBatchOpen(false);
      await fetchZones();
      if (onRefreshParent) onRefreshParent();
    } catch {
      enqueueSnackbar('Ошибка при генерации ячеек', { variant: 'error' });
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Handle Cell Delete
  const handleDeleteCell = async (cell: StorageCell) => {
    if (!activeZone) return;
    const ok = await confirm({
      title: `Удалить ячейку "${cell.code}"?`,
      message: 'Если к ячейке привязаны остатки ТМЦ, они останутся на складе без конкретного адреса.',
      variant: 'warning',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/wms/zones/${activeZone.id}/cells?cellId=${cell.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Ячейка удалена', { variant: 'success' });
        await fetchZones();
        if (onRefreshParent) onRefreshParent();
      } else {
        enqueueSnackbar(json.error || 'Ошибка удаления ячейки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети', { variant: 'error' });
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            minHeight: '680px',
            maxHeight: 'calc(100vh - 64px)',
            m: { xs: 1.5, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Top Header Bar */}
        <DialogTitle
          sx={{
            p: 2.5,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: 'action.hover',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MeetingRoomOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem', color: 'text.primary' }}>
                Топология адресного хранения
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                Склад: <strong>{warehouse?.name}</strong> ({warehouse?.code}) • Всего ячеек: {totalCellsInWarehouse} (занято: {totalOccupiedCells})
              </Typography>
            </Box>
          </Box>

          <IconButton onClick={onClose} size="small" aria-label="Закрыть" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: 'background.default' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, py: 8 }}>
              <CircularProgress size={36} sx={{ color: 'primary.main', mb: 2 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Загрузка топологии и ячеек...
              </Typography>
            </Box>
          ) : zones.length === 0 ? (
            <Box sx={{ bgcolor: 'background.paper', p: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState
                icon={<GridViewIcon sx={{ fontSize: 44, color: 'text.secondary' }} />}
                title="Зоны хранения не созданы"
                description="Разделите склад на зоны (Стеллажи, Напольное хранение, Буферная зона) и добавьте ячейки для точного учета местоположения ТМЦ."
                actionText={canManageZones ? 'Создать первую зону' : undefined}
                onAction={() => setIsCreateZoneOpen(true)}
              />
            </Box>
          ) : (
            <>
              {/* Zones Navigation Bar */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Tabs
                  value={selectedZoneIndex}
                  onChange={(_, val) => {
                    setSelectedZoneIndex(val);
                    setSearchQuery('');
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    minHeight: 40,
                    '& .MuiTab-root': {
                      minHeight: 38,
                      py: 0.75,
                      px: 2,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      textTransform: 'none',
                      mr: 1,
                      transition: 'all 0.2s ease',
                      '&.Mui-selected': {
                        bgcolor: 'action.hover',
                        color: 'primary.main',
                      },
                    },
                    '& .MuiTabs-indicator': {
                      display: 'none',
                    },
                  }}
                >
                  {zones.map((zone, idx) => (
                    <Tab
                      key={zone.id}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{zone.name}</span>
                          <Chip
                            label={zone.cells.length}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              bgcolor: idx === selectedZoneIndex ? 'primary.main' : 'action.hover',
                              color: idx === selectedZoneIndex ? 'primary.contrastText' : 'text.secondary',
                            }}
                          />
                        </Box>
                      }
                    />
                  ))}
                </Tabs>

                {canManageZones && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setIsCreateZoneOpen(true)}
                    sx={{
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    + Новая зона
                  </Button>
                )}
              </Paper>

              {/* Active Zone Content Area */}
              {activeZone && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Zone Header Controls */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                      mb: 2.5,
                      pb: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {activeZone.name}
                        </Typography>
                        <Chip
                          label={`Код: ${activeZone.code}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            borderRadius: '6px',
                            bgcolor: 'action.hover',
                            color: 'text.secondary',
                            height: 22,
                            fontSize: '0.6875rem',
                          }}
                        />
                        {activeZone.description && (
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                            • {activeZone.description}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Всего {activeZone.cells.length} ячеек адресного хранения в этой зоне
                      </Typography>
                    </Box>

                    {/* Search & Action Buttons */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 190 }}>
                        <SearchInput
                          size="small"
                          placeholder="Поиск ячейки..."
                          value={searchQuery}
                          onSearch={(val) => setSearchQuery(val)}
                        />
                      </Box>

                      {canManageZones && (
                        <>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AutoAwesomeIcon sx={{ color: 'secondary.main' }} />}
                            onClick={() => {
                              setBatchPrefix(activeZone.code);
                              setIsBatchOpen(true);
                            }}
                            sx={{
                              height: 36,
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              borderColor: 'divider',
                              color: 'secondary.main',
                              bgcolor: 'action.hover',
                              '&:hover': { bgcolor: 'action.selected', borderColor: 'secondary.main' },
                            }}
                          >
                            Мастер генерации ячеек
                          </Button>

                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setIsCreateCellOpen(true)}
                            sx={{
                              height: 36,
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'none',
                            }}
                          >
                            Добавить ячейку
                          </Button>

                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteZone(activeZone)}
                            aria-label="Удалить зону"
                            sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.light', opacity: 0.9 } }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Stack>
                  </Box>

                  {/* 2D Interactive Rack / Cell Grid */}
                  {filteredCells.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {searchQuery ? 'Ячейки по запросу не найдены' : 'В этой зоне пока нет созданных ячеек.'}
                      </Typography>
                      {!searchQuery && canManageZones && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AutoAwesomeIcon />}
                          onClick={() => {
                            setBatchPrefix(activeZone.code);
                            setIsBatchOpen(true);
                          }}
                          sx={{ mt: 2, borderRadius: '8px', textTransform: 'none' }}
                        >
                          Сгенерировать сетку ячеек (Ряд-Стеллаж-Полка)
                        </Button>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
                      <Grid container spacing={1.5}>
                        {filteredCells.map((cell) => {
                          const stockCount = cell._count?.stockItems || 0;
                          const isOccupied = stockCount > 0;

                          return (
                            <Grid item xs={6} sm={4} md={3} lg={2.4} key={cell.id}>
                              <Paper
                                elevation={0}
                                onClick={() => handleOpenCellDetail(cell)}
                                sx={{
                                  p: 1.5,
                                  borderRadius: '8px',
                                  border: '1px solid',
                                  borderColor: isOccupied ? 'primary.light' : 'divider',
                                  bgcolor: isOccupied ? 'action.hover' : 'background.paper',
                                  transition: 'all 0.18s ease',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  minHeight: 88,
                                  position: 'relative',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                                    '& .cell-del-btn': { opacity: 1 },
                                  },
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                  <Box>
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        color: 'text.primary',
                                        fontFeatureSettings: '"tnum"',
                                      }}
                                    >
                                      {cell.code}
                                    </Typography>
                                    {cell.name && (
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }} noWrap>
                                        {cell.name}
                                      </Typography>
                                    )}
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <Tooltip title="Посмотреть содержимое ячейки">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenCellDetail(cell);
                                        }}
                                        sx={{ p: 0.25, color: 'primary.main' }}
                                      >
                                        <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>

                                    {canManageZones && (
                                      <IconButton
                                        className="cell-del-btn"
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteCell(cell);
                                        }}
                                        aria-label={`Удалить ${cell.code}`}
                                        sx={{
                                          opacity: 0,
                                          p: 0.25,
                                          color: 'error.main',
                                          transition: 'opacity 0.15s ease',
                                        }}
                                      >
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    )}
                                  </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                                  <Chip
                                    label={isOccupied ? `${stockCount} поз. ТМЦ` : 'Свободна'}
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: '0.625rem',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      bgcolor: isOccupied ? 'primary.light' : 'action.hover',
                                      color: isOccupied ? 'primary.main' : 'text.secondary',
                                    }}
                                  />

                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      bgcolor: isOccupied ? 'primary.main' : 'success.main',
                                    }}
                                  />
                                </Box>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  )}
                </Paper>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '8px', fontWeight: 600 }}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Create Zone */}
      <FormDialog
        open={isCreateZoneOpen}
        onClose={() => !isSavingZone && setIsCreateZoneOpen(false)}
        title="Создание зоны хранения"
        subtitle="Определите новую секцию или стеллажный ряд склада"
        icon={<LayersOutlinedIcon color="primary" />}
        maxWidth="xs"
        loading={isSavingZone}
        submitLabel={isSavingZone ? 'Создание...' : 'Создать зону'}
        onSubmit={handleCreateZoneSubmit}
        submitDisabled={isSavingZone || !newZoneName.trim() || !newZoneCode.trim()}
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            required
            label="Название зоны"
            placeholder="например, Зона метизов и РТИ"
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
          />
          <TextField
            fullWidth
            required
            label="Код зоны (префикс)"
            placeholder="ZONE-A или RACK-01"
            value={newZoneCode}
            onChange={(e) => setNewZoneCode(e.target.value)}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Описание / Назначение"
            placeholder="Стеллажи 1-6 левой стороны цеха..."
            value={newZoneDesc}
            onChange={(e) => setNewZoneDesc(e.target.value)}
          />
        </Stack>
      </FormDialog>

      {/* Modal: Create Single Cell */}
      <FormDialog
        open={isCreateCellOpen}
        onClose={() => !isSavingCell && setIsCreateCellOpen(false)}
        title="Добавление ячейки хранения"
        subtitle={`Зона: ${activeZone?.name || ''} (${activeZone?.code || ''})`}
        icon={<GridViewIcon color="primary" />}
        maxWidth="xs"
        loading={isSavingCell}
        submitLabel={isSavingCell ? 'Добавление...' : 'Добавить ячейку'}
        onSubmit={handleCreateCellSubmit}
        submitDisabled={isSavingCell || !newCellCode.trim()}
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            required
            label="Код ячейки / Адрес"
            placeholder="например, A-01-02-1"
            value={newCellCode}
            onChange={(e) => setNewCellCode(e.target.value)}
            helperText="Формат: Ряд-Стеллаж-Ярус-Место"
          />
          <TextField
            fullWidth
            label="Понятное название / Описание (опционально)"
            placeholder="Верхняя полка правый контейнер"
            value={newCellName}
            onChange={(e) => setNewCellName(e.target.value)}
          />
        </Stack>
      </FormDialog>

      {/* Modal: Batch Cell Generator */}
      <FormDialog
        open={isBatchOpen}
        onClose={() => !isGeneratingBatch && setIsBatchOpen(false)}
        title="Мастер пакетной генерации ячеек"
        subtitle="Автоматическое создание сетки ячеек по матрице Ряд-Стеллаж-Ярус"
        icon={<AutoAwesomeIcon color="secondary" />}
        maxWidth="sm"
        loading={isGeneratingBatch}
        submitLabel={isGeneratingBatch ? 'Генерация...' : 'Сгенерировать ячейки'}
        onSubmit={handleBatchGenerate}
        submitDisabled={isGeneratingBatch}
      >
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            required
            label="Префикс адреса (Ряд / Секция)"
            placeholder="например, A или R1"
            value={batchPrefix}
            onChange={(e) => setBatchPrefix(e.target.value)}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Кол-во стеллажей"
                value={batchRacks}
                onChange={(e) => setBatchRacks(e.target.value)}
                inputProps={{ min: 1, max: 50 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Ярусов (полок)"
                value={batchTiers}
                onChange={(e) => setBatchTiers(e.target.value)}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Мест на ярусе"
                value={batchSlots}
                onChange={(e) => setBatchSlots(e.target.value)}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '8px',
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 600, display: 'block', mb: 0.5 }}>
              Пример генерируемых адресов:
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.primary', fontFeatureSettings: '"tnum"', fontWeight: 500 }}>
              {`${batchPrefix || 'A'}-01-01-1, ${batchPrefix || 'A'}-01-01-2 ... ${batchPrefix || 'A'}-${(parseInt(batchRacks, 10) || 1).toString().padStart(2, '0')}-${(parseInt(batchTiers, 10) || 1).toString().padStart(2, '0')}-${batchSlots || 1}`}
            </Typography>
            <Typography variant="caption" sx={{ color: 'secondary.main', mt: 0.75, display: 'block' }}>
              Будет создано всего:{' '}
              <strong>
                {(parseInt(batchRacks, 10) || 0) *
                  (parseInt(batchTiers, 10) || 0) *
                  (parseInt(batchSlots, 10) || 0)}{' '}
                ячеек
              </strong>
            </Typography>
          </Paper>
        </Stack>
      </FormDialog>

      {/* Modal: View Cell Stock Content */}
      <Dialog
        open={Boolean(selectedCellForDetail)}
        onClose={() => setSelectedCellForDetail(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '14px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.15), 0 10px 15px -3px rgba(15, 23, 42, 0.08)',
            maxHeight: 'calc(100vh - 64px)',
            m: { xs: 1.5, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 2,
            px: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GridViewIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                Содержимое ячейки: {selectedCellForDetail?.code}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeZone?.name} ({activeZone?.code}) • Склад: {warehouse?.name}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setSelectedCellForDetail(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 3,
            bgcolor: 'background.default',
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'divider',
              borderRadius: 3,
            },
          }}
        >
          {isLoadingCellDetail ? (
            <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Загрузка остатков ТМЦ в ячейке...
              </Typography>
            </Box>
          ) : !cellDetailData || cellDetailData.items.length === 0 ? (
            <EmptyState
              paper
              icon={<Inventory2OutlinedIcon sx={{ fontSize: 40, color: 'text.secondary' }} />}
              title="Ячейка свободна"
              description={`В ячейке ${selectedCellForDetail?.code} на данный момент нет размещенных товарно-материальных ценностей.`}
            />
          ) : (
            <Stack spacing={2.5}>
              {/* Сводные показатели */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  px: 2.5,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Всего наименований в ячейке:
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {cellDetailData.totalItemsCount} поз.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Суммарное количество:
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                    {cellDetailData.totalQuantity} ед.
                  </Typography>
                </Box>
              </Paper>

              {/* Таблица остатков ячейки */}
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.paper' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, py: 1.25 }}>Артикул</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.25 }}>Наименование номенклатуры</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.25 }}>Категория</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, py: 1.25 }}>Остаток</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.25 }}>Совместимое оборудование</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cellDetailData.items.map((item: any) => (
                      <TableRow key={item.stockItemId} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', py: 1 }}>
                          <Chip label={item.article || 'Б/А'} size="small" variant="outlined" sx={{ borderRadius: '4px', fontWeight: 600 }} />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {item.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>
                          {item.category}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1 }}>
                          <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontFeatureSettings: '"tnum"' }}>
                            {item.quantity} {item.unit}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          {item.compatibleEquipment && item.compatibleEquipment.length > 0 ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                              {item.compatibleEquipment.slice(0, 2).map((eq: any) => (
                                <Chip
                                  key={eq.id}
                                  icon={<PrecisionManufacturingIcon sx={{ fontSize: '12px !important' }} />}
                                  label={eq.name}
                                  size="small"
                                  sx={{ fontSize: '0.6875rem', height: 20, borderRadius: '4px' }}
                                />
                              ))}
                              {item.compatibleEquipment.length > 2 && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                                  +{item.compatibleEquipment.length - 2}
                                </Typography>
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Button onClick={() => setSelectedCellForDetail(null)} variant="outlined" sx={{ borderRadius: '8px', fontWeight: 600 }}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
