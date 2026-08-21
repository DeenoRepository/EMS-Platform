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
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
  Divider,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PageHeader from '@/components/layout/PageHeader';
import { MAINTENANCE_STATUS_MAP, PERMISSIONS } from '@ems/shared';
import { useSnackbar } from 'notistack';
import {
  StatCard,
  DataTableWrapper,
  EmptyState,
  StatusBadge,
  CriticalAlertBanner,
  TrendSparkline,
  PageLoading,
  FormDialog,
  NavTabsContainer,
} from '@/components/ui';
import { MroExecutionWizardDialog } from '@/components/mro';
import { useAuth } from '@/lib/auth-client';

export default function MroOverviewPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Data states
  const [schedules, setSchedules] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [nomenclatureList, setNomenclatureList] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Dialog states
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [openPlanDialog, setOpenPlanDialog] = useState(false);
  const [openChecklistDialog, setOpenChecklistDialog] = useState(false);
  const [openExecuteDialog, setOpenExecuteDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    equipmentId: '',
    planId: '',
    title: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [planForm, setPlanForm] = useState({
    equipmentId: '',
    name: '',
    description: '',
    frequency: 'MONTHLY',
    intervalDays: 30,
    checklistId: '',
  });

  const [checklistForm, setChecklistForm] = useState({
    name: '',
    description: '',
    items: [{ description: '', itemType: 'BOOLEAN', isRequired: true }],
  });

  // Execution form state
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, any>>({});
  const [usedParts, setUsedParts] = useState<{ nomenclatureId: string; warehouseId: string; quantity: number }[]>([]);
  const [execNotes, setExecNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [resSchedules, resPlans, resChecklists, resEquip, resNom, resWh] = await Promise.all([
        fetch('/api/mro/schedules').then((r) => r.json()),
        fetch('/api/mro/plans').then((r) => r.json()),
        fetch('/api/mro/checklists').then((r) => r.json()),
        fetch('/api/eps/equipment?limit=100').then((r) => r.json()),
        fetch('/api/wms/nomenclature').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/wms/warehouses').then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (resSchedules.success) setSchedules(resSchedules.data);
      if (resPlans.success) setPlans(resPlans.data);
      if (resChecklists.success) setChecklists(resChecklists.data);
      if (resEquip.success) setEquipmentList(resEquip.data?.items || resEquip.data || []);
      if (resNom.success) setNomenclatureList(resNom.data || []);
      if (resWh.success) setWarehouses(resWh.data || []);
    } catch (err) {
      console.error('Ошибка загрузки данных ТОиР:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSchedule = async () => {
    try {
      const res = await fetch('/api/mro/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Работа по ТО успешно запланирована', { variant: 'success' });
        setOpenScheduleDialog(false);
        loadData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка планирования', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера при создании', { variant: 'error' });
    }
  };

  const handleCreatePlan = async () => {
    try {
      const res = await fetch('/api/mro/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Регламентный план ТО создан', { variant: 'success' });
        setOpenPlanDialog(false);
        loadData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания плана', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера', { variant: 'error' });
    }
  };

  const handleCreateChecklist = async () => {
    try {
      const res = await fetch('/api/mro/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checklistForm),
      });
      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Шаблон чек-листа создан', { variant: 'success' });
        setOpenChecklistDialog(false);
        loadData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка создания чек-листа', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера', { variant: 'error' });
    }
  };

  const handleOpenExecute = (sched: any) => {
    setSelectedSchedule(sched);
    setExecNotes(sched.notes || '');
    setChecklistAnswers({});
    setUsedParts([]);
    setOpenExecuteDialog(true);
  };

  const handleCompleteSchedule = async () => {
    if (!selectedSchedule) return;
    try {
      const itemsPayload = Object.entries(checklistAnswers).map(([key, val]) => ({
        itemId: key,
        value: val,
      }));

      const res = await fetch(`/api/mro/schedules/${selectedSchedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          notes: execNotes,
          checklistItems: itemsPayload,
          usedParts,
        }),
      });

      const data = await res.json();
      if (data.success) {
        enqueueSnackbar('Регламент ТО успешно завершен, запчасти списаны', { variant: 'success' });
        setOpenExecuteDialog(false);
        loadData();
      } else {
        enqueueSnackbar(data.error || 'Ошибка завершения ТО', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сервера при выполнении', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="MRO — Техническое обслуживание и ремонт"
        subtitle="Календарные графики планово-предупредительного ремонта (ППР), электронные чек-листы и списание запчастей"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'ТО и Ремонт' }]}
        actions={
          hasPermission(PERMISSIONS.MRO_SCHEDULE_MANAGE) && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {tab === 0 && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenScheduleDialog(true)}>
                  Запланировать ТО
                </Button>
              )}
              {tab === 1 && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenPlanDialog(true)}>
                  Новый план ТО
                </Button>
              )}
              {tab === 2 && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenChecklistDialog(true)}>
                  Новый чек-лист
                </Button>
              )}
            </Box>
          )
        }
        tabs={
          <NavTabsContainer
            value={tab}
            onChange={(val) => setTab(val)}
            tabs={[
              { label: 'График нарядов ТО', value: 0, badge: schedules.length },
              { label: 'Регламентные планы', value: 1, badge: plans.length },
              { label: 'Шаблоны чек-листов', value: 2, badge: checklists.length },
            ]}
          />
        }
      />

      {/* Critical MRO Alerts */}
      {schedules.filter((s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length > 0 && (
        <CriticalAlertBanner
          alerts={[
            {
              id: 'mro-pending-schedules',
              severity: 'WARNING',
              title: 'Требуется проведение запланированных регламентных работ (ТО)',
              description: `В графике ППР ожидает выполнения ${schedules.filter((s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length} нарядов. Своевременное ТО предотвращает аварийные простои.`,
              count: schedules.filter((s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length,
              actionLabel: 'Открыть график ТО',
              onAction: () => setTab(0),
            },
          ]}
        />
      )}

      {/* KPI & Trend Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TrendSparkline
            title="Динамика нарядов ТО (30 дн)"
            currentValue={schedules.length}
            unit="нарядов"
            changePercent={15.2}
            periodLabel="vs пред. месяц"
            data={[4, 6, 8, 9, 11, schedules.length || 12]}
            color="#0284c7"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Регламентные планы"
            value={plans.length}
            subtitle="Действующих технологических карт"
            icon={<AssignmentIcon sx={{ fontSize: 20 }} />}
            iconBgColor="rgba(124, 58, 237, 0.08)"
            iconColor="#7c3aed"
            accentColor="#7c3aed"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TrendSparkline
            title="Выполнение регламентов (%)"
            currentValue={`${schedules.length > 0 ? Math.round((schedules.filter((s) => s.status === 'COMPLETED').length / schedules.length) * 100) : 100}%`}
            changePercent={5.8}
            periodLabel="своевременность ТО"
            data={[82, 85, 88, 91, 94, 98]}
            color="#16a34a"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 4, borderRadius: 2 }}>
        <Box sx={{ p: 2 }}>
          {loading ? (
            <PageLoading text="Загрузка нарядов и регламентных планов ТО..." />
          ) : (
            <>
              {/* TAB 0: График нарядов ТО */}
              {tab === 0 && (
                schedules.length === 0 ? (
                  <EmptyState
                    paper
                    icon={<CalendarMonthIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
                    title="В графике пока нет запланированных работ"
                    description="Вы можете запланировать наряд на техническое обслуживание для единицы оборудования."
                    actionText={hasPermission(PERMISSIONS.MRO_SCHEDULE_MANAGE) ? "Запланировать ТО" : undefined}
                    onAction={hasPermission(PERMISSIONS.MRO_SCHEDULE_MANAGE) ? () => setOpenScheduleDialog(true) : undefined}
                  />
                ) : (
                  <DataTableWrapper total={schedules.length} stickyHeader>
                    <Table size="small" aria-label="График нарядов ТО">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Оборудование</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Название регламента</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 140 }}>Дата проведения</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 130 }}>Статус</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 150 }}>Исполнитель</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>Действия</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {schedules.map((s) => (
                          <TableRow key={s.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                                {s.equipment?.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Инв: {s.equipment?.inventoryNumber} | {s.equipment?.location || 'Цех'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{s.title}</Typography>
                              {s.plan?.name && (
                                <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                                  План: {s.plan.name}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                              {new Date(s.scheduledDate).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={s.status} />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8125rem' }}>
                              {s.completedBy?.displayName || '—'}
                            </TableCell>
                            <TableCell align="right">
                              {s.status !== 'COMPLETED' ? (
                                hasPermission(PERMISSIONS.MRO_EXECUTION_COMPLETE) ? (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<PlayArrowIcon />}
                                    onClick={() => handleOpenExecute(s)}
                                  >
                                    Выполнить
                                  </Button>
                                ) : (
                                  <Chip label="В ожидании" size="small" variant="outlined" sx={{ borderRadius: '4px' }} />
                                )
                              ) : (
                                <StatusBadge status="COMPLETED" size="small" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableWrapper>
                )
              )}

              {/* TAB 1: Регламентные планы */}
              {tab === 1 && (
                plans.length === 0 ? (
                  <EmptyState
                    paper
                    icon={<AssignmentIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
                    title="Регламентные планы еще не созданы"
                    description="Создайте периодический регламентный план обслуживания с привязкой чек-листа."
                    actionText={hasPermission(PERMISSIONS.MRO_SCHEDULE_MANAGE) ? "Новый план ТО" : undefined}
                    onAction={hasPermission(PERMISSIONS.MRO_SCHEDULE_MANAGE) ? () => setOpenPlanDialog(true) : undefined}
                  />
                ) : (
                  <DataTableWrapper total={plans.length} stickyHeader>
                    <Table size="small" aria-label="Регламентные планы ТО">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Оборудование</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Название плана</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 140 }}>Периодичность</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Чек-лист</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 140 }}>Нарядов в графике</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {plans.map((p) => (
                          <TableRow key={p.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                                {p.equipment?.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Инв. №: {p.equipment?.inventoryNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>{p.name}</Typography>
                              {p.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {p.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={p.frequency} size="small" />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8125rem' }}>
                              {p.checklist?.name || 'Без чек-листа'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p._count?.schedules || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableWrapper>
                )
              )}

              {/* TAB 2: Шаблоны чек-листов */}
              {tab === 2 && (
                checklists.length === 0 ? (
                  <EmptyState
                    paper
                    icon={<ChecklistRtlIcon sx={{ fontSize: 36, color: '#94a3b8' }} />}
                    title="Шаблоны чек-листов отсутствуют"
                    description="Создайте структурированные опросные листы и регламенты проверки узлов оборудования."
                    actionText={hasPermission(PERMISSIONS.MRO_SCHEDULE_MANAGE) ? "Новый чек-лист" : undefined}
                    onAction={hasPermission(PERMISSIONS.MRO_SCHEDULE_MANAGE) ? () => setOpenChecklistDialog(true) : undefined}
                  />
                ) : (
                  <DataTableWrapper total={checklists.length} stickyHeader>
                    <Table size="small" aria-label="Шаблоны чек-листов ТО">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Название чек-листа</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Описание</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 160 }}>Количество пунктов</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 160 }}>Используется в планах</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {checklists.map((c) => (
                          <TableRow key={c.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                                {c.name}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8125rem' }}>{c.description || '—'}</TableCell>
                            <TableCell>
                              <Chip size="small" label={`${c.items?.length || 0} пунктов`} variant="outlined" sx={{ borderRadius: '4px', height: 22 }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{c._count?.plans || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableWrapper>
                )
              )}
            </>
          )}
        </Box>
      </Card>

      {/* Диалог создания наряда ТО */}
      <FormDialog
        open={openScheduleDialog}
        onClose={() => setOpenScheduleDialog(false)}
        title="Запланировать проведение ТО"
        icon={<CalendarMonthIcon color="primary" />}
        maxWidth="sm"
        submitLabel="Запланировать"
        onSubmit={handleCreateSchedule}
        submitDisabled={!scheduleForm.equipmentId || !scheduleForm.title || !scheduleForm.scheduledDate}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Оборудование</InputLabel>
            <Select
              value={scheduleForm.equipmentId}
              label="Оборудование"
              onChange={(e) => setScheduleForm({ ...scheduleForm, equipmentId: e.target.value })}
            >
              {equipmentList.map((eq) => (
                <MenuItem key={eq.id} value={eq.id}>
                  {eq.name} ({eq.inventoryNumber})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="Название регламента / наряда"
            value={scheduleForm.title}
            onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Плановая дата"
            InputLabelProps={{ shrink: true }}
            value={scheduleForm.scheduledDate}
            onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            label="Примечания к наряду"
            value={scheduleForm.notes}
            onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
          />
        </Box>
      </FormDialog>

      {/* Диалог создания регламентного плана */}
      <FormDialog
        open={openPlanDialog}
        onClose={() => setOpenPlanDialog(false)}
        title="Создать регламентный план ТО"
        icon={<BuildCircleIcon color="primary" />}
        maxWidth="sm"
        submitLabel="Сохранить план"
        onSubmit={handleCreatePlan}
        submitDisabled={!planForm.equipmentId || !planForm.name}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Оборудование</InputLabel>
            <Select
              value={planForm.equipmentId}
              label="Оборудование"
              onChange={(e) => setPlanForm({ ...planForm, equipmentId: e.target.value })}
            >
              {equipmentList.map((eq) => (
                <MenuItem key={eq.id} value={eq.id}>
                  {eq.name} ({eq.inventoryNumber})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="Название регламента"
            value={planForm.name}
            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Периодичность</InputLabel>
            <Select
              value={planForm.frequency}
              label="Периодичность"
              onChange={(e) => setPlanForm({ ...planForm, frequency: e.target.value })}
            >
              <MenuItem value="DAILY">Ежедневно</MenuItem>
              <MenuItem value="WEEKLY">Еженедельно</MenuItem>
              <MenuItem value="MONTHLY">Ежемесячно</MenuItem>
              <MenuItem value="QUARTERLY">Ежеквартально</MenuItem>
              <MenuItem value="YEARLY">Ежегодно</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Шаблон чек-листа</InputLabel>
            <Select
              value={planForm.checklistId}
              label="Шаблон чек-листа"
              onChange={(e) => setPlanForm({ ...planForm, checklistId: e.target.value })}
            >
              <MenuItem value="">Без чек-листа</MenuItem>
              {checklists.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </FormDialog>

      {/* Диалог создания шаблона чек-листа */}
      <FormDialog
        open={openChecklistDialog}
        onClose={() => setOpenChecklistDialog(false)}
        title="Создать шаблон чек-листа ТО"
        icon={<ChecklistRtlIcon color="primary" />}
        maxWidth="sm"
        submitLabel="Сохранить чек-лист"
        onSubmit={handleCreateChecklist}
        submitDisabled={!checklistForm.name}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Название чек-листа"
            value={checklistForm.name}
            onChange={(e) => setChecklistForm({ ...checklistForm, name: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            label="Описание"
            value={checklistForm.description}
            onChange={(e) => setChecklistForm({ ...checklistForm, description: e.target.value })}
          />
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Пункты проверки:
          </Typography>
          {checklistForm.items.map((it, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                label={`Пункт #${idx + 1}`}
                value={it.description}
                onChange={(e) => {
                  const newItems = [...checklistForm.items];
                  newItems[idx].description = e.target.value;
                  setChecklistForm({ ...checklistForm, items: newItems });
                }}
              />
            </Box>
          ))}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() =>
              setChecklistForm({
                ...checklistForm,
                items: [...checklistForm.items, { description: '', itemType: 'BOOLEAN', isRequired: true }],
              })
            }
          >
            Добавить пункт
          </Button>
        </Box>
      </FormDialog>

      {/* Мастер выполнения регламента ТО с чек-листом и списанием запчастей */}
      <MroExecutionWizardDialog
        open={openExecuteDialog}
        onClose={() => setOpenExecuteDialog(false)}
        onSuccess={loadData}
        schedule={selectedSchedule}
      />
    </Box>
  );
}
