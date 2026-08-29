'use client';

import React from 'react';
import { Box, Card, CardContent, Chip, Divider, Grid, IconButton, Table, TableBody, TableCell, TableContainer, TableRow, Tooltip, Typography } from '@mui/material';
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
import { HealthScoreGauge, StatCard, StatusBadge } from '@/components/ui';
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
  const custom = (equipment.customFields || {}) as Record<string, unknown>;
  const actualWear = custom.actual_wear_percentage !== undefined && custom.actual_wear_percentage !== null && custom.actual_wear_percentage !== '' ? Number(custom.actual_wear_percentage) : null;
  const criticality = typeof custom.criticality === 'string' ? custom.criticality : 'B';
  const maintPeriodicity = typeof custom.maintenance_periodicity === 'string' ? custom.maintenance_periodicity : '';
  const maintScheduleYear = typeof custom.maintenance_schedule_year === 'string' ? custom.maintenance_schedule_year : '';
  const respPerson = typeof custom.responsible_person_name === 'string' ? custom.responsible_person_name : '';

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
              {sections.length === 0 && unassignedFields.length === 0 && (
                <Card sx={{ borderRadius: '12px', border: '1px solid divider' }}>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <TuneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                      Технические характеристики не настроены
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      В системе еще не заданы пользовательские технические параметры для паспортов оборудования.
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Dynamically configured Technical Sections */}
              {sections.map((section) => {
                const sectionFields = section.fields.filter((f) => custom[f.key] !== undefined && custom[f.key] !== null && custom[f.key] !== '');
                if (sectionFields.length === 0) return null;

                return (
                  <Card key={section.id} sx={{ borderRadius: '12px', border: '1px solid divider', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        {SECTION_ICONS[section.icon || 'Category'] || <CategoryIcon color="primary" />}
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {section.name}
                          </Typography>
                          {section.description && (
                            <Typography variant="caption" color="text.secondary">
                              {section.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Divider sx={{ mb: 1.5 }} />

                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {sectionFields.map((field) => (
                              <TableRow key={field.id}>
                                <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '45%', py: 1, borderBottom: '1px solid action.hover' }}>
                                  {field.name}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                                  <CustomFieldValueRenderer field={field} value={custom[field.key]} onCopy={onCopy} />
                                  {field.unit && (
                                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                      {field.unit}
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Unassigned / Default Parameters */}
              {unassignedFields.filter((f) => custom[f.key] !== undefined && custom[f.key] !== null && custom[f.key] !== '').length > 0 && (
                <Card sx={{ borderRadius: '12px', border: '1px solid divider', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <EngineeringIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Прочие технические характеристики
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 1.5 }} />

                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {unassignedFields
                            .filter((f) => custom[f.key] !== undefined && custom[f.key] !== null && custom[f.key] !== '')
                            .map((field) => (
                              <TableRow key={field.id}>
                                <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '45%', py: 1, borderBottom: '1px solid action.hover' }}>
                                  {field.name}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                                  <CustomFieldValueRenderer field={field} value={custom[field.key]} onCopy={onCopy} />
                                  {field.unit && (
                                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                      {field.unit}
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
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
