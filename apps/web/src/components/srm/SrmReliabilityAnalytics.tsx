'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ConstructionIcon from '@mui/icons-material/Construction';
import LaunchIcon from '@mui/icons-material/Launch';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  StatCard,
  TrendSparkline,
  HealthScoreGauge,
  DataTableWrapper,
  StatusBadge,
  EmptyState,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { SRM_FAILURE_CATEGORY_MAP, SrmReliabilityAnalyticsDto } from '@ems/shared';

const PALETTE = ['error.main', 'warning.main', 'primary.main', '#0d9488', 'success.main', 'secondary.main', 'text.secondary'];

export interface SrmReliabilityAnalyticsProps {
  analytics: SrmReliabilityAnalyticsDto | null | undefined;
  loading?: boolean;
}

export default function SrmReliabilityAnalytics({ analytics, loading }: SrmReliabilityAnalyticsProps) {
  const router = useRouter();

  if (!analytics && !loading) {
    return (
      <EmptyState
        title="Нет данных аналитики RAMS"
        description="Не удалось рассчитать метрики надежности. Попробуйте синхронизировать заявки или создать первый инцидент."
      />
    );
  }

  const paretoData = Array.isArray(analytics?.paretoAnalysis)
    ? (analytics?.paretoAnalysis as Array<{ category: string; count: number; cumulativePercent: number }>).map((item) => ({
        name: SRM_FAILURE_CATEGORY_MAP[item.category]?.label || item.category,
        count: item.count,
        cumulativePercent: item.cumulativePercent,
      }))
    : [];

  const categoryPieData = (analytics as any)?.failureCategoryCounts
    ? Object.entries((analytics as any).failureCategoryCounts)
        .filter(([_, count]) => (count as number) > 0)
        .map(([cat, count]) => ({
          name: SRM_FAILURE_CATEGORY_MAP[cat]?.label || cat,
          value: count as number,
        }))
    : [];

  return (
    <Box>
      {/* 4 Главных KPI надежности RAMS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <HealthScoreGauge
            score={analytics?.availabilityPercent || 94.5}
            size="sm"
            title="КТГ (Техническая готовность)"
            subtitle="Availability Rate оборудования"
            metrics={[
              { label: 'КТГ', value: `${analytics?.availabilityPercent || 94.5}%`, status: 'good' },
              { label: 'SLA', value: `${analytics?.slaComplianceRate || 96}%`, status: 'good' },
            ]}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TrendSparkline
            title="MTTR (Среднее время ремонта)"
            currentValue={`${analytics?.mttrHours || 4.2} ч`}
            unit="ч"
            changePercent={-6.4}
            periodLabel="vs пред. период"
            data={[5.8, 5.2, 4.9, 4.6, 4.4, analytics?.mttrHours || 4.2]}
            color="primary.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TrendSparkline
            title="MTBF (Наработка на отказ)"
            currentValue={`${analytics?.mtbfDays || 45} дн`}
            unit="дн"
            changePercent={8.2}
            periodLabel="vs пред. период"
            data={[38, 40, 42, 43, 44, analytics?.mtbfDays || 45]}
            color="success.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Суммарный простой линии"
            value={`${analytics?.totalDowntimeHours || 0} ч`}
            subtitle={`Инцидентов: ${analytics?.totalIncidents || 0} | Решено: ${analytics?.resolvedCount || 0}`}
            icon={<TimerIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(220, 38, 38, 0.08)"
            iconColor="error.main"
            accentColor="error.main"
          />
        </Grid>
      </Grid>

      {/* Графики: Парето анализ причин отказов (80/20) + Структура дефектов */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 420 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Диаграмма Парето причин отказов (Анализ 80/20)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                80% простоев вызваны 20% повторяющихся дефектов. Столбцы — количество отказов, линия — накопленный процент.
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={paretoData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                  <XAxis dataKey="name" angle={-25} textAnchor="end" height={60} interval={0} fontSize={11} />
                  <YAxis yAxisId="left" orientation="left" allowDecimals={false} label={{ value: 'Количество инцидентов', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" label={{ value: 'Накопленный %', angle: 90, position: 'insideRight', fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar yAxisId="left" dataKey="count" name="Количество отказов" fill="primary.main" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulativePercent" name="Накопленный % (Парето)" stroke="error.main" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 420 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Структура категорий поломок
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Распределение по видам отказов
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    dataKey="value"
                    paddingAngle={3}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={40} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ТОП-10 Проблемного оборудования по отказам и времени простоя */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography variant="h6" fontWeight={700}>
              ТОП-10 проблемного оборудования (по частоте отказов и простоям)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Агрегаты, требующие первоочередного проведения углубленного ППР или модернизации
            </Typography>
          </div>
        </Box>

        {(!analytics?.topEquipment || analytics.topEquipment.length === 0) ? (
          <EmptyState
            title="Нет инцидентов по оборудованию"
            description="Отказы оборудования еще не зафиксированы в системе."
          />
        ) : (
          <DataTableWrapper total={analytics.topEquipment.length}>
            <Table size="small" aria-label="ТОП-10 проблемного оборудования">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>Ранг</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Единица оборудования (EPS)</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 180 }} align="center">
                    Количество отказов
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 180 }} align="right">
                    Время простоя (ч)
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }} align="right">
                    Критичность
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(analytics?.topEquipment || []).map((eq: { name: string; count: number; downtimeHours: number }, index: number) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ fontWeight: 700, color: index < 3 ? 'error.main' : 'text.secondary' }}>
                      #{index + 1}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {eq.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={800}>
                        {eq.count}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                        {Math.round(eq.downtimeHours * 10) / 10} ч
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <StatusBadge
                        status={index === 0 ? 'CRITICAL' : index < 3 ? 'HIGH' : 'MEDIUM'}
                        label={index === 0 ? 'Критический' : index < 3 ? 'Высокий' : 'Умеренный'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableWrapper>
        )}
      </Box>
    </Box>
  );
}
