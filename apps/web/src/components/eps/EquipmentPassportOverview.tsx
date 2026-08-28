'use client';

import React from 'react';
import { Box, Card, CardContent, Chip, Divider, Grid, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Tooltip, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldIcon from '@mui/icons-material/Shield';
import StraightenIcon from '@mui/icons-material/Straighten';
import SpeedIcon from '@mui/icons-material/Speed';
import TuneIcon from '@mui/icons-material/Tune';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { EQUIPMENT_STATUS_MAP, formatDate } from '@ems/shared';
import { CustomFieldValueRenderer } from '@/components/eps/CustomFieldValueRenderer';
import { HealthScoreGauge, StatCard } from '@/components/ui';
import type { CustomFieldDef, CustomSectionDef, EquipmentDetails } from '@/app/eps/[id]/page';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Category: <CategoryIcon color="primary" />,
  Speed: <SpeedIcon color="error" />,
  Shield: <ShieldIcon color="success" />,
  Engineering: <EngineeringIcon color="warning" />,
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="info" />,
  Straighten: <StraightenIcon color="secondary" />,
  Tune: <TuneIcon color="primary" />,
};

interface EquipmentPassportOverviewProps {
  activeTab: number;
  equipment: EquipmentDetails;
  sections: CustomSectionDef[];
  unassignedFields: CustomFieldDef[];
  healthScore: number;
  onCopy: (text: string, label: string) => void;
}

export function EquipmentPassportOverview({ activeTab, equipment, sections, unassignedFields, healthScore, onCopy }: EquipmentPassportOverviewProps) {
  const statusInfo = EQUIPMENT_STATUS_MAP[equipment.status] || { label: equipment.status };
  const custom = equipment.customFields || {};
  const actualWear = custom.actual_wear_percentage !== undefined && custom.actual_wear_percentage !== null && custom.actual_wear_percentage !== '' ? Number(custom.actual_wear_percentage) : null;
  const criticality = custom.criticality || 'B';
  const maintPeriodicity = custom.maintenance_periodicity || '';
  const maintScheduleYear = custom.maintenance_schedule_year || '';
  const respPerson = custom.responsible_person_name || '';

  return (
    <>
      {/* Top Overview KPI Panel (4x StatCards) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Статус актива"
            value={statusInfo.label}
            subtitle={equipment.location ? `Локация: ${equipment.location}` : `Ввод: ${formatDate(equipment.commissionDate)}`}
            icon={<PrecisionManufacturingIcon sx={{ fontSize: 24 }} />}
            accentColor="primary.main"
            iconColor="primary.main"
            iconBgColor="info.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Физический износ"
            value={actualWear !== null ? `${actualWear}%` : '—'}
            subtitle={
              actualWear !== null
                ? actualWear < 30
                  ? 'Состояние в норме'
                  : actualWear < 70
                  ? 'Умеренный износ'
                  : 'Критический износ'
                : 'Амортизация не задана'
            }
            icon={<SpeedIcon sx={{ fontSize: 24 }} />}
            accentColor={
              actualWear !== null && actualWear > 70
                ? 'error.main'
                : actualWear !== null && actualWear > 30
                ? 'warning.main'
                : 'success.main'
            }
            iconColor={
              actualWear !== null && actualWear > 70
                ? 'error.main'
                : actualWear !== null && actualWear > 30
                ? 'warning.main'
                : 'success.main'
            }
            iconBgColor={
              actualWear !== null && actualWear > 70
                ? 'error.light'
                : actualWear !== null && actualWear > 30
                ? 'warning.light'
                : 'success.light'
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Регламент ТОиР"
            value={maintPeriodicity || (equipment.maintenancePlans.length > 0 ? `${equipment.maintenancePlans.length} плана ТО` : 'По регламенту')}
            subtitle={maintScheduleYear ? `График: ${maintScheduleYear}` : 'График ППР 2026'}
            icon={<ShieldIcon sx={{ fontSize: 24 }} />}
            accentColor="success.main"
            iconColor="success.main"
            iconBgColor="success.light"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Критичность актива"
            value={`Класс ${criticality}`}
            subtitle={equipment.spareParts.length > 0 ? `Запас ТМЦ: ${equipment.spareParts.length} поз.` : 'Категория надежности'}
            icon={<CategoryIcon sx={{ fontSize: 24 }} />}
            accentColor={criticality === 'A' ? 'error.main' : criticality === 'B' ? 'warning.main' : 'primary.light'}
            iconColor={criticality === 'A' ? 'error.main' : criticality === 'B' ? 'warning.main' : 'primary.light'}
            iconBgColor={criticality === 'A' ? 'error.light' : criticality === 'B' ? 'warning.light' : 'info.light'}
          />
        </Grid>
      </Grid>

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
                          <TableCell sx={{ fontWeight: 500, width: '42%', color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Наименование
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, py: 1, borderBottom: '1px solid action.hover' }}>
                            {equipment.name}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Инвентарный номер
                          </TableCell>
                          <TableCell sx={{ py: 1, borderBottom: '1px solid action.hover' }}>
                            {equipment.inventoryNumber ? (
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    px: 1,
                                    py: 0.2,
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    bgcolor: 'background.default',
                                    fontSize: '0.8125rem',
                                    borderRadius: '5px',
                                    color: 'text.primary',
                                    borderColor: 'grey.400',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {equipment.inventoryNumber}
                                </Paper>
                                <Tooltip title="Скопировать инвентарный номер">
                                  <IconButton
                                    size="small"
                                    sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
                                    onClick={() => onCopy(equipment.inventoryNumber || '', 'Инвентарный номер')}
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Заводской / Серийный №
                          </TableCell>
                          <TableCell sx={{ py: 1, borderBottom: '1px solid action.hover' }}>
                            {equipment.serialNumber ? (
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    px: 1,
                                    py: 0.2,
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    bgcolor: 'background.default',
                                    fontSize: '0.8125rem',
                                    borderRadius: '5px',
                                    color: 'text.primary',
                                    borderColor: 'grey.400',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {equipment.serialNumber}
                                </Paper>
                                <Tooltip title="Скопировать серийный номер">
                                  <IconButton
                                    size="small"
                                    sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
                                    onClick={() => onCopy(equipment.serialNumber || '', 'Серийный номер')}
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Производитель (Бренд)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                            {equipment.manufacturer || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Модель / Модификация
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                            {equipment.model || <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: '1px solid action.hover' }}>
                            Место установки (Локация)
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
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary', py: 1, borderBottom: equipment.tags.length > 0 ? '1px solid action.hover' : 0 }}>
                            Паспорт зарегистрировал
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: equipment.tags.length > 0 ? '1px solid action.hover' : 0 }}>
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
                                    variant="outlined"
                                    sx={{
                                      backgroundColor: tag.color ? `${tag.color}15` : undefined,
                                      color: tag.color || 'inherit',
                                      borderColor: tag.color || undefined,
                                      fontWeight: 600,
                                      height: 22,
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

              {/* Card 2: Индекс технического состояния */}
              <HealthScoreGauge
                score={healthScore}
                size="sm"
                title="Индекс технического состояния"
                subtitle="Комплексная надежность и готовность актива"
                metrics={[
                  { label: 'Планы ТО', value: equipment.maintenancePlans.length, status: equipment.maintenancePlans.length > 0 ? 'good' : 'warning' },
                  { label: 'Инциденты', value: (equipment.jiraIssues || []).length, status: (equipment.jiraIssues || []).length > 0 ? 'critical' : 'good' },
                  { label: 'Запас ТМЦ', value: equipment.spareParts.length, status: 'good' },
                ]}
              />
            </Box>
          </Grid>

          {/* RIGHT COLUMN (7/12): Все технические разделы и характеристики */}
          <Grid item xs={12} lg={7}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Dynamic Custom Sections from Database */}
              {sections.map((sec) => (
                <Card key={sec.id} sx={{ borderRadius: '12px', border: '1px solid divider', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      {SECTION_ICONS[sec.icon || 'Category'] || <CategoryIcon color="primary" />}
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {sec.name}
                        </Typography>
                        {sec.description && (
                          <Typography variant="caption" color="text.secondary">
                            {sec.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 1.5 }} />

                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {sec.fields.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} sx={{ py: 1.5, color: 'text.secondary', textAlign: 'center' }}>
                                В данном разделе пока нет настроенных характеристик
                              </TableCell>
                            </TableRow>
                          ) : (
                            sec.fields.map((f, fIdx) => {
                              const val = equipment.customFields?.[f.key];
                              const isLast = fIdx === sec.fields.length - 1;
                              return (
                                <TableRow key={f.key}>
                                  <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '42%', py: 1, borderBottom: isLast ? 0 : '1px solid action.hover' }}>
                                    {f.name}
                                  </TableCell>
                                  <TableCell sx={{ py: 1, borderBottom: isLast ? 0 : '1px solid action.hover' }}>
                                    <CustomFieldValueRenderer field={f} value={val} onCopy={onCopy} />
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}

              {/* Unassigned Custom Fields if any */}
              {unassignedFields.length > 0 && (
                <Card sx={{ borderRadius: '12px', border: '1px solid divider', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <TuneIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Дополнительные параметры
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 1.5 }} />

                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {unassignedFields.map((f, uIdx) => {
                            const val = equipment.customFields?.[f.key];
                            const isLast = uIdx === unassignedFields.length - 1;
                            return (
                              <TableRow key={f.key}>
                                <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '42%', py: 1, borderBottom: isLast ? 0 : '1px solid action.hover' }}>
                                  {f.name}
                                </TableCell>
                                <TableCell sx={{ py: 1, borderBottom: isLast ? 0 : '1px solid action.hover' }}>
                                  <CustomFieldValueRenderer field={f} value={val} onCopy={onCopy} />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>
        </Grid>
      )}
    </>
  );
}
