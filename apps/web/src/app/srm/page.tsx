'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SyncIcon from '@mui/icons-material/Sync';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PageHeader from '@/components/layout/PageHeader';
import { useSnackbar } from 'notistack';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, PieChart, Pie, Legend } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  Open: '#f44336',
  'In Progress': '#ff9800',
  Closed: '#4caf50',
  Resolved: '#2196f3',
};

const PIE_COLORS = ['#3f51b5', '#00bcd4', '#4caf50', '#ff9800', '#f44336'];

export default function SrmOverviewPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resStats, resIssues] = await Promise.all([
        fetch('/api/srm/stats').then((r) => r.json()),
        fetch('/api/srm/issues').then((r) => r.json()),
      ]);

      if (resStats.success) setStats(resStats.data);
      if (resIssues.success) setIssues(resIssues.data);
    } catch (err) {
      console.error('Ошибка загрузки дашборда Jira:', err);
      enqueueSnackbar('Не удалось загрузить данные SRM', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/srm/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar(data.message || 'Синхронизация завершена', { variant: 'success' });
        loadData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка синхронизации', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера при синхронизации', { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const statusChartData = stats?.statusCounts
    ? Object.entries(stats.statusCounts).map(([status, count]) => ({
        status,
        count,
      }))
    : [];

  const priorityChartData = stats?.priorityCounts
    ? Object.entries(stats.priorityCounts).map(([priority, value]) => ({
        name: priority,
        value,
      }))
    : [];

  return (
    <Box>
      <PageHeader
        title="SRM — Дашборд заявок Jira"
        subtitle="Мониторинг заявок на ремонт оборудования, контроль SLA и аналитика метрик надежности"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Дашборд Jira' }]}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            Синхронизировать с Jira
          </Button>
        }
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPI КАРТОЧКИ */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <SpeedIcon color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      MTTR (Время ремонта)
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={800} color="primary.main">
                    {stats?.mttrHours || '0'} ч
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Средняя длительность устранения поломки
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <TimerIcon color="secondary" sx={{ fontSize: 32 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      MTBF (Наработка)
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={800} color="secondary.main">
                    {stats?.mtbfDays || '0'} дн
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Средняя наработка между отказами
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <AssessmentIcon color="success" sx={{ fontSize: 32 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      SLA Соответствие
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={800} color="success.main">
                    {stats?.slaCompliancePercent || '100'}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Решено в регламентный срок (&le; 24ч)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <BugReportIcon color="error" sx={{ fontSize: 32 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Активные инциденты
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={800} color="error.main">
                    {stats?.openCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Требуют внимания / в работе
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ГРАФИКИ АНАЛИТИКИ */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={7}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Распределение заявок по статусам
                  </Typography>
                  <Box sx={{ height: 260, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <XAxis dataKey="status" />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#3f51b5" radius={[6, 6, 0, 0]}>
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#3f51b5'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Критичность заявок
                  </Typography>
                  <Box sx={{ height: 260, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {priorityChartData.map((_, index) => (
                            <Cell key={`pie-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ТАБЛИЦА ТИКЕТОВ ИЗ JIRA */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Последние инциденты и заявки на ремонт
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ключ</TableCell>
                    <TableCell>Тема инцидента</TableCell>
                    <TableCell>Тип</TableCell>
                    <TableCell>Приоритет</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Исполнитель</TableCell>
                    <TableCell>Дата создания</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {issues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        Заявки Jira отсутствуют в кэше. Нажмите «Синхронизировать с Jira».
                      </TableCell>
                    </TableRow>
                  ) : (
                    issues.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="primary">
                            {item.issueKey}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {item.summary}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={item.issueType} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.priority}
                            color={item.priority === 'Highest' || item.priority === 'High' ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.status}
                            color={item.status === 'Closed' ? 'success' : item.status === 'In Progress' ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{item.assignee || 'Не назначен'}</TableCell>
                        <TableCell>{new Date(item.createdDate).toLocaleDateString('ru-RU')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
