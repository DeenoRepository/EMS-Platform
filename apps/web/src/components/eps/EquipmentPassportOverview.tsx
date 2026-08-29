'use client';

import React from 'react';
import { Box, Card, CardContent, Chip, Divider, Grid, IconButton, Table, TableBody, TableCell, TableContainer, TableRow, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShieldIcon from '@mui/icons-material/Shield';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { formatDate } from '@ems/shared';
import { CustomFieldValueRenderer } from '@/components/eps/CustomFieldValueRenderer';
import { EquipmentPassportKpiPanel } from '@/components/eps/EquipmentPassportKpiPanel';
import { EquipmentPassportTechnicalSections, EquipmentPassportTechnicalSectionsEmptyState } from '@/components/eps/EquipmentPassportTechnicalSections';
import { HealthScoreGauge, StatusBadge } from '@/components/ui';
import type { CustomFieldDef, CustomSectionDef, EquipmentDetails } from '@/app/eps/[id]/page';

interface EquipmentPassportOverviewProps {
  activeTab: number;
  equipment: EquipmentDetails;
  sections: CustomSectionDef[];
  unassignedFields: CustomFieldDef[];
  healthScore: number;
  onCopy: (text: string, label: string) => void;
}

export function EquipmentPassportOverview({ activeTab, equipment, sections, unassignedFields, healthScore, onCopy }: EquipmentPassportOverviewProps) {
  const custom = (equipment.customFields || {}) as Record<string, unknown>;
  const actualWear = custom.actual_wear_percentage !== undefined && custom.actual_wear_percentage !== null && custom.actual_wear_percentage !== '' ? Number(custom.actual_wear_percentage) : null;
  const respPerson = typeof custom.responsible_person_name === 'string' ? custom.responsible_person_name : '';

  return (
    <>
      <EquipmentPassportKpiPanel equipment={equipment} />

      {/* TAB 0: Паспорт (Сбалансированная инженерная сетка 5/7) */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* LEFT COLUMN (5/12): Идентификация, Размещение, Метрология, Надежность */}
          <Grid item xs={12} lg={5}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Card 1: Основные реквизиты и размещение */}
              <Card sx={{ borderRadius: '12px', border: '1px solid divider', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <PrecisionManufacturingIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Основные реквизиты и размещение
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />

                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '45%', py: 1, borderBottom: '1px solid action.hover' }}>
                            Инвентарный номер
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, py: 1, borderBottom: '1px solid action.hover' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                {equipment.inventoryNumber || '—'}
                              </Typography>
                              {equipment.inventoryNumber && (
                                <Tooltip title="Скопировать инвентарный номер">
                                  <IconButton size="small" onClick={() => onCopy(equipment.inventoryNumber || '', 'Инвентарный номер')}>
                                    <ContentCopyIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Заводской (серийный) номер
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {equipment.serialNumber || '—'}
                              </Typography>
                              {equipment.serialNumber && (
                                <Tooltip title="Скопировать заводской номер">
                                  <IconButton size="small" onClick={() => onCopy(equipment.serialNumber || '', 'Заводской номер')}>
                                    <ContentCopyIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Изготовитель (Вендор)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                            {equipment.manufacturer || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Модель / Типоразмер
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                            {equipment.model || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Место установки / Позиция
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                            {equipment.location || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Ответственное лицо (МОЛ)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                            {respPerson || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Дата ввода в эксплуатацию
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                            {equipment.commissionDate ? formatDate(equipment.commissionDate) : <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: equipment.tags.length > 0 ? '1px solid action.hover' : 'none' }}>
                            Паспорт зарегистрировал
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: equipment.tags.length > 0 ? '1px solid action.hover' : 'none' }}>
                            {equipment.createdBy?.displayName} ({formatDate(equipment.createdAt)})
                          </TableCell>
                        </TableRow>
                        {equipment.tags.length > 0 && (
                          <TableRow>
                            <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: 0 }}>
                              Теги классификации
                            </TableCell>
                            <TableCell sx={{ py: 1, borderBottom: 0 }}>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {equipment.tags.map(({ tag }) => (
                                  <Chip
                                    key={tag.id}
                                    label={tag.name}
                                    size="small"
                                    sx={{
                                      backgroundColor: tag.color ? `${tag.color}22` : 'primary.light',
                                      color: tag.color || 'primary.dark',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                    }}
                                  />
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Card 2: Health Score & Эксплуатационный статус */}
              <Card sx={{ borderRadius: '12px', border: '1px solid divider', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <ShieldIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Эксплуатационный статус и надежность
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', py: 1, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <HealthScoreGauge score={healthScore} size="md" />
                      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                        Индекс здоровья (Health Score)
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Текущий статус:
                        </Typography>
                        <StatusBadge status={equipment.status} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Степень износа:
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color={actualWear !== null && actualWear > 50 ? 'warning.main' : 'success.main'}>
                          {actualWear !== null ? `${actualWear}% физического износа` : 'Не определен'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>

          {/* RIGHT COLUMN (7/12): Технические разделы и характеристики */}
          <Grid item xs={12} lg={7}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {sections.length === 0 && unassignedFields.length === 0 && <EquipmentPassportTechnicalSectionsEmptyState />}
              <EquipmentPassportTechnicalSections custom={custom} sections={sections} unassignedFields={unassignedFields} onCopy={onCopy} />
            </Box>
          </Grid>
        </Grid>
      )}
    </>
  );
}
