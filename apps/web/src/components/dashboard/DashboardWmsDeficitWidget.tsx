'use client';

import React from 'react';
import { Card, CardContent, Box, Typography, Button, Stack, Paper } from '@mui/material';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { EmptyState } from '@/components/ui';
import { DashboardStats } from './types';

interface DashboardWmsDeficitWidgetProps {
  items: DashboardStats['wms']['lowStockItems'];
  lowStockCount: number;
  isPersonalScope: boolean;
  onNavigate: (path: string) => void;
}

export function DashboardWmsDeficitWidget({
  items,
  lowStockCount,
  isPersonalScope,
  onNavigate,
}: DashboardWmsDeficitWidgetProps) {
  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <WarehouseOutlinedIcon color="info" sx={{ fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {isPersonalScope ? 'Дефицит ТМЦ (мои склады)' : 'Дефицит ТМЦ (WMS)'}
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => onNavigate('/wms/stock')}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Остатки ({lowStockCount})
          </Button>
        </Box>

        {items.length === 0 ? (
          <EmptyState
            title="Дефицит ТМЦ отсутствует"
            description={
              isPersonalScope
                ? 'На ваших складах все остатки в пределах нормы.'
                : 'Все складские позиции превышают уровень неснижаемого запаса.'
            }
            minHeight={140}
            actionText="Складской учет"
            onAction={() => onNavigate('/wms/stock')}
          />
        ) : (
          <Stack spacing={1.25}>
            {items.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                onClick={() => onNavigate(`/wms/stock?search=${encodeURIComponent(item.name)}`)}
                sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  borderColor: 'error.light',
                  bgcolor: 'action.hover',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: 'background.paper',
                    borderColor: 'error.main',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Склад: <strong>{item.warehouseCode}</strong>
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="body2" fontWeight={800} color="error.main">
                      {item.quantity} {item.unit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Мин: {item.minStock} {item.unit}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
