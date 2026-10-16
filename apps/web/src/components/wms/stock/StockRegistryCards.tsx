'use client';

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { StockRow } from './types';

interface StockRegistryCardsProps {
  items: StockRow[];
  onOpenDrawer: (item: StockRow) => void;
}

export function StockRegistryCards({ items, onOpenDrawer }: StockRegistryCardsProps) {
  return (
    <Grid container spacing={2.5}>
      {items.map((row) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={row.id}>
          <Card
            onClick={() => onOpenDrawer(row)}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              borderRadius: '12px',
              border: '1px solid',
              borderColor: row.isLowStock ? 'error.light' : 'divider',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: 2,
                borderColor: 'primary.main',
              },
            }}
          >
            <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Chip
                  label={row.article || 'Б/А'}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
                {row.isLowStock && (
                  <Chip
                    label="Дефицит"
                    size="small"
                    color="error"
                    sx={{ height: 20, fontSize: '0.625rem', fontWeight: 700 }}
                  />
                )}
              </Box>

              <Typography variant="subtitle2" fontWeight={700} lineHeight={1.3} sx={{ mb: 1, color: 'text.primary' }}>
                {row.name}
              </Typography>

              <Typography variant="caption" color="text.secondary" display="block">
                Склад: <strong>{row.warehouseName} ({row.warehouseCode})</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Категория: <strong>{row.category}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Ячейка: <strong>{row.cellCode ? `${row.zoneCode || ''} • ${row.cellCode}` : 'Не назначена'}</strong>
              </Typography>

              <Box sx={{ mt: 'auto', pt: 1.5, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Остаток:
                  </Typography>
                  {Boolean(row.inTransitIn && row.inTransitIn > 0) && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      + {row.inTransitIn} в пути 🚚
                    </Typography>
                  )}
                </Box>
                <Typography variant="subtitle1" fontWeight={800} color={row.isLowStock ? 'error.main' : 'primary.main'}>
                  {row.quantity} {row.unit}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
