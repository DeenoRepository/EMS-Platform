'use client';

import React from 'react';
import { Stack, TextField, Grid, Paper, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { FormDialog } from '@/components/ui';

interface BatchCellGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  prefix: string;
  racks: string;
  tiers: string;
  slots: string;
  isLoading: boolean;
  onPrefixChange: (val: string) => void;
  onRacksChange: (val: string) => void;
  onTiersChange: (val: string) => void;
  onSlotsChange: (val: string) => void;
  onSubmit: () => void;
}

export function BatchCellGeneratorDialog({
  open,
  onClose,
  prefix,
  racks,
  tiers,
  slots,
  isLoading,
  onPrefixChange,
  onRacksChange,
  onTiersChange,
  onSlotsChange,
  onSubmit,
}: BatchCellGeneratorDialogProps) {
  const racksNum = parseInt(racks, 10) || 0;
  const tiersNum = parseInt(tiers, 10) || 0;
  const slotsNum = parseInt(slots, 10) || 0;
  const totalCount = racksNum * tiersNum * slotsNum;

  return (
    <FormDialog
      open={open}
      onClose={() => !isLoading && onClose()}
      title="Мастер пакетной генерации ячеек"
      subtitle="Автоматическое создание сетки ячеек по матрице Ряд-Стеллаж-Ярус"
      icon={<AutoAwesomeIcon color="secondary" />}
      maxWidth="sm"
      loading={isLoading}
      submitLabel={isLoading ? 'Генерация...' : 'Сгенерировать ячейки'}
      onSubmit={onSubmit}
      submitDisabled={isLoading || totalCount <= 0}
    >
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        <TextField
          fullWidth
          required
          label="Префикс адреса (Ряд / Секция)"
          placeholder="например, A или R1"
          value={prefix}
          onChange={(e) => onPrefixChange(e.target.value)}
        />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Кол-во стеллажей"
              value={racks}
              onChange={(e) => onRacksChange(e.target.value)}
              inputProps={{ min: 1, max: 50 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Ярусов (полок)"
              value={tiers}
              onChange={(e) => onTiersChange(e.target.value)}
              inputProps={{ min: 1, max: 20 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Мест на ярусе"
              value={slots}
              onChange={(e) => onSlotsChange(e.target.value)}
              inputProps={{ min: 1, max: 10 }}
            />
          </Grid>
        </Grid>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: '8px',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 600, display: 'block', mb: 0.5 }}>
            Пример генерируемых адресов:
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.primary', fontFeatureSettings: '"tnum"', fontWeight: 500 }}>
            {`${prefix || 'A'}-01-01-1, ${prefix || 'A'}-01-01-2 ... ${prefix || 'A'}-${(racksNum || 1).toString().padStart(2, '0')}-${(tiersNum || 1).toString().padStart(2, '0')}-${slots || 1}`}
          </Typography>
          <Typography variant="caption" sx={{ color: 'secondary.main', mt: 0.75, display: 'block' }}>
            Будет создано всего: <strong>{totalCount} ячеек</strong>
          </Typography>
        </Paper>
      </Stack>
    </FormDialog>
  );
}
