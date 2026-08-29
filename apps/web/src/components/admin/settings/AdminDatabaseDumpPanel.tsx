import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import StorageIcon from '@mui/icons-material/Storage';
import { StatusBadge } from '@/components/ui';

export type DatabaseDumpMode = 'full' | 'data' | 'schema';

export interface AdminDatabaseDumpPanelProps {
  dumpMode: DatabaseDumpMode;
  downloading: boolean;
  loading: boolean;
  onDumpModeChange: (mode: DatabaseDumpMode) => void;
  onRequestDownload: () => void;
}

export function AdminDatabaseDumpPanel({
  dumpMode,
  downloading,
  loading,
  onDumpModeChange,
  onRequestDownload,
}: AdminDatabaseDumpPanelProps) {
  return (
    <Card sx={{ mt: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: '8px',
                bgcolor: 'rgba(2, 132, 199, 0.08)',
                color: 'primary.main',
                display: 'flex',
              }}
            >
              <StorageIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Резервное копирование и дамп базы данных
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Экспорт структуры и данных PostgreSQL в архивном формате .sql.gz для переноса и резервного хранения
              </Typography>
            </Box>
          </Box>
          <StatusBadge status="ACTIVE" label="PostgreSQL" size="small" />
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1, color: 'text.primary' }}>
                Выберите режим выгрузки дампа:
              </FormLabel>
              <RadioGroup
                row
                value={dumpMode}
                onChange={(event) => onDumpModeChange(event.target.value as DatabaseDumpMode)}
              >
                <FormControlLabel
                  value="full"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" fontWeight={dumpMode === 'full' ? 700 : 400}>Полный дамп (Схема + Данные)</Typography>}
                />
                <FormControlLabel
                  value="data"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" fontWeight={dumpMode === 'data' ? 700 : 400}>Только данные (INSERTs)</Typography>}
                />
                <FormControlLabel
                  value="schema"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" fontWeight={dumpMode === 'schema' ? 700 : 400}>Только структура (DDL)</Typography>}
                />
              </RadioGroup>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {dumpMode === 'full' && '• Создается полный самодостаточный дамп с удалением и созданием всех таблиц, связей и записей.'}
              {dumpMode === 'data' && '• Экспортируются только строки таблиц для восстановления поверх существующей структуры.'}
              {dumpMode === 'schema' && '• Экспортируется DDL-структура таблиц, индексов и ограничений без бизнес-данных.'}
            </Typography>
          </Grid>

          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="contained"
              color="primary"
              size="medium"
              startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <CloudDownloadIcon />}
              disabled={downloading || loading}
              onClick={onRequestDownload}
              sx={{ px: 3, py: 1.2, fontWeight: 700 }}
            >
              {downloading ? 'Формирование дампа...' : 'Скачать дамп БД (.sql.gz)'}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default AdminDatabaseDumpPanel;
