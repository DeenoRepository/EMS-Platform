'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { FormDialog } from '@/components/ui';

interface TransferItem {
  id: string;
  nomenclatureId: string;
  quantity: number | string;
  targetCellId?: string | null;
  nomenclature?: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
  };
}

interface StorageCellOption {
  id: string;
  code: string;
  name?: string | null;
  zone?: { name: string; code: string };
}

interface TransferReceiveDialogProps {
  open: boolean;
  onClose: () => void;
  transfer: {
    id: string;
    transferNumber: string;
    sourceWarehouse: { name: string; code: string };
    targetWarehouse: { id: string; name: string; code: string };
    items: TransferItem[];
    requestReason?: string | null;
  } | null;
  onSuccess: () => void;
}

export default function TransferReceiveDialog({
  open,
  onClose,
  transfer,
  onSuccess,
}: TransferReceiveDialogProps) {
  const [cellAllocations, setCellAllocations] = useState<Record<string, string>>({});
  const [cells, setCells] = useState<StorageCellOption[]>([]);
  const [preferredCellsByNomId, setPreferredCellsByNomId] = useState<Record<string, string>>({});
  const [batchCellId, setBatchCellId] = useState('');
  const [isLoadingCells, setIsLoadingCells] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && transfer) {
      setBatchCellId('');
      const initial: Record<string, string> = {};
      transfer.items.forEach((it) => {
        if (it.targetCellId) {
          initial[it.id] = it.targetCellId;
        }
      });

      setIsLoadingCells(true);
      Promise.all([
        fetch(`/api/wms/warehouses/${transfer.targetWarehouse.id}/zones`).then((r) => r.json()),
        fetch(`/api/wms/stock?warehouseId=${transfer.targetWarehouse.id}&pageSize=1000`).then((r) => r.json()).catch(() => ({ success: false })),
      ])
        .then(([zonesJson, stockJson]) => {
          const allCells: StorageCellOption[] = [];
          if (zonesJson.success && Array.isArray(zonesJson.data)) {
            zonesJson.data.forEach((zone: any) => {
              (zone.cells || []).forEach((c: any) => {
                allCells.push({
                  id: c.id,
                  code: c.code,
                  name: c.name,
                  zone: { name: zone.name, code: zone.code },
                });
              });
            });
            setCells(allCells);
          }

          const prefMap: Record<string, string> = {};
          if (stockJson.success && stockJson.data?.items) {
            stockJson.data.items.forEach((s: any) => {
              if (s.cell?.id && s.nomenclatureId) {
                prefMap[s.nomenclatureId] = s.cell.id;
              }
            });
            setPreferredCellsByNomId(prefMap);

            transfer.items.forEach((it) => {
              if (!initial[it.id] && prefMap[it.nomenclatureId]) {
                initial[it.id] = prefMap[it.nomenclatureId];
              }
            });
          }

          setCellAllocations(initial);
        })
        .catch(console.error)
        .finally(() => setIsLoadingCells(false));
    }
  }, [open, transfer]);

  if (!transfer) return null;

  const handleApplyBatchCell = (cellId: string) => {
    setBatchCellId(cellId);
    if (!transfer) return;
    const updated: Record<string, string> = {};
    transfer.items.forEach((it) => {
      updated[it.id] = cellId;
    });
    setCellAllocations(updated);
  };

  const handleAutoAllocateCells = () => {
    if (!transfer || cells.length === 0) return;
    const updated = { ...cellAllocations };
    transfer.items.forEach((it, index) => {
      if (!updated[it.id] || updated[it.id] === '') {
        if (preferredCellsByNomId[it.nomenclatureId]) {
          updated[it.id] = preferredCellsByNomId[it.nomenclatureId];
        } else {
          const fallbackCell = cells[index % cells.length];
          if (fallbackCell) {
            updated[it.id] = fallbackCell.id;
          }
        }
      }
    });
    setCellAllocations(updated);
  };

  const allocatedCount = transfer.items.filter((it) => Boolean(cellAllocations[it.id])).length;
  const totalCount = transfer.items.length;
  const isFullyAllocated = allocatedCount === totalCount;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        cellAllocations: Object.entries(cellAllocations).map(([itemId, targetCellId]) => ({
          itemId,
          targetCellId: targetCellId || null,
        })),
      };

      const res = await fetch(`/api/wms/transfers/${transfer.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error || 'Ошибка подтверждения приемки');
      }
    } catch {
      setError('Ошибка сети при отправке подтверждения');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Подтверждение приемки ТМЦ"
      subtitle={`Перемещение № ${transfer.transferNumber}`}
      icon={<CheckCircleIcon color="success" />}
      maxWidth="md"
      loading={isSubmitting}
      submitLabel="Подтвердить приемку ТМЦ"
      submitColor="success"
      submitIcon={<CheckCircleIcon />}
      onSubmit={handleSubmit}
      submitDisabled={isSubmitting}
    >
      <Stack spacing={2.5}>
        <Alert severity="info" icon={<WarehouseIcon />} sx={{ borderRadius: '8px' }}>
          <Typography variant="body2">
            ТМЦ перемещаются со склада <b>«{transfer.sourceWarehouse.name}»</b> на ваш склад{' '}
            <b>«{transfer.targetWarehouse.name}»</b>. Подтвердите фактическое наличие и укажите ячейки хранения.
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ borderRadius: '8px' }}>
            {error}
          </Alert>
        )}

        {/* Панель управления адресным размещением */}
        {cells.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              p: 1.5,
              bgcolor: 'background.default',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LayersOutlinedIcon fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Размещение в ячейки ({allocatedCount}/{totalCount})
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: isFullyAllocated ? 'rgba(22, 163, 74, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: isFullyAllocated ? 'success.dark' : 'warning.dark',
                }}
              >
                {isFullyAllocated ? 'Все ячейки назначены' : 'Есть неразмещенные ТМЦ'}
              </Box>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Автоматически распределить ячейки на основе текущих остатков или свободных мест">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleAutoAllocateCells}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Авто-подбор ячеек
                </Button>
              </Tooltip>

              {transfer.items.length > 1 && (
                <TextField
                  select
                  size="small"
                  value={batchCellId}
                  onChange={(e) => handleApplyBatchCell(e.target.value)}
                  sx={{ minWidth: 230 }}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">— Назначить всем строкам —</MenuItem>
                  {cells.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.zone?.code ? `[${c.zone.code}] ` : ''}
                      {c.code} {c.name ? `(${c.name})` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          </Box>
        )}

        {/* Таблица принимаемых позиций */}
        <Paper variant="outlined" sx={{ borderRadius: '8px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Номенклатура / ТМЦ</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>
                  Количество
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 260 }}>
                  Ячейка хранения (на вашем складе)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transfer.items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {item.nomenclature?.name || 'Позиция ТМЦ'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {item.nomenclature?.article ? `Арт: ${item.nomenclature.article} • ` : ''}
                      {item.nomenclature?.unit || 'шт'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: 'primary.main',
                        fontFeatureSettings: '"tnum"',
                      }}
                    >
                      {item.quantity} {item.nomenclature?.unit || 'шт'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    {isLoadingCells ? (
                      <CircularProgress size={18} />
                    ) : cells.length > 0 ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={cellAllocations[item.id] || ''}
                        onChange={(e) =>
                          setCellAllocations((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="">— Без привязки к ячейке —</MenuItem>
                        {cells.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.zone?.code ? `[${c.zone.code}] ` : ''}
                            {c.code} {c.name ? `(${c.name})` : ''}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Ячейки не настроены
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Stack>
    </FormDialog>
  );
}
