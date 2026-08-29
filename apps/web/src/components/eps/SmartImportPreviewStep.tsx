import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';
import { DataTableWrapper, StatusBadge } from '@/components/ui';
import type { ValidatedRow } from './SmartImportWizard';

export type SmartImportPreviewFilter = 'ALL' | 'NEW' | 'COLLISION' | 'ERROR';
export type SmartImportConflictStrategy = 'UPSERT' | 'SKIP';

export interface SmartImportPreviewStepProps {
  conflictStrategy: SmartImportConflictStrategy;
  previewFilter: SmartImportPreviewFilter;
  filteredRows: ValidatedRow[];
  totalRowsCount: number;
  newCount: number;
  collisionCount: number;
  errorCount: number;
  executingImport: boolean;
  onConflictStrategyChange: (strategy: SmartImportConflictStrategy) => void;
  onPreviewFilterChange: (filter: SmartImportPreviewFilter) => void;
  onBack: () => void;
  onExecute: () => void;
}

export function SmartImportPreviewStep({
  conflictStrategy,
  previewFilter,
  filteredRows,
  totalRowsCount,
  newCount,
  collisionCount,
  errorCount,
  executingImport,
  onConflictStrategyChange,
  onPreviewFilterChange,
  onBack,
  onExecute,
}: SmartImportPreviewStepProps) {
  return (
    <Box>
      <Card sx={{ mb: 3, borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Стратегия разрешения коллизий и дубликатов
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Выберите действие при совпадении инвентарного или заводского номера с уже существующим оборудованием в базе
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Paper
                variant="outlined"
                onClick={() => onConflictStrategyChange('UPSERT')}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  borderRadius: '8px',
                  border: conflictStrategy === 'UPSERT' ? '2px solid primary.main' : '1px solid divider',
                  backgroundColor: conflictStrategy === 'UPSERT' ? 'rgba(2, 132, 199, 0.04)' : 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Radio checked={conflictStrategy === 'UPSERT'} size="small" />
                  <Typography variant="subtitle1" fontWeight={700} color={conflictStrategy === 'UPSERT' ? 'primary' : 'inherit'}>
                    Обновить существующие паспорта (UPSERT)
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                  При совпадении инвентарного номера данные карточки будут перезаписаны новыми значениями из файла.
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Paper
                variant="outlined"
                onClick={() => onConflictStrategyChange('SKIP')}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  borderRadius: '8px',
                  border: conflictStrategy === 'SKIP' ? '2px solid primary.main' : '1px solid divider',
                  backgroundColor: conflictStrategy === 'SKIP' ? 'rgba(2, 132, 199, 0.04)' : 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Radio checked={conflictStrategy === 'SKIP'} size="small" />
                  <Typography variant="subtitle1" fontWeight={700} color={conflictStrategy === 'SKIP' ? 'primary' : 'inherit'}>
                    Пропустить дубликаты (SKIP)
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                  Существующие карточки оборудования останутся без изменений, будут добавлены только новые единицы.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Предпросмотр данных ({totalRowsCount} строк)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Результаты автоматической проверки строк перед загрузкой в систему
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label={`Все (${totalRowsCount})`} color={previewFilter === 'ALL' ? 'primary' : 'default'} onClick={() => onPreviewFilterChange('ALL')} clickable size="small" />
              <Chip label={`Новые (${newCount})`} color={previewFilter === 'NEW' ? 'success' : 'default'} onClick={() => onPreviewFilterChange('NEW')} clickable size="small" />
              <Chip label={`Коллизии (${collisionCount})`} color={previewFilter === 'COLLISION' ? 'warning' : 'default'} onClick={() => onPreviewFilterChange('COLLISION')} clickable size="small" />
              {errorCount > 0 && (
                <Chip label={`Ошибки (${errorCount})`} color={previewFilter === 'ERROR' ? 'error' : 'default'} onClick={() => onPreviewFilterChange('ERROR')} clickable size="small" />
              )}
            </Box>
          </Box>

          <DataTableWrapper total={filteredRows.length} stickyHeader maxHeight={420}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 48 }}>Стр.</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Наименование</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Инв. №</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Серийный №</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Производитель</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Локация</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.slice(0, 100).map((row) => (
                  <TableRow key={row.rowIndex} hover>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{row.rowIndex}</TableCell>
                    <TableCell>
                      {row.status === 'NEW' ? (
                        <StatusBadge status="ACTIVE" label="Новый объект" size="small" />
                      ) : row.status === 'COLLISION' ? (
                        <StatusBadge status="PENDING" label="Совпадение инв. №" size="small" />
                      ) : (
                        <StatusBadge status="ERROR" label="Ошибка данных" size="small" />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{row.data.name || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{row.data.inventoryNumber || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{row.data.serialNumber || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{row.data.manufacturer || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{row.data.location || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableWrapper>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>
          Назад к сопоставлению
        </Button>
        <Button
          variant="contained"
          size="large"
          disabled={executingImport || totalRowsCount === 0}
          onClick={onExecute}
          endIcon={executingImport ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          sx={{ fontWeight: 700, px: 4 }}
        >
          {executingImport ? 'Выполнение импорта...' : `Импортировать ${totalRowsCount} записей`}
        </Button>
      </Box>
    </Box>
  );
}

export default SmartImportPreviewStep;
