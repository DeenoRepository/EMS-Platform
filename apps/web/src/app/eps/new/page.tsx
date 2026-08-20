'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Paper, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageHeader from '@/components/layout/PageHeader';
import { EquipmentWizardForm } from '@/components/eps';

export default function NewEquipmentPage() {
  const router = useRouter();

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>
      <PageHeader
        title="Регистрация нового оборудования"
        subtitle="Пошаговый мастер создания паспорта единицы оборудования в реестре EPS"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Новый паспорт' },
        ]}
        actions={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/eps')}
            sx={{
              height: 38,
              borderRadius: '8px',
              borderColor: '#e2e8f0',
              color: '#334155',
              px: 2,
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'none',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              '&:hover': {
                borderColor: '#cbd5e1',
                backgroundColor: '#f8fafc',
              },
            }}
          >
            К реестру
          </Button>
        }
      />

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <EquipmentWizardForm
          mode="page"
          onSuccess={(id) => router.push(`/eps/${id}`)}
          onCancel={() => router.push('/eps')}
        />
      </Paper>
    </Box>
  );
}
