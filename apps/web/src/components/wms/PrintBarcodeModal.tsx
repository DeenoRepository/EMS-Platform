'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormControl,
  FormLabel,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { FormDialog } from '@/components/ui';
import { executeLabelPrintWindow, LabelFormat } from './printLabelsHelper';
import { BarcodeLivePreview, FONT_WEIGHT_BOLD, FONT_WEIGHT_SEMI } from './printLabelsComponents';

export interface PrintableLabelItem {
  id: string;
  name: string;
  article?: string | null;
  unit: string;
  warehouseCode?: string;
  cellCode?: string | null;
  quantity?: number;
}

interface PrintBarcodeModalProps {
  open: boolean;
  onClose: () => void;
  items: PrintableLabelItem[];
}

export default function PrintBarcodeModal({
  open,
  onClose,
  items,
}: PrintBarcodeModalProps) {
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('58mm');
  const [includeQr, setIncludeQr] = useState(true);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await executeLabelPrintWindow(items, labelFormat, includeQr, includeLocation);
      onClose();
    } catch (err) {
      console.error('Print generation failed:', err);
      window.print();
      onClose();
    } finally {
      setIsPrinting(false);
    }
  };

  const previewItem = items[0] || null;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Печать этикеток и штрихкодов ТМЦ"
      subtitle={`Выбрано позиций для печати: ${items.length}`}
      icon={<PrintIcon color="primary" />}
      maxWidth="sm"
      submitLabel={isPrinting ? 'Формирование...' : 'Печать'}
      submitIcon={<PrintIcon />}
      onSubmit={handlePrint}
      loading={isPrinting}
    >
      <Stack spacing={3} sx={{ mt: 1 }}>
        {/* Format Selector */}
        <FormControl>
          <FormLabel sx={{ fontSize: '0.8125rem', fontWeight: FONT_WEIGHT_BOLD, color: 'text.primary', mb: 1 }}>
            Формат этикетки / принтера:
          </FormLabel>
          <RadioGroup
            row
            value={labelFormat}
            onChange={(e) => setLabelFormat(e.target.value as LabelFormat)}
          >
            <FormControlLabel
              value="58mm"
              control={<Radio size="small" />}
              label={<Typography variant="body2" fontWeight={FONT_WEIGHT_SEMI}>Термопринтер 58×40 мм</Typography>}
            />
            <FormControlLabel
              value="80mm"
              control={<Radio size="small" />}
              label={<Typography variant="body2" fontWeight={FONT_WEIGHT_SEMI}>Термопринтер 80×60 мм</Typography>}
            />
            <FormControlLabel
              value="a4"
              control={<Radio size="small" />}
              label={<Typography variant="body2" fontWeight={FONT_WEIGHT_SEMI}>Лист А4 (Сетка 3×8)</Typography>}
            />
          </RadioGroup>
        </FormControl>

        <Stack direction="row" spacing={3}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={includeQr}
                onChange={(e) => setIncludeQr(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Печатать QR-код</Typography>}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={includeLocation}
                onChange={(e) => setIncludeLocation(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Указывать склад/ячейку</Typography>}
          />
        </Stack>

        <Divider />

        {/* Live Preview Box */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: FONT_WEIGHT_SEMI, display: 'block', mb: 1 }}>
            Предпросмотр этикетки (Масштаб 1:1):
          </Typography>

          <BarcodeLivePreview
            previewItem={previewItem}
            labelFormat={labelFormat}
            includeQr={includeQr}
            includeLocation={includeLocation}
          />
        </Box>

        {items.length > 1 && (
          <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Будет распечатано этикеток: <strong>{items.length} шт.</strong> на каждую выбранную позицию.
            </Typography>
          </Paper>
        )}
      </Stack>
    </FormDialog>
  );
}
