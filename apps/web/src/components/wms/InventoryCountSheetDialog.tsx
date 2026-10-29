'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Stack,
  IconButton,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import CloseIcon from '@mui/icons-material/Close';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { formatDateTime } from '@ems/shared';
import { useSnackbar } from 'notistack';
import { generateCountSheetCsv, printCountSheetHtml, getCellAddress } from './inventory/printCountSheet';

const FONT_SEMI_BOLD = 600;
const FONT_BOLD = 700;
const FONT_EXTRA_BOLD = 800;

export interface InventoryCountSheetItem {
  id: string;
  expectedQty: number;
  actualQty?: number | null;
  comment?: string | null;
  nomenclature: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
    category?: { name: string } | null;
    stockItems?: Array<{
      warehouseId?: string;
      cell?: {
        code: string;
        name?: string | null;
        zone?: { name: string; code: string } | null;
      } | null;
    }>;
  };
}

export interface InventoryCountSheetDetail {
  id: string;
  warehouseId: string;
  status: string;
  comment?: string | null;
  createdAt: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
    responsibleUser?: { id: string; displayName: string } | null;
  };
  createdBy: { displayName: string; ldapLogin: string };
  items: InventoryCountSheetItem[];
}

interface InventoryCountSheetDialogProps {
  open: boolean;
  onClose: () => void;
  inventory: InventoryCountSheetDetail;
}

export function InventoryCountSheetDialog({
  open,
  onClose,
  inventory,
}: InventoryCountSheetDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const actCode = `INV-${inventory.id.slice(-6).toUpperCase()}`;
  const molName = inventory.warehouse.responsibleUser?.displayName || inventory.createdBy.displayName || 'Не назначен';

  const handleExportSpreadsheet = (format: 'xlsx' | 'csv' = 'csv') => {
    try {
      const csvData = generateCountSheetCsv(inventory);
      const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvData);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `blank_pereshota_${actCode}_${Date.now()}.${format === 'xlsx' ? 'csv' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      enqueueSnackbar('Бланк инвентаризации успешно выгружен', { variant: 'success' });
    } catch {
      enqueueSnackbar('Ошибка при выгрузке бланка', { variant: 'error' });
    }
  };

  const handlePrintSheet = () => {
    const success = printCountSheetHtml(inventory, actCode, molName);
    if (!success) {
      enqueueSnackbar('Разрешите всплывающие окна для печати бланка', { variant: 'warning' });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '14px',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.15)',
          maxHeight: 'calc(100vh - 96px)',
          m: { xs: 2, sm: 3, md: 4 },
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
          <FactCheckOutlinedIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={FONT_BOLD} color="text.primary">
              Бланк инвентаризационной описи ТМЦ ({actCode})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ведомость пересчета для заполнения фактических остатков на складе вручную
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, backgroundColor: 'background.default' }}>
        {/* Printable Card Preview */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          {/* Header info */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={FONT_EXTRA_BOLD} sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
              ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ ТМЦ (БЛАНК ПЕРЕСЧЕТА)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              к Акту инвентаризации № <strong>{actCode}</strong> • Склад: <strong>{inventory.warehouse.name} ({inventory.warehouse.code})</strong>
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            sx={{
              p: 1.5,
              mb: 2,
              backgroundColor: 'action.hover',
              borderRadius: '6px',
              fontSize: '0.8125rem',
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                <strong>МОЛ:</strong> {molName}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                <strong>Основание:</strong> {inventory.comment || 'Плановая инвентаризация'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                <strong>Дата акта:</strong> {formatDateTime(inventory.createdAt)}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                <strong>Позиций к пересчету:</strong> {inventory.items.length} поз.
              </Typography>
            </Box>
          </Stack>

          {/* Table Preview */}
          <Box sx={{ maxHeight: 360, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '6px' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { backgroundColor: 'background.default', fontWeight: FONT_BOLD, fontSize: '0.75rem' } }}>
                  <TableCell sx={{ width: 40, textAlign: 'center' }}>№</TableCell>
                  <TableCell sx={{ width: 100 }}>Артикул</TableCell>
                  <TableCell>Номенклатура</TableCell>
                  <TableCell sx={{ width: 70, textAlign: 'center' }}>Ячейка</TableCell>
                  <TableCell sx={{ width: 50, textAlign: 'center' }}>Ед.</TableCell>
                  <TableCell sx={{ width: 80, textAlign: 'right' }}>Учет (склад)</TableCell>
                  <TableCell sx={{ width: 100, textAlign: 'center', backgroundColor: 'action.selected', color: 'primary.main' }}>
                    ФАКТ (ручной)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventory.items.map((item, idx) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', color: 'text.secondary' }}>
                      {idx + 1}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {item.nomenclature.article || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', fontWeight: FONT_SEMI_BOLD, color: 'text.primary' }}>
                      {item.nomenclature.name}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', color: 'text.secondary' }}>
                      {getCellAddress(item, inventory.warehouseId)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem' }}>
                      {item.nomenclature.unit}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: FONT_BOLD, fontSize: '0.8125rem', color: 'text.primary' }}>
                      {item.expectedQty}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', backgroundColor: 'action.hover' }}>
                      <Box
                        sx={{
                          border: '1px dashed',
                          borderColor: 'text.disabled',
                          borderRadius: '4px',
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'background.paper',
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                        }}
                      >
                        —
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Закрыть
        </Button>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<TableChartOutlinedIcon color="success" />}
            onClick={() => handleExportSpreadsheet('csv')}
          >
            Экспорт в Excel (CSV)
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrintSheet}
          >
            Печать бланка (A4 / PDF)
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

export default InventoryCountSheetDialog;
