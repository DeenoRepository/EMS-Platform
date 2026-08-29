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
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarehouseIcon from '@mui/icons-material/Warehouse';
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
  const [isLoadingCells, setIsLoadingCells] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && transfer) {
      // Инициализируем распределение по ячейкам
      const initial: Record<string, string> = {};
      transfer.items.forEach((it) => {
        if (it.targetCellId) {
          initial[it.id] = it.targetCellId;
        }
      });
      setCellAllocations(initial);

      // Загружаем ячейки целевого склада
      setIsLoadingCells(true);
      fetch(`/api/wms/warehouses/${transfer.targetWarehouse.id}/zones`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            const allCells: StorageCellOption[] = [];
            json.data.forEach((zone: any) => {
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
        })
        .catch(() => setError('Не удалось загрузить ячейки целевого склада'))
        .finally(() => setIsLoadingCells(false));
    }
  }, [open, transfer]);

  if (!transfer) return null;

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

        {/* Таблица принимаемых позиций */}
        <Paper variant="outlined" sx={{ borderRadius: '8px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Номенклатура / ТМЦ</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>
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
                  <TableCell align="right" sx={{ py: 1, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${item.quantity} ${item.nomenclature?.unit || 'шт'}`}
                      sx={{ fontWeight: 700 }}
                    />
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
