'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Paper,
  Stack,
} from '@mui/material';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConstructionIcon from '@mui/icons-material/Construction';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChecklistIcon from '@mui/icons-material/Checklist';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import PageHeader from '@/components/layout/PageHeader';

export default function MroComingSoonPage() {
  const router = useRouter();

  const plannedFeatures = [
    {
      icon: <CalendarMonthIcon sx={{ fontSize: 28, color: '#0284c7' }} />,
      title: 'Графики ППР и календарное планирование',
      description:
        'Автоматическое составление планов регламентного ТО по периодам (ежемесячно, ежеквартально, ежегодно) и наработке моточасов.',
    },
    {
      icon: <ChecklistIcon sx={{ fontSize: 28, color: '#16a34a' }} />,
      title: 'Электронные технологические карты и чек-листы',
      description:
        'Стандартизированные цифровые опросные листы для выездных и дежурных бригад с фиксацией параметров и замеров.',
    },
    {
      icon: <WarehouseOutlinedIcon sx={{ fontSize: 28, color: '#7c3aed' }} />,
      title: 'Интеграция со складом (WMS)',
      description:
        'Автоматическое резервирование, комплектование и списание необходимых запчастей (ЗИП) и расходных материалов при выполнении ТО.',
    },
    {
      icon: <AssessmentOutlinedIcon sx={{ fontSize: 28, color: '#d97706' }} />,
      title: 'История ремонтов и учет трудозатрат',
      description:
        'Электронный журнал выполненных регламентов, учет рабочего времени специалистов и стоимости обслуживания каждого агрегата.',
    },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        title="MRO — Техническое обслуживание и ремонт"
        subtitle="Модуль управления планово-предупредительными ремонтами (ППР) и ТОиР"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'ТО и Ремонт (MRO)' }]}
        actions={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/eps')}
            sx={{ fontWeight: 600, borderRadius: '8px' }}
          >
            К реестру оборудования (EPS)
          </Button>
        }
      />

      <Card
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.06)',
          textAlign: 'center',
          mb: 4,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: '20px',
            bgcolor: 'rgba(16, 185, 129, 0.08)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            mb: 2.5,
          }}
        >
          <BuildOutlinedIcon sx={{ fontSize: 38 }} />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<ConstructionIcon sx={{ fontSize: 16 }} />}
            label="Скоро будет • Модуль в разработке"
            color="success"
            variant="outlined"
            sx={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              py: 0.5,
              px: 1,
              borderRadius: '20px',
              bgcolor: 'rgba(16, 185, 129, 0.06)',
            }}
          />
        </Box>

        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ color: '#0f172a', mb: 1.5, fontSize: { xs: '1.5rem', md: '2rem' } }}
        >
          Модуль MRO скоро будет доступен
        </Typography>

        <Typography
          variant="body1"
          sx={{ color: '#64748b', maxWidth: 640, mx: 'auto', mb: 4, lineHeight: 1.6 }}
        >
          Ведется активная разработка комплексной системы управления ТОиР: планирование регламентов ППР, технологические чек-листы и сквозной учет списания запчастей.
        </Typography>

        <Grid container spacing={3} sx={{ textAlign: 'left', mt: 1 }}>
          {plannedFeatures.map((feat, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: '12px',
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 16px -4px rgba(15, 23, 42, 0.06)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: '10px' }}>{feat.icon}</Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a', mb: 0.5 }}>
                      {feat.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.5 }}>
                      {feat.description}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 5 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push('/eps')}
            sx={{ fontWeight: 700, borderRadius: '8px', px: 3, py: 1 }}
          >
            Перейти к паспортизации (EPS)
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/wms')}
            sx={{ fontWeight: 600, borderRadius: '8px', px: 3, py: 1 }}
          >
            Складской учет (WMS)
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
