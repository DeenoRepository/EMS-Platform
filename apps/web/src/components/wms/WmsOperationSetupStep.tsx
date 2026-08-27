'use client';

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Stack,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type {
  OperationType,
  WarehouseOption,
} from './WmsOperationWizardDialog';

export interface OperationTypeOption {
  type: OperationType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgcolor: string;
}

export interface WmsOperationSetupStepProps {
  operationType: OperationType;
  operationTypes: OperationTypeOption[];
  warehouses: WarehouseOption[];
  transferWarehouses: WarehouseOption[];
  warehouseId: string;
  targetWarehouseId: string;
  recipientName: string;
  isAdmin: boolean;
  currentWarehouse: WarehouseOption | null;
  userDisplayName?: string | null;
  onOperationTypeChange: (type: OperationType) => void;
  onWarehouseChange: (warehouseId: string) => void;
  onTargetWarehouseChange: (warehouseId: string) => void;
  onRecipientNameChange: (recipientName: string) => void;
  onNext: () => void;
}

export function WmsOperationSetupStep({
  operationType,
  operationTypes,
  warehouses,
  transferWarehouses,
  warehouseId,
  targetWarehouseId,
  recipientName,
  isAdmin,
  currentWarehouse,
  userDisplayName,
  onOperationTypeChange,
  onWarehouseChange,
  onTargetWarehouseChange,
  onRecipientNameChange,
  onNext,
}: WmsOperationSetupStepProps) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, display: 'block', mb: 1.5 }}>
          Выберите тип складской операции:
        </Typography>
        <Grid container spacing={1.5}>
          {operationTypes.map((op) => {
            const isSelected = operationType === op.type;
            return (
              <Grid item xs={12} sm={6} key={op.type} sx={{ display: 'flex' }}>
                <Paper
                  elevation={0}
                  onClick={() => onOperationTypeChange(op.type)}
                  sx={{
                    p: 2,
                    width: '100%',
                    height: '100%',
                    minHeight: 86,
                    boxSizing: 'border-box',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: isSelected ? op.color : 'divider',
                    bgcolor: isSelected ? op.bgcolor : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    '&:hover': {
                      borderColor: op.color,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '8px',
                      bgcolor: isSelected ? 'background.paper' : op.bgcolor,
                      color: op.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {op.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'text.primary', lineHeight: 1.25 }}>
                      {op.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5, lineHeight: 1.3 }}>
                      {op.description}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Divider />

      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase' }}>
          {operationType === 'TRANSFER' ? 'Исходный склад списания (Закреплен за вами):' : 'Склад проведения операции (МОЛ):'}
        </Typography>
        {!isAdmin && currentWarehouse ? (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: '10px',
              bgcolor: 'background.default',
              border: '1.5px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '8px',
                  bgcolor: '#e0f2fe',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BusinessIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ lineHeight: 1.2 }}>
                  {currentWarehouse.name} ({currentWarehouse.code})
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  Материально ответственное лицо:{' '}
                  <b>{userDisplayName || currentWarehouse.responsibleUser?.displayName || 'Вы (Текущий сотрудник)'}</b>
                </Typography>
              </Box>
            </Box>
            <Chip
              icon={<LockOutlinedIcon sx={{ fontSize: '14px !important' }} />}
              label="Закреплен за МОЛ"
              size="small"
              color="info"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.75rem', px: 0.5 }}
            />
          </Paper>
        ) : (
          <TextField
            select
            fullWidth
            required
            label={operationType === 'TRANSFER' ? 'Исходный склад списания (МОЛ)' : 'Склад проведения операции (МОЛ)'}
            value={warehouseId}
            onChange={(e) => onWarehouseChange(e.target.value)}
            helperText="Выберите склад, на котором проводятся складские операции"
            SelectProps={{ displayEmpty: true }}
          >
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name} ({w.code}) {w.responsibleUser?.displayName ? `— МОЛ: ${w.responsibleUser.displayName}` : ''}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {operationType === 'TRANSFER' && (
        <TextField
          select
          fullWidth
          required
          label="Склад-получатель (Зачисление перемещаемых ТМЦ)"
          value={targetWarehouseId}
          onChange={(e) => onTargetWarehouseChange(e.target.value)}
          error={Boolean(targetWarehouseId && targetWarehouseId === warehouseId)}
          helperText={targetWarehouseId === warehouseId ? 'Склад-получатель должен отличаться от закрепленного исходного склада' : 'Выберите целевой склад, куда поступают ТМЦ'}
          SelectProps={{ displayEmpty: true }}
        >
          {(transferWarehouses.length > 0 ? transferWarehouses : warehouses)
            .filter((w) => w.id !== warehouseId)
            .map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name} ({w.code}) {w.responsibleUser?.displayName ? `— МОЛ: ${w.responsibleUser.displayName}` : ''}
              </MenuItem>
            ))}
        </TextField>
      )}

      {operationType === 'ISSUE_EMPLOYEE' && (
        <TextField
          fullWidth
          required
          label="ФИО Получателя / Сотрудника"
          placeholder="Иванов И.И. (Цех №2)"
          value={recipientName}
          onChange={(e) => onRecipientNameChange(e.target.value)}
        />
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
        <Button variant="contained" onClick={onNext} sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}>
          Далее: Подбор номенклатуры →
        </Button>
      </Box>
    </Stack>
  );
}
