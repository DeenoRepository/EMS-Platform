'use client';

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { StatusBadge, HealthScoreGauge, EmptyState } from '@/components/ui';
import { formatDate } from '@ems/shared';
import { DashboardStatsData } from './DashboardKpiSection';

interface DashboardRecentActivityProps {
  stats: DashboardStatsData;
  isPersonalScope: boolean;
  availabilityRate: number;
}

export function DashboardRecentActivity({
  stats,
  isPersonalScope,
  availabilityRate,
}: DashboardRecentActivityProps) {
  const router = useRouter();

  return (
    <Grid container spacing={3}>
      {/* Left Column: Recent SRM Incidents & Upcoming MRO Schedules */}
      <Grid item xs={12} lg={7}>
        <Stack spacing={3}>
          {/* SRM Recent Issues Feed */}
          <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <BugReportOutlinedIcon sx={{ color: 'warning.main', fontSize: 22 }} />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    {isPersonalScope ? 'Мои обращения и инциденты (SRM)' : 'Оперативные инциденты и заявки (SRM)'}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => router.push('/srm')}
                  sx={{ fontWeight: 600, textTransform: 'none' }}
                >
                  Все заявки ({stats.srm.totalIssues || 0})
                </Button>
              </Box>

              {stats.srm.recentIssues.length === 0 ? (
                <EmptyState
                  title="Нет открытых инцидентов"
                  description={isPersonalScope ? 'В вашей зоне ответственности активных заявок нет.' : 'Все сервисные заявки и инциденты успешно закрыты.'}
                  minHeight={160}
                />
              ) : (
                <Stack spacing={1.5}>
                  {stats.srm.recentIssues.map((issue) => (
                    <Paper
                      key={issue.id}
                      variant="outlined"
                      onClick={() => router.push('/srm')}
                      sx={{
                        p: 1.75,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        borderColor: 'divider',
                        transition: 'all 0.15s ease',
                        '&:hover': { bgcolor: 'background.default', borderColor: 'divider' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Chip
                              label={issue.key}
                              size="small"
                              sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 800, bgcolor: 'action.hover', color: 'text.secondary' }}
                            />
                            <Typography variant="subtitle2" fontWeight={700} noWrap color="text.primary">
                              {issue.title}
                            </Typography>
                          </Box>
                          {issue.equipment && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Оборудование: <strong>{issue.equipment.name}</strong> ({issue.equipment.inventoryNumber || 'Б/Н'})
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                          <StatusBadge status={issue.priority} label={issue.priority} size="small" />
                          <StatusBadge status={issue.status} label={issue.status} size="small" />
                        </Stack>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* MRO Upcoming Maintenance Feed */}
          <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <BuildOutlinedIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    {isPersonalScope ? 'Мои ближайшие регламенты ТО (MRO)' : 'Ближайшие регламенты ТО и ППР (MRO)'}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => router.push('/mro')}
                  sx={{ fontWeight: 600, textTransform: 'none' }}
                >
                  График ППР ({stats.mro.totalCount || 0})
                </Button>
              </Box>

              {stats.mro.nextSchedules.length === 0 ? (
                <EmptyState
                  title="График ТО свободен"
                  description={isPersonalScope ? 'В вашей зоне ответственности нет запланированных ТО на ближайшее время.' : 'Все регламенты ТОиР выполнены в срок.'}
                  minHeight={160}
                />
              ) : (
                <Stack spacing={1.5}>
                  {stats.mro.nextSchedules.map((schedule) => (
                    <Paper
                      key={schedule.id}
                      variant="outlined"
                      onClick={() => router.push('/mro')}
                      sx={{
                        p: 1.75,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        borderColor: 'divider',
                        transition: 'all 0.15s ease',
                        '&:hover': { bgcolor: 'background.default', borderColor: 'divider' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap>
                            {schedule.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {schedule.equipmentName} • Срок: <strong>{formatDate(schedule.scheduledDate)}</strong>
                          </Typography>
                        </Box>
                        <StatusBadge status={schedule.status} label={schedule.status} size="small" />
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {/* Right Column: Readiness Score & WMS Critical Deficit */}
      <Grid item xs={12} lg={5}>
        <Stack spacing={3}>
          {/* Equipment Readiness & Health Gauge */}
          <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mb: 0.5, textAlign: 'left' }}>
                {isPersonalScope ? 'КТГ в зоне ответственности' : 'Коэффициент технической готовности (КТГ)'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'left' }}>
                {isPersonalScope
                  ? 'Доля исправного оборудования в вашей зоне ответственности'
                  : 'Доля исправного оборудования, готового к бесперебойной эксплуатации'}
              </Typography>

              <Box sx={{ py: 1 }}>
                <HealthScoreGauge score={availabilityRate} size="md" paper={false} title="" />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: '8px' }}>
                    <Typography variant="h6" fontWeight={800} color="success.dark">
                      {stats.eps.active || 0}
                    </Typography>
                    <Typography variant="caption" color="success.dark" fontWeight={600}>
                      В работе (Исправно)
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1, bgcolor: stats.eps.underRepair ? 'error.light' : 'background.default', borderRadius: '8px' }}>
                    <Typography variant="h6" fontWeight={800} color={stats.eps.underRepair ? 'error.main' : 'text.secondary'}>
                      {stats.eps.underRepair || 0}
                    </Typography>
                    <Typography variant="caption" color={stats.eps.underRepair ? 'error.dark' : 'text.secondary'} fontWeight={600}>
                      В ремонте / Отказ
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* WMS Critical Stock Deficit (if accessible) */}
          {stats.wms.accessible !== false && (
            <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <WarehouseOutlinedIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                      {isPersonalScope ? 'Дефицит ТМЦ (мои склады)' : 'Критический дефицит ТМЦ (WMS)'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => router.push('/wms/stock')}
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    К остаткам
                  </Button>
                </Box>

                {stats.wms.lowStockItems.length === 0 ? (
                  <EmptyState
                    title="Запасы в норме"
                    description={isPersonalScope ? 'На ваших складах нет позиций с остатком ниже минимального.' : 'На всех складах уровень ТМЦ соответствует нормативам.'}
                    minHeight={160}
                  />
                ) : (
                  <Stack spacing={1.5}>
                    {stats.wms.lowStockItems.map((item) => (
                      <Paper
                        key={item.id}
                        variant="outlined"
                        onClick={() => router.push('/wms/stock')}
                        sx={{
                          p: 1.5,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          borderColor: 'error.light',
                          bgcolor: 'background.paper',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: 'error.light', borderColor: 'error.main' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ minWidth: 0, mr: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700} noWrap color="text.primary">
                              {item.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Склад: <strong>{item.warehouseCode}</strong>
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                            <Typography variant="subtitle2" fontWeight={800} color="error.main">
                              {item.quantity} {item.unit}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              Мин: {item.minStock} {item.unit}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}

export default DashboardRecentActivity;
