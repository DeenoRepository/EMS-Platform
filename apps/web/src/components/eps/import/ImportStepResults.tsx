'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { useRouter } from 'next/navigation';
import { CriticalAlertBanner, StatCard } from '@/components/ui';

interface ImportResultsData {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  newCustomFieldsCreated: number;
  errors: { row: number; error: string }[];
}

interface ImportStepResultsProps {
  importResults: ImportResultsData;
  onReset: () => void;
}

export const ImportStepResults: React.FC<ImportStepResultsProps> = ({
  importResults,
  onReset,
}) => {
  const router = useRouter();

  return (
    <Card sx={{ borderRadius: '12px' }}>
      <CardContent sx={{ p: 5, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Импорт успешно завершен!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Данные обработаны и зафиксированы в едином реестре оборудования и журнале аудита платформы
        </Typography>

        <Grid container spacing={2} sx={{ mt: 3, mb: 4, maxWidth: 900, mx: 'auto' }}>
          <Grid item xs={12} sm={3}>
            <StatCard
              title="СОЗДАНО НОВЫХ"
              value={importResults.createdCount}
              icon={<AddCircleOutlineIcon sx={{ fontSize: 20 }} />}
              accentColor="success.main"
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <StatCard
              title="ОБНОВЛЕНО"
              value={importResults.updatedCount}
              icon={<AutorenewIcon sx={{ fontSize: 20 }} />}
              accentColor="primary.main"
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <StatCard
              title="ПРОПУЩЕНО"
              value={importResults.skippedCount}
              icon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
              accentColor="text.secondary"
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <StatCard
              title="НОВЫХ ПОЛЕЙ"
              value={importResults.newCustomFieldsCreated}
              icon={<FormatListBulletedIcon sx={{ fontSize: 20 }} />}
              accentColor="secondary.main"
            />
          </Grid>
        </Grid>

        {importResults.errors && importResults.errors.length > 0 && (
          <Box sx={{ mb: 4, maxWidth: 900, mx: 'auto' }}>
            <CriticalAlertBanner
              alerts={[
                {
                  id: 'import-errors-alert',
                  severity: 'WARNING',
                  title: `Предупреждения при импорте (${importResults.errors.length}):`,
                  description: importResults.errors.slice(0, 5).map((e) => `Строка ${e.row}: ${e.error}`).join('; '),
                  count: importResults.errors.length,
                },
              ]}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<FormatListBulletedIcon />}
            onClick={() => router.push('/eps')}
            sx={{ px: 4, py: 1.2, fontWeight: 700 }}
          >
            Перейти в реестр оборудования
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AutorenewIcon />}
            onClick={onReset}
            sx={{ px: 3, py: 1.2, fontWeight: 600 }}
          >
            Загрузить еще один файл
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
