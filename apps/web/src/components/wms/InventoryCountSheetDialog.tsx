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
import { escapeHtml } from './inventory-count-sheet-print';

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

  const getCellAddress = (item: InventoryCountSheetItem) => {
    const stock = item.nomenclature.stockItems?.find((si) => si.warehouseId === inventory.warehouseId) || item.nomenclature.stockItems?.[0];
    if (!stock || !stock.cell) return '—';
    if (stock.cell.zone) {
      return `${stock.cell.zone.name} / ${stock.cell.code}`;
    }
    return stock.cell.code;
  };

  // 1. Export as Excel / CSV Spreadsheet (with empty fact column for manual entry)
  const handleExportSpreadsheet = (format: 'xlsx' | 'csv' = 'csv') => {
    try {
      const headers = [
        '№ п/п',
        'Артикул',
        'Наименование ТМЦ (Номенклатура)',
        'Категория',
        'Ед. изм.',
        'Место хранения (Ячейка)',
        'Учетное количество (Учет)',
        'Фактическое количество (ФАКТ - заполняется вручную)',
        'Расхождение (+/-)',
        'Подпись счетчика / Примечание',
      ];

      const csvEscape = (value: string | number | null | undefined) =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;
      const rows = inventory.items.map((item, idx) => {
        const cellAddr = getCellAddress(item);
        const actualValue = item.actualQty !== null && item.actualQty !== undefined ? String(item.actualQty) : '';
        return [
          idx + 1,
          csvEscape(item.nomenclature.article),
          csvEscape(item.nomenclature.name),
          csvEscape(item.nomenclature.category?.name || 'Основная'),
          csvEscape(item.nomenclature.unit),
          csvEscape(cellAddr),
          item.expectedQty,
          actualValue, // blank or filled fact
          '', // diff formula or blank
          csvEscape(item.comment),
        ];
      });

      const csvTitle = [
        `"ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ ТМЦ (БЛАНК ПЕРЕСЧЕТА)"`,
        csvEscape(`Акт инвентаризации № ${actCode}`),
        csvEscape(`Склад: ${inventory.warehouse.name} (${inventory.warehouse.code})`),
        csvEscape(`МОЛ: ${molName}`),
        csvEscape(`Дата формирования: ${formatDateTime(inventory.createdAt)}`),
        csvEscape(`Основание: ${inventory.comment || 'Плановая инвентаризация'}`),
        '',
      ].join('\n');

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        csvTitle +
        [headers.join(',')].concat(rows.map((r) => r.join(','))).join('\n');

      const encodedUri = encodeURI(csvContent);
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

  // 2. Direct Print / PDF count sheet using clean A4 sheet HTML
  const handlePrintSheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      enqueueSnackbar('Разрешите всплывающие окна для печати бланка', { variant: 'warning' });
      return;
    }

    const rowsHtml = inventory.items
      .map((item, idx) => {
        const cellAddr = getCellAddress(item);
        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-size: 11px;">${escapeHtml(item.nomenclature.article || '—')}</td>
            <td><strong>${escapeHtml(item.nomenclature.name)}</strong></td>
            <td>${escapeHtml(item.nomenclature.category?.name || '—')}</td>
            <td style="text-align: center;">${escapeHtml(item.nomenclature.unit)}</td>
            <td style="text-align: center; font-size: 11px;">${escapeHtml(cellAddr)}</td>
            <td style="text-align: right; font-weight: bold; padding-right: 8px;">${escapeHtml(item.expectedQty)}</td>
            <td style="background-color: background.default; border: 1.5px solid black; min-width: 70px;"></td>
            <td style="min-width: 90px;"></td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="utf-8" />
        <title>Бланк пересчета ТМЦ — ${escapeHtml(actCode)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            color: black;
            margin: 0;
            padding: 0;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid black;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .org-title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .doc-title {
            font-size: 16px;
            font-weight: 800;
            text-align: center;
            margin: 6px 0 2px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-subtitle {
            font-size: 12px;
            text-align: center;
            margin-bottom: 12px;
            color: rgb(50,50,50);
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 20px;
            font-size: 11px;
            margin-bottom: 14px;
            background-color: background.default;
            padding: 8px 12px;
            border: 1px solid divider;
            border-radius: 4px;
          }
          .meta-item strong {
            display: inline-block;
            min-width: 130px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 16px;
          }
          th, td {
            border: 1px solid black;
            padding: 5px 6px;
            vertical-align: middle;
          }
          th {
            background-color: action.hover;
            font-weight: 700;
            text-align: center;
          }
          .signatures {
            margin-top: 24px;
            page-break-inside: avoid;
          }
          .sig-row {
            display: flex;
            justify-content: space-between;
            margin-top: 14px;
            font-size: 11px;
          }
          .sig-line {
            display: inline-block;
            width: 180px;
            border-bottom: 1px solid black;
            margin: 0 4px;
          }
          .receipt-text {
            font-size: 10px;
            font-style: italic;
            margin-top: 16px;
            line-height: 1.4;
            color: rgb(70,70,70);
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="org-title">EMS Platform / Складской комплекс</div>
            <div style="font-size: 10px; color: rgb(90,90,90);">Система управления запасами предприятия</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            Форма: <strong>Бланк пересчета ТМЦ (ИНВ)</strong>
          </div>
        </div>

        <div class="doc-title">ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ ТМЦ (БЛАНК ПЕРЕСЧЕТА)</div>
        <div class="doc-subtitle">к Акту инвентаризации № <strong>${escapeHtml(actCode)}</strong> от ${escapeHtml(formatDateTime(inventory.createdAt))}</div>

        <div class="meta-grid">
          <div class="meta-item"><strong>Склад:</strong> ${escapeHtml(inventory.warehouse.name)} (${escapeHtml(inventory.warehouse.code)})</div>
          <div class="meta-item"><strong>МОЛ / Ответственный:</strong> ${escapeHtml(molName)}</div>
          <div class="meta-item"><strong>Инициатор описи:</strong> ${escapeHtml(inventory.createdBy.displayName)}</div>
          <div class="meta-item"><strong>Основание:</strong> ${escapeHtml(inventory.comment || 'Плановая сплошная инвентаризация')}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px;">№</th>
              <th style="width: 75px;">Артикул</th>
              <th>Наименование ТМЦ / Запасной части</th>
              <th style="width: 90px;">Категория</th>
              <th style="width: 45px;">Ед.</th>
              <th style="width: 70px;">Ячейка</th>
              <th style="width: 60px;">Учет (остаток)</th>
              <th style="width: 75px; background-color: divider;">ФАКТ (вручную)</th>
              <th style="width: 90px;">Подпись / Прим.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="receipt-text">
          Все ТМЦ, поименованные в настоящей инвентаризационной описи, комиссией проверены в натуре в моем присутствии и внесены в опись, в связи с чем претензий к инвентаризационной комиссии не имею.
        </div>

        <div class="signatures">
          <div class="sig-row">
            <div>Материально ответственное лицо: <span class="sig-line"></span> / <strong>${escapeHtml(molName)}</strong></div>
            <div>Дата: «____» ____________ 2026 г.</div>
          </div>
          <div class="sig-row">
            <div>Председатель комиссии: <span class="sig-line"></span> / ______________</div>
            <div>Члены комиссии: <span class="sig-line"></span> / ______________</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 2,
          borderBottom: '1px solid action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FactCheckOutlinedIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
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
            border: '1px solid divider',
            backgroundColor: 'background.paper',
          }}
        >
          {/* Header info */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
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
          <Box sx={{ maxHeight: 360, overflowY: 'auto', border: '1px solid divider', borderRadius: '6px' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { backgroundColor: 'background.default', fontWeight: 700, fontSize: '0.75rem' } }}>
                  <TableCell sx={{ width: 40, textAlign: 'center' }}>№</TableCell>
                  <TableCell sx={{ width: 100 }}>Артикул</TableCell>
                  <TableCell>Номенклатура</TableCell>
                  <TableCell sx={{ width: 70, textAlign: 'center' }}>Ячейка</TableCell>
                  <TableCell sx={{ width: 50, textAlign: 'center' }}>Ед.</TableCell>
                  <TableCell sx={{ width: 80, textAlign: 'right' }}>Учет (склад)</TableCell>
                  <TableCell sx={{ width: 100, textAlign: 'center', backgroundColor: 'info.light !important', color: 'primary.dark' }}>
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
                    <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>
                      {item.nomenclature.name}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', color: 'text.secondary' }}>
                      {getCellAddress(item)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem' }}>
                      {item.nomenclature.unit}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 700, fontSize: '0.8125rem', color: 'text.primary' }}>
                      {item.expectedQty}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', backgroundColor: 'info.light' }}>
                      <Box
                        sx={{
                          border: '1px dashed text.disabled',
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
                        {item.actualQty !== null && item.actualQty !== undefined ? item.actualQty : '[     ]'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid action.hover', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Закрыть
        </Button>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<TableChartOutlinedIcon sx={{ color: 'success.main' }} />}
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
