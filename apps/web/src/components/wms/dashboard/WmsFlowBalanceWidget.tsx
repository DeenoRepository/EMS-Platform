'use client';

import React from 'react';
import { Card, CardContent, Box, Typography, Button, Stack, Paper, Divider } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { WmsDashboardStats } from './types';

interface WmsFlowBalanceWidgetProps {
  stats: WmsDashboardStats;
  onNavigate: (path: string) => void;
}

export function WmsFlowBalanceWidget({ stats, onNavigate }: WmsFlowBalanceWidgetProps) {
  const inTransit = stats.inTransitTransfersCount || 0;
  const activeInventories = stats.activeInventoriesCount || 0;

  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <LocalShippingOutlinedIcon color="primary" sx={{ fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              Баланс потоков и транзит
            </Typography>
          </Box>
        </Box>

        <Stack spacing={1.5}>
          {/* 1. Грузы в пути */}
          <Paper
            variant="outlined"
            onClick={() => onNavigate('/wms/operations')}
            sx={{
              p: 1.5,
              borderRadius: '8px',
              cursor: 'pointer',
              borderColor: inTransit > 0 ? 'secondary.light' : 'divider',
              bgcolor: 'background.paper',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'secondary.main',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <LocalShippingOutlinedIcon color="secondary" sx={{ fontSize: 18 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                    Перемещения в пути
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Межскладской транзит ТМЦ
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body1" fontWeight={800} color={inTransit > 0 ? 'secondary.main' : 'text.secondary'}>
                {inTransit}
              </Typography>
            </Box>
          </Paper>

          {/* 2. Инвентаризации */}
          <Paper
            variant="outlined"
            onClick={() => onNavigate('/wms/inventory')}
            sx={{
              p: 1.5,
              borderRadius: '8px',
              cursor: 'pointer',
              borderColor: activeInventories > 0 ? 'info.light' : 'divider',
              bgcolor: 'background.paper',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'info.main',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <FactCheckOutlinedIcon color="info" sx={{ fontSize: 18 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                    Инвентаризации
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Акты в процессе сверки
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body1" fontWeight={800} color={activeInventories > 0 ? 'info.main' : 'text.secondary'}>
                {activeInventories}
              </Typography>
            </Box>
          </Paper>

          {/* 3. Складские партии */}
          <Paper
            variant="outlined"
            onClick={() => onNavigate('/wms/stock')}
            sx={{
              p: 1.5,
              borderRadius: '8px',
              cursor: 'pointer',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'primary.main',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <LayersOutlinedIcon color="action" sx={{ fontSize: 18 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                    Партии на остатках
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Всего активных позиций
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body1" fontWeight={800} color="text.primary">
                {stats.stockItemsCount}
              </Typography>
            </Box>
          </Paper>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Button
          fullWidth
          variant="outlined"
          size="small"
          onClick={() => onNavigate('/wms/warehouses')}
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: '8px' }}
        >
          Топология складов и зон
        </Button>
      </CardContent>
    </Card>
  );
}
