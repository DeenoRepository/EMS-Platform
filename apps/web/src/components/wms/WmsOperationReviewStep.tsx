'use client';

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Stack,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { StatusBadge } from '@/components/ui';
import type { OperationType, OperationLineItem, WarehouseOption } from './WmsOperationWizardDialog';

export interface WmsOperationReviewStepProps {
  operationType: OperationType;
  operationSummaryLabel: string;
  currentWarehouse: WarehouseOption | null;
  targetWarehouseName?: string;
  recipientName: string;
  comment: string;
  lineItems: OperationLineItem[];
  getWarehouseStock: (nomenclatureId: string) => number;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function WmsOperationReviewStep({
  operationType,
  operationSummaryLabel,
  currentWarehouse,
  targetWarehouseName,
  recipientName,
  comment,
  lineItems,
  getWarehouseStock,
  isSubmitting,
  onBack,
  onSubmit,
}: WmsOperationReviewStepProps) {
  return (
    <Stack spacing={2.5}>
      <Alert severity="success" icon={<CheckCircleIcon />}>
        Все параметры операции заполнены. Проверьте сводные данные перед проведением в базе данных.
      </Alert>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', bgcolor: 'background.default', border: '1px solid divider' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
              Тип операции:
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <StatusBadge status={operationType} label={operationSummaryLabel} />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
              Закрепленный склад:
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: 'text.primary' }}>
              {currentWarehouse ? `${currentWarehouse.name} (${currentWarehouse.code})` : '—'}
            </Typography>
          </Grid>

          {operationType === 'TRANSFER' && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                Склад назначения (Зачисление):
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: 'text.primary' }}>
                {targetWarehouseName || '—'}
              </Typography>
            </Grid>
          )}

          {operationType === 'ISSUE_EMPLOYEE' && recipientName && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                Получатель:
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: 'text.primary' }}>
                {recipientName}
              </Typography>
            </Grid>
          )}

          {comment && (
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                Примечание:
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
                {comment}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
          Итоговый перечень позиций ({lineItems.length}):
        </Typography>
        <Paper elevation={0} sx={{ border: '1px solid divider', borderRadius: '8px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Номенклатура</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Артикул</TableCell>
                {operationType === 'ISSUE_WRITE_OFF' && (
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Назначение / Оборудование</TableCell>
                )}
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Остаток на складе</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Количество к проведению</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lineItems.map((item, idx) => {
                const rawStock = getWarehouseStock(item.nomenclatureId);
                return (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ py: 1, fontWeight: 600, fontSize: '0.8125rem' }}>
                      {item.nomenclatureName}
                    </TableCell>
                    <TableCell sx={{ py: 1, color: 'text.disabled', fontSize: '0.75rem' }}>
                      {item.nomenclatureArticle || '—'}
                    </TableCell>
                    {operationType === 'ISSUE_WRITE_OFF' && (
                      <TableCell sx={{ py: 1 }}>
                        {item.equipmentName ? (
                          <Chip
                            size="small"
                            icon={<PrecisionManufacturingIcon sx={{ fontSize: '14px !important' }} />}
                            label={item.equipmentName}
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24, maxWidth: 220 }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label={item.writeOffReason || 'Списание в неликвид/брак'}
                            variant="outlined"
                            sx={{ fontWeight: 500, fontSize: '0.75rem', height: 24, color: 'text.disabled' }}
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell align="right" sx={{ py: 1 }}>
                      <Chip
                        size="small"
                        label={`${rawStock} ${item.unit}`}
                        color={rawStock > 0 ? 'default' : 'error'}
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                      {item.quantity} {item.unit}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
        <Button onClick={onBack} sx={{ fontWeight: 600 }}>
          ← Назад к позициям
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={isSubmitting || lineItems.length === 0}
          sx={{
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontWeight: 700,
            bgcolor: 'success.main',
            '&:hover': { bgcolor: 'success.dark' },
          }}
        >
          {isSubmitting ? 'Проведение в БД...' : 'Подтвердить и провести операцию'}
        </Button>
      </Box>
    </Stack>
  );
}
