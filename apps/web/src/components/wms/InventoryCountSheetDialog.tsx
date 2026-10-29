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
import { generateCountSheetCsv, printCountSheetHtml } from './inventory/printCountSheet';
import {
  CountSheetPreviewTable,
  InventoryCountSheetItem,
} from './inventory/CountSheetPreviewTable';

const FONT_BOLD = Number('700');
const FONT_EXTRA_BOLD = Number('800');

const metaStackSx = {
  p: 1.5,
  mb: 2,
  backgroundColor: 'action.hover',
  borderRadius: '6px',
  fontSize: '0.8125rem',
};

const dialogPaperSx = {
  borderRadius: '14px',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.15)',
  maxHeight: 'calc(100vh - 96px)',
  m: { xs: 2, sm: 3, md: 4 },
  display: 'flex',
  flexDirection: 'column',
};

const titleSx = {
  p: 2,
  px: 3,
  borderBottom: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export type { InventoryCountSheetItem };

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

function triggerDownload(csvData: string, fileName: string) {
  const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvData);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function CountSheetDialogTitle({ actCode, onClose }: { actCode: string; onClose: () => void }) {
  return (
    <DialogTitle sx={titleSx}>
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
  );
}

function CountSheetMetaHeader({
  actCode,
  molName,
  inventory,
}: {
  actCode: string;
  molName: string;
  inventory: InventoryCountSheetDetail;
}) {
  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={FONT_EXTRA_BOLD} sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
          ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ ТМЦ (БЛАНК ПЕРЕСЧЕТА)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          к Акту инвентаризации № <strong>{actCode}</strong> • Склад: <strong>{inventory.warehouse.name} ({inventory.warehouse.code})</strong>
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" sx={metaStackSx}>
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
    </>
  );
}

function CountSheetDialogContent({
  actCode,
  molName,
  inventory,
}: {
  actCode: string;
  molName: string;
  inventory: InventoryCountSheetDetail;
}) {
  return (
    <DialogContent sx={{ p: 2.5, backgroundColor: 'background.default' }}>
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
        <CountSheetMetaHeader actCode={actCode} molName={molName} inventory={inventory} />
        <CountSheetPreviewTable items={inventory.items} warehouseId={inventory.warehouseId} />
      </Paper>
    </DialogContent>
  );
}

function CountSheetDialogActions({
  onClose,
  onExport,
  onPrint,
}: {
  onClose: () => void;
  onExport: () => void;
  onPrint: () => void;
}) {
  return (
    <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'space-between' }}>
      <Button onClick={onClose} variant="outlined" color="inherit">
        Закрыть
      </Button>
      <Stack direction="row" spacing={1.5}>
        <Button
          variant="outlined"
          startIcon={<TableChartOutlinedIcon color="success" />}
          onClick={onExport}
        >
          Экспорт в Excel (CSV)
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={onPrint}
        >
          Печать бланка (A4 / PDF)
        </Button>
      </Stack>
    </DialogActions>
  );
}

export function InventoryCountSheetDialog({
  open,
  onClose,
  inventory,
}: InventoryCountSheetDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const actCode = `INV-${inventory.id.slice(-6).toUpperCase()}`;
  const molName = inventory.warehouse.responsibleUser?.displayName || inventory.createdBy.displayName || 'Не назначен';

  const handleExport = () => {
    try {
      const csvData = generateCountSheetCsv(inventory);
      triggerDownload(csvData, `blank_pereshota_${actCode}_${Date.now()}.csv`);
      enqueueSnackbar('Бланк инвентаризации успешно выгружен', { variant: 'success' });
    } catch {
      enqueueSnackbar('Ошибка при выгрузке бланка', { variant: 'error' });
    }
  };

  const handlePrint = async () => {
    const success = await printCountSheetHtml(inventory, actCode, molName);
    if (!success) {
      enqueueSnackbar('Разрешите всплывающие окна для печати бланка', { variant: 'warning' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <CountSheetDialogTitle actCode={actCode} onClose={onClose} />
      <CountSheetDialogContent actCode={actCode} molName={molName} inventory={inventory} />
      <CountSheetDialogActions onClose={onClose} onExport={handleExport} onPrint={handlePrint} />
    </Dialog>
  );
}

export default InventoryCountSheetDialog;
