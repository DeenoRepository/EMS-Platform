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
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConstructionIcon from '@mui/icons-material/Construction';
import HubIcon from '@mui/icons-material/Hub';
import SpeedIcon from '@mui/icons-material/Speed';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import PageHeader from '@/components/layout/PageHeader';

export default function SrmComingSoonPage() {
  const router = useRouter();

  const plannedFeatures = [
    {
      icon: <TimelineIcon sx={{ fontSize: 28, color: '#0284c7' }} />,
      title: 'Внутренний ServiceDesk и заявки',
      description:
        'Оперативная регистрация отказов, инцидентов и дефектов оборудования с автоматическим расчетом сроков решения по SLA.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 28, color: '#16a34a' }} />,
      title: 'Аналитика надежности (MTTR / MTBF)',
      description:
        'Расчет наработки на отказ, среднего времени восстановления, коэффициента технической готовности (КТГ) и диаграммы Парето.',
    },
    {
      icon: <HubIcon sx={{ fontSize: 28, color: '#7c3aed' }} />,
      title: 'Интеграция с внешними системами',
      description:
        'Двусторонняя синхронизация с Jira, Redmine, 1С:ТОиР и GitLab через гибкий конструктор сопоставления полей.',
    },
    {
      icon: <ShieldOutlinedIcon sx={{ fontSize: 28, color: '#d97706' }} />,
      title: 'Гарантии и работа с подрядчиками',
      description:
        'Контроль гарантийных рекламаций заводам-изготовителям и авторизованным сервисным центрам с отслеживанием компенсаций.',
    },
  ];

  return (
    <Box sx={{ width: '100%', pb: 2 }}>
      <PageHeader
        title="SRM — Система подачи и управления заявками"
        subtitle="Модуль ServiceDesk и контроля надежности оборудования"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Система подачи заявок (SRM)' }]}
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
            bgcolor: 'rgba(2, 132, 199, 0.08)',
            color: '#0284c7',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            mb: 2.5,
          }}
        >
          <BugReportOutlinedIcon sx={{ fontSize: 38 }} />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<ConstructionIcon sx={{ fontSize: 16 }} />}
            label="Скоро будет • Модуль в разработке"
            color="primary"
            variant="outlined"
            sx={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              py: 0.5,
              px: 1,
              borderRadius: '20px',
              bgcolor: 'rgba(2, 132, 199, 0.06)',
            }}
          />
        </Box>

        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ color: '#0f172a', mb: 1.5, fontSize: { xs: '1.5rem', md: '2rem' } }}
        >
          Модуль SRM скоро будет доступен
        </Typography>

        <Typography
          variant="body1"
          sx={{ color: '#64748b', maxWidth: 640, mx: 'auto', mb: 4, lineHeight: 1.6 }}
        >
          Мы проектируем и разрабатываем централизованную систему управления сервисными заявками, контроля регламентов SLA и анализа надежности оборудования.
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
