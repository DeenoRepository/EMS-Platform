'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Paper,
  Divider,
  TextField,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { FormDialog } from '@/components/ui';

interface InventoryItemData {
  id: string;
  expectedQty: number;
  actualQty: number;
  comment?: string;
  nomenclature: {
    id: string;
    name: string;
    article?: string | null;
    unit: string;
  };
}

interface InventoryCompleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (finalComment: string) => Promise<void>;
  items: InventoryItemData[];
  warehouseName: string;
  inventoryNumber: string;
  isSubmitting?: boolean;
}

export default function InventoryCompleteModal({
  open,
  onClose,
  onConfirm,
  items,
  warehouseName,
  inventoryNumber,
  isSubmitting = false,
}: InventoryCompleteModalProps) {
  const [finalComment, setFinalComment] = useState('');

  // Calculations
  const totalItems = items.length;
  const matchItems = items.filter((i) => i.actualQty === i.expectedQty);
  const surplusItems = items.filter((i) => i.actualQty > i.expectedQty);
  const deficitItems = items.filter((i) => i.actualQty < i.expectedQty);

  const matchPercent = totalItems > 0 ? ((matchItems.length / totalItems) * 100).toFixed(1) : '100';
  const hasDiscrepancy = surplusItems.length > 0 || deficitItems.length > 0;

  const handleSubmit = async () => {
    await onConfirm(finalComment);
  };

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Завершение и проведение инвентаризации"
      subtitle={`Акт № ${inventoryNumber} • Склад: ${warehouseName}`}
      icon={<FactCheckOutlinedIcon color="primary" />}
      maxWidth="md"
      loading={isSubmitting}
      submitLabel={isSubmitting ? 'Корректировка остатков...' : 'Утвердить и скорректировать остатки'}
      submitColor="success"
      submitIcon={<CheckCircleIcon />}
      onSubmit={handleSubmit}
      submitDisabled={isSubmitting}
    >
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {/* Discrepancy Alert */}
        {hasDiscrepancy ? (
          <Alert severity="warning" icon={<WarningAmberIcon />}>
            Обнаружены расхождения фактических остатков с учетными. При утверждении акта остатки на складе будут автоматически приведены в соответствие с фактическим подсчетом.
          </Alert>
        ) : (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            Все фактические остатки на 100% сходятся с учетными данными. Расхождений не выявлено.
          </Alert>
        )}

        {/* 4 Summary Metric Cards */}
        <Grid container spacing={1.5}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '8px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Всего позиций
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontFeatureSettings: '"tnum"' }}>
                {totalItems}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '8px', border: '1px solid #bbf7d0', bgcolor: '#f0fdf4' }}>
              <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600 }}>
                Совпадений ({matchPercent}%)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#15803d', fontFeatureSettings: '"tnum"' }}>
                {matchItems.length}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '8px', border: '1px solid #fed7aa', bgcolor: '#fff7ed' }}>
              <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
                Излишков
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#c2410c', fontFeatureSettings: '"tnum"' }}>
                {surplusItems.length}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '8px', border: '1px solid #fecaca', bgcolor: '#fef2f2' }}>
              <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600 }}>
                Недостач
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#b91c1c', fontFeatureSettings: '"tnum"' }}>
                {deficitItems.length}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* List of Deviations Table */}
        {hasDiscrepancy && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              Позиции с расхождениями ({surplusItems.length + deficitItems.length}):
            </Typography>

            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: 220, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Номенклатура</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Учет</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Факт</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Разница</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...surplusItems, ...deficitItems].map((item) => {
                    const diff = item.actualQty - item.expectedQty;
                    const isSurplus = diff > 0;
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                            {item.nomenclature.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {item.nomenclature.article || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, color: '#64748b', fontFeatureSettings: '"tnum"' }}>
                          {item.expectedQty} {item.nomenclature.unit}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                          {item.actualQty} {item.nomenclature.unit}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1 }}>
                          <Chip
                            label={`${isSurplus ? '+' : ''}${diff} ${item.nomenclature.unit}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.6875rem',
                              height: 22,
                              bgcolor: isSurplus ? '#ffedd5' : '#fee2e2',
                              color: isSurplus ? '#c2410c' : '#b91c1c',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        <TextField
          fullWidth
          multiline
          rows={2}
          label="Заключение инвентаризационной комиссии / Примечание"
          placeholder="Причины расхождений, решение комиссии..."
          value={finalComment}
          onChange={(e) => setFinalComment(e.target.value)}
        />
      </Stack>
    </FormDialog>
  );
}
