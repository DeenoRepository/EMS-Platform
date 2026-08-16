'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PageHeader from '@/components/layout/PageHeader';

export default function MroOverviewPage() {
  return (
    <Box>
      <PageHeader
        title="MRO — Техническое обслуживание и ремонт"
        subtitle="Календарные графики планово-предупредительного ремонта (ППР), чек-листы регламентных работ"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'ТО и Ремонт' }]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <CalendarMonthIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Графики ППР
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Календарный план периодических ТО по всему парку оборудования
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <ChecklistRtlIcon color="success" />
                <Typography variant="h6" fontWeight={700}>
                  Чек-листы
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Электронные формы регламентов с числовыми замерами и фиксацией
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <BuildCircleIcon color="warning" />
                <Typography variant="h6" fontWeight={700}>
                  Списание запчастей
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Автоматическое списание использованных ТМЦ со склада WMS
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <AutoFixHighIcon color="secondary" />
                <Typography variant="h6" fontWeight={700}>
                  Связка с Jira
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Создание аварийных нарядов в Jira прямо из формы выполнения ТО
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
