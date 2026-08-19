'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { FormDialog } from '@/components/ui';

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
  const [labelFormat, setLabelFormat] = useState<'58mm' | '80mm' | 'a4'>('58mm');
  const [includeQr, setIncludeQr] = useState(true);
  const [includeLocation, setIncludeLocation] = useState(true);

  const handlePrint = () => {
    window.print();
    onClose();
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
      submitLabel="Печать"
      submitIcon={<PrintIcon />}
      onSubmit={handlePrint}
    >
      <Stack spacing={3} sx={{ mt: 1 }}>
        {/* Format Selector */}
        <FormControl>
          <FormLabel sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', mb: 1 }}>
            Формат этикетки / принтера:
          </FormLabel>
          <RadioGroup
            row
            value={labelFormat}
            onChange={(e) => setLabelFormat(e.target.value as any)}
          >
            <FormControlLabel
              value="58mm"
              control={<Radio size="small" />}
              label={<Typography variant="body2" fontWeight={600}>Термопринтер 58×40 мм</Typography>}
            />
            <FormControlLabel
              value="80mm"
              control={<Radio size="small" />}
              label={<Typography variant="body2" fontWeight={600}>Термопринтер 80×60 мм</Typography>}
            />
            <FormControlLabel
              value="a4"
              control={<Radio size="small" />}
              label={<Typography variant="body2" fontWeight={600}>Лист А4 (Сетка 3×8)</Typography>}
            />
          </RadioGroup>
        </FormControl>

        <Divider />

        {/* Live Preview Box */}
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1 }}>
            Предпросмотр этикетки (Масштаб 1:1):
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, bgcolor: '#f1f5f9', borderRadius: '10px' }}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                width: labelFormat === '80mm' ? 260 : 200,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                bgcolor: '#ffffff',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: 1, fontSize: '0.625rem' }}>
                EMS ENTERPRISE WMS
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                <QrCode2Icon sx={{ fontSize: labelFormat === '80mm' ? 84 : 64, color: '#0f172a' }} />
              </Box>

              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                  color: '#0f172a',
                  mb: 0.5,
                }}
                noWrap
              >
                {previewItem ? previewItem.name : 'Наименование позиции ТМЦ'}
              </Typography>

              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, display: 'block', fontSize: '0.6875rem' }}>
                SKU: {previewItem?.article || 'BRG-6204-2RS'}
              </Typography>

              <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 700, display: 'block', mt: 0.5, fontSize: '0.6875rem' }}>
                {previewItem?.cellCode ? `Ячейка: ${previewItem.cellCode}` : previewItem?.warehouseCode ? `Склад: ${previewItem.warehouseCode}` : 'Склад: WH-MAIN'}
              </Typography>
            </Paper>
          </Box>
        </Box>

        {items.length > 1 && (
          <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Будет распечатано этикеток: <strong>{items.length} шт.</strong> на каждую выбранную позицию.
            </Typography>
          </Paper>
        )}
      </Stack>
    </FormDialog>
  );
}
