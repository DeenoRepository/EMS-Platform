'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { useSnackbar } from 'notistack';
import { FormDialog, EmptyState, useConfirm, SearchInput } from '@/components/ui';
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
  warehouse: { id: string; name: string; code: string } | null;
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
    Boolean(user?.roles?.includes('admin'));

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

  const fetchZones = async () => {
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
  };

  useEffect(() => {
    if (open && warehouse) {
      fetchZones();
    }
  }, [open, warehouse]);

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
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            minHeight: '680px',
            maxHeight: '90vh',
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
            borderBottom: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
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
                bgcolor: 'rgba(2, 132, 199, 0.08)',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MeetingRoomOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem', color: '#0f172a' }}>
                Топология адресного хранения
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.8125rem' }}>
                Склад: <strong>{warehouse?.name}</strong> ({warehouse?.code}) • Всего ячеек: {totalCellsInWarehouse} (занято: {totalOccupiedCells})
              </Typography>
            </Box>
          </Box>

          <IconButton onClick={onClose} size="small" aria-label="Закрыть" sx={{ color: '#94a3b8' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: '#f8fafc' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, py: 8 }}>
              <CircularProgress size={36} sx={{ color: '#0284c7', mb: 2 }} />
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                Загрузка топологии и ячеек...
              </Typography>
            </Box>
          ) : zones.length === 0 ? (
            <Box sx={{ bgcolor: '#ffffff', p: 4, borderRadius: '12px', border: '1px solid #e2e8f0', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState
                icon={<GridViewIcon sx={{ fontSize: 44, color: '#94a3b8' }} />}
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
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
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
                        bgcolor: 'rgba(2, 132, 199, 0.08)',
                        color: '#0284c7',
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
                              bgcolor: idx === selectedZoneIndex ? '#0284c7' : '#f1f5f9',
                              color: idx === selectedZoneIndex ? '#ffffff' : '#64748b',
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
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
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
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {activeZone.name}
                        </Typography>
                        <Chip
                          label={`Код: ${activeZone.code}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            borderRadius: '6px',
                            bgcolor: '#f1f5f9',
                            color: '#334155',
                            height: 22,
                            fontSize: '0.6875rem',
                          }}
                        />
                        {activeZone.description && (
                          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8125rem' }}>
                            • {activeZone.description}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
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
                            startIcon={<AutoAwesomeIcon sx={{ color: '#7c3aed' }} />}
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
                              borderColor: '#ddd6fe',
                              color: '#6d28d9',
                              bgcolor: '#f5f3ff',
                              '&:hover': { bgcolor: '#ede9fe', borderColor: '#c4b5fd' },
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
                              bgcolor: '#0284c7',
                              '&:hover': { bgcolor: '#0369a1' },
                            }}
                          >
                            Добавить ячейку
                          </Button>

                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteZone(activeZone)}
                            aria-label="Удалить зону"
                            sx={{ bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}
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
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
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
                                sx={{
                                  p: 1.5,
                                  borderRadius: '10px',
                                  border: '1px solid',
                                  borderColor: isOccupied ? '#93c5fd' : '#e2e8f0',
                                  bgcolor: isOccupied ? 'rgba(239, 246, 255, 0.6)' : '#ffffff',
                                  transition: 'all 0.18s ease',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  minHeight: 88,
                                  position: 'relative',
                                  '&:hover': {
                                    borderColor: '#0284c7',
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
                                        color: '#0f172a',
                                        fontFeatureSettings: '"tnum"',
                                      }}
                                    >
                                      {cell.code}
                                    </Typography>
                                    {cell.name && (
                                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6875rem' }} noWrap>
                                        {cell.name}
                                      </Typography>
                                    )}
                                  </Box>

                                  {canManageZones && (
                                    <IconButton
                                      className="cell-del-btn"
                                      size="small"
                                      onClick={() => handleDeleteCell(cell)}
                                      aria-label={`Удалить ${cell.code}`}
                                      sx={{
                                        opacity: 0,
                                        p: 0.25,
                                        color: '#ef4444',
                                        transition: 'opacity 0.15s ease',
                                      }}
                                    >
                                      <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  )}
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
                                      bgcolor: isOccupied ? '#dbeafe' : '#f1f5f9',
                                      color: isOccupied ? '#1e40af' : '#64748b',
                                    }}
                                  />

                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      bgcolor: isOccupied ? '#3b82f6' : '#22c55e',
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

        <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
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
        icon={<AutoAwesomeIcon sx={{ color: '#7c3aed' }} />}
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
              bgcolor: '#f5f3ff',
              border: '1px solid #ddd6fe',
            }}
          >
            <Typography variant="caption" sx={{ color: '#6d28d9', fontWeight: 600, display: 'block', mb: 0.5 }}>
              Пример генерируемых адресов:
            </Typography>
            <Typography variant="body2" sx={{ color: '#4c1d95', fontFeatureSettings: '"tnum"', fontWeight: 500 }}>
              {`${batchPrefix || 'A'}-01-01-1, ${batchPrefix || 'A'}-01-01-2 ... ${batchPrefix || 'A'}-${(parseInt(batchRacks, 10) || 1).toString().padStart(2, '0')}-${(parseInt(batchTiers, 10) || 1).toString().padStart(2, '0')}-${batchSlots || 1}`}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7c3aed', mt: 0.75, display: 'block' }}>
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
    </>
  );
}
