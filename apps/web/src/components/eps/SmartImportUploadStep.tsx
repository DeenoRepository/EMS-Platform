import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Typography,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CircularProgress from '@mui/material/CircularProgress';
import { FileUploadDropzone } from '@/components/ui';

export interface SmartImportUploadStepProps {
  selectedFile: File | null;
  analyzing: boolean;
  onFileChange: (files: File[]) => void;
  onAnalyze: () => void;
  onDownloadTemplate: () => void;
}

export function SmartImportUploadStep({
  selectedFile,
  analyzing,
  onFileChange,
  onAnalyze,
  onDownloadTemplate,
}: SmartImportUploadStepProps) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card sx={{ height: '100%', borderRadius: '12px' }}>
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ width: '100%' }}>
              <FileUploadDropzone
                accept=".xlsx,.xls,.csv"
                files={selectedFile ? [selectedFile] : []}
                onChange={onFileChange}
                title="Выберите или перетащите файл реестра оборудования"
                description="Поддерживаются книги Excel (.xlsx, .xls) и таблицы CSV (до 15 МБ)"
              />
            </Box>

            <Box sx={{ mt: 4, display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="large"
                disabled={!selectedFile || analyzing}
                onClick={onAnalyze}
                endIcon={analyzing ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
                sx={{ px: 4, py: 1.2, fontWeight: 700 }}
              >
                {analyzing ? 'Анализ структуры...' : 'Анализировать структуру файла'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%', borderRadius: '12px' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Эталонный шаблон
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Скачайте подготовленный файл с актуальным перечнем колонок и пользовательских полей вашего предприятия:
            </Typography>

            <Button
              variant="outlined"
              color="primary"
              fullWidth
              startIcon={<FileDownloadIcon />}
              onClick={onDownloadTemplate}
              sx={{ py: 1.5, mb: 3, fontWeight: 600, borderRadius: '8px' }}
            >
              Скачать шаблон Excel (.xlsx)
            </Button>

            <Divider sx={{ mb: 2.5 }} />

            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Особенности умного импорта:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 18, mt: 0.2 }} />
                <Typography variant="caption">
                  <strong>Авто-определение полей:</strong> распознаются русские и английские названия колонок.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 18, mt: 0.2 }} />
                <Typography variant="caption">
                  <strong>Новые характеристики:</strong> неизвестные колонки можно в 1 клик добавить в справочник.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 18, mt: 0.2 }} />
                <Typography variant="caption">
                  <strong>Защита от дублей:</strong> система сверит инвентарные номера с БД и предложит обновить или пропустить.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default SmartImportUploadStep;
