'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Divider } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import PageHeader from '@/components/layout/PageHeader';

export default function SrmOverviewPage() {
  return (
    <Box>
      <PageHeader
        title="SRM — Дашборд заявок Jira"
        subtitle="Мониторинг заявок на ремонт оборудования, контроль SLA и аналитика метрик надежности"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Дашборд Jira' }]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <SpeedIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  MTTR (Время ремонта)
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Средняя длительность устранения неисправностей по оборудованию
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <TimerIcon color="secondary" />
                <Typography variant="h6" fontWeight={700}>
                  MTBF (Время работы)
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Средняя наработка между отказами для оценки надежности
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <AssessmentIcon color="success" />
                <Typography variant="h6" fontWeight={700}>
                  Контроль SLA
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Своевременность реакции и завершения аварийных работ
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <QueryStatsIcon color="warning" />
                <Typography variant="h6" fontWeight={700}>
                  Графики и тренды
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Распределение по причинам отказов и топ-10 оборудования по заявкам
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
