import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { CriticalAlertBanner, DataTableWrapper, StatusBadge } from '@/components/ui';
import type {
  MissingFieldItem,
  MissingFieldResolution,
  ValidatedRow,
} from './SmartImportWizard';

export interface SmartImportMappingStepProps {
  fileHeaders: string[];
  columnMapping: Record<string, string>;
  missingFields: MissingFieldItem[];
  resolutions: Record<string, MissingFieldResolution>;
  availableSections: Array<{ id: string; name: string }>;
  onUpdateResolution: (header: string, updates: Partial<MissingFieldResolution>) => void;
  onBack: () => void;
  onProceed: () => void;
}

export function SmartImportMappingStep({
  fileHeaders,
  columnMapping,
  missingFields,
  resolutions,
  availableSections,
  onUpdateResolution,
  onBack,
  onProceed,
}: SmartImportMappingStepProps) {
  return (
    <Box>
      {missingFields.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <CriticalAlertBanner
            alerts={[
              {
                id: 'missing-fields-alert',
                severity: 'INFO',
                title: `Обнаружено новых колонок: ${missingFields.length}`,
                description:
                  'В загруженном файле найдены колонки, которых пока нет в справочнике характеристик оборудования. Вы можете добавить их в систему как новые поля или пропустить.',
              },
            ]}
          />
        </Box>
      )}

      {missingFields.length > 0 && (
        <Card sx={{ mb: 3, border: '1px solid primary.main', borderRadius: '12px' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AddCircleOutlineIcon color="primary" sx={{ fontSize: 24 }} />
              <Typography variant="h6" fontWeight={700}>
                Разрешение недостающих полей ({missingFields.length})
              </Typography>
            </Box>

            <Grid container spacing={2.5}>
              {missingFields.map((missingField) => {
                const resolution = resolutions[missingField.header] || {
                  action: 'CREATE' as const,
                  name: missingField.suggestedName,
                  key: missingField.suggestedKey,
                  fieldType: missingField.suggestedType,
                  unit: '',
                  sectionId: '',
                };

                return (
                  <Grid item xs={12} key={missingField.header}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        backgroundColor: resolution.action === 'CREATE' ? 'success.light' : 'background.default',
                        borderRadius: '8px',
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                            «{missingField.header}»
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Примеры из файла: {missingField.sampleValues.slice(0, 2).join(', ') || '—'}
                          </Typography>
                        </Grid>

                        <Grid item xs={12} md={3}>
                          <FormControl component="fieldset">
                            <RadioGroup
                              row
                              value={resolution.action}
                              onChange={(event) =>
                                onUpdateResolution(missingField.header, {
                                  action: event.target.value as MissingFieldResolution['action'],
                                })
                              }
                            >
                              <FormControlLabel value="CREATE" control={<Radio size="small" />} label="Добавить в справочник" />
                              <FormControlLabel value="IGNORE" control={<Radio size="small" />} label="Игнорировать" />
                            </RadioGroup>
                          </FormControl>
                        </Grid>

                        {resolution.action === 'CREATE' && (
                          <>
                            <Grid item xs={12} sm={4} md={2}>
                              <TextField
                                label="Название поля"
                                size="small"
                                fullWidth
                                value={resolution.name}
                                onChange={(event) => onUpdateResolution(missingField.header, { name: event.target.value })}
                              />
                            </Grid>
                            <Grid item xs={12} sm={4} md={1.5}>
                              <TextField
                                select
                                label="Тип данных"
                                size="small"
                                fullWidth
                                value={resolution.fieldType}
                                onChange={(event) =>
                                  onUpdateResolution(missingField.header, {
                                    fieldType: event.target.value as MissingFieldResolution['fieldType'],
                                  })
                                }
                              >
                                <MenuItem value="TEXT">Текст</MenuItem>
                                <MenuItem value="NUMBER">Число</MenuItem>
                                <MenuItem value="DATE">Дата</MenuItem>
                                <MenuItem value="BOOLEAN">Да/Нет</MenuItem>
                              </TextField>
                            </Grid>
                            <Grid item xs={12} sm={4} md={1}>
                              <TextField
                                label="Ед. изм."
                                size="small"
                                fullWidth
                                value={resolution.unit}
                                placeholder="кВт, бар..."
                                onChange={(event) => onUpdateResolution(missingField.header, { unit: event.target.value })}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={1.5}>
                              <TextField
                                select
                                label="Раздел"
                                size="small"
                                fullWidth
                                value={resolution.sectionId}
                                onChange={(event) => onUpdateResolution(missingField.header, { sectionId: event.target.value })}
                              >
                                <MenuItem value="">Общий раздел</MenuItem>
                                {availableSections.map((section) => (
                                  <MenuItem key={section.id} value={section.id}>
                                    {section.name}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3, borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Итоговая карта сопоставления колонок
          </Typography>
          <DataTableWrapper total={fileHeaders.length} stickyHeader>
            <Table size="small" aria-label="Карта сопоставления колонок">
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Колонка в файле</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Статус распознавания</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Поле в EMS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fileHeaders.map((header) => {
                  const isMissing = missingFields.some((missingField) => missingField.header === header);
                  const resolution = resolutions[header];
                  const mappedKey = columnMapping[header];

                  return (
                    <TableRow key={header} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{header}</TableCell>
                      <TableCell>
                        {isMissing ? (
                          resolution?.action === 'CREATE' ? (
                            <StatusBadge status="ACTIVE" label="Будет создано новое поле" size="small" />
                          ) : (
                            <StatusBadge status="DECOMMISSIONED" label="Будет пропущено (Игнорируется)" size="small" />
                          )
                        ) : (
                          <StatusBadge status="ACTIVE" label="Распознано автоматически" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                        {isMissing ? (resolution?.action === 'CREATE' ? `${resolution.name} (${resolution.key})` : '—') : mappedKey}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableWrapper>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>
          Назад к выбору файла
        </Button>
        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={onProceed} sx={{ fontWeight: 700, px: 3 }}>
          Продолжить к проверке коллизий
        </Button>
      </Box>
    </Box>
  );
}

export default SmartImportMappingStep;
