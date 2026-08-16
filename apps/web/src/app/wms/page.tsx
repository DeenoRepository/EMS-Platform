'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Button, Chip } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PageHeader from '@/components/layout/PageHeader';

export default function WmsOverviewPage() {
  return (
    <Box>
      <PageHeader
        title="WMS — Складской учёт"
        subtitle="Управление складскими запасами, приходом, списанием на оборудование и инвентаризацией"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Складской учёт' }]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Inventory2Icon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Склады
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Центральный склад и цеховые склады оперативного запаса
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <MoveToInboxIcon color="success" />
                <Typography variant="h6" fontWeight={700}>
                  Приход ТМЦ
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Автоформирование и автокомплит номенклатуры при поступлении
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <OutboxIcon color="warning" />
                <Typography variant="h6" fontWeight={700}>
                  Расход и списание
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Списание запчастей с прямой привязкой к оборудованию EPS
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <FactCheckIcon color="secondary" />
                <Typography variant="h6" fontWeight={700}>
                  Инвентаризация
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Сверка фактических остатков и автоматическая корректировка
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
