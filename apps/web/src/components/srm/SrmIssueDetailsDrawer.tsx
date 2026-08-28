'use client';

import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Grid,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import HubIcon from '@mui/icons-material/Hub';
import SaveIcon from '@mui/icons-material/Save';
import { StatusBadge, ConfirmDialog } from '@/components/ui';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import { SRM_FAILURE_CATEGORY_MAP, SRM_SOURCE_MAP, SRM_STATUS_MAP, SRM_PRIORITY_MAP, SrmIssueDto } from '@ems/shared';

export interface SrmIssueDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  issue: SrmIssueDto | null;
  onIssueUpdated: () => void;
}

export default function SrmIssueDetailsDrawer({
  open,
  onClose,
  issue,
  onIssueUpdated,
}: SrmIssueDetailsDrawerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [status, setStatus] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [downtimeMinutes, setDowntimeMinutes] = useState<number>(0);
  const [assignee, setAssignee] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingMro, setIsCreatingMro] = useState(false);

  React.useEffect(() => {
    if (issue) {
      setStatus(issue.status || 'OPEN');
      setResolutionNotes(issue.resolutionNotes || '');
      setDowntimeMinutes(issue.downtimeMinutes || 0);
      setAssignee(issue.assignee || '');
    }
  }, [issue]);

  if (!issue) return null;

  const handleSaveQuickUpdates = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/srm/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          resolutionNotes: resolutionNotes.trim(),
          downtimeMinutes: Number(downtimeMinutes) || 0,
          assignee: assignee.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Данные инцидента успешно сохранены', { variant: 'success' });
        onIssueUpdated();
      } else {
        enqueueSnackbar(json.error || 'Ошибка при сохранении', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при обновлении заявки', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMroWorkOrder = async () => {
    if (!issue.equipmentId) {
      enqueueSnackbar('Нельзя создать наряд: к заявке не привязано оборудование', { variant: 'warning' });
      return;
    }

    setIsCreatingMro(true);
    try {
      const res = await fetch(`/api/srm/issues/${issue.id}/create-mro-order`, {
        method: 'POST',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(json.message || 'Аварийный заказ-наряд ТОиР успешно создан!', { variant: 'success' });
        onIssueUpdated();
        router.push('/mro');
      } else {
        enqueueSnackbar(json.error || 'Ошибка создания наряда в MRO', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при формировании заказ-наряда', { variant: 'error' });
    } finally {
      setIsCreatingMro(false);
    }
  };

  const isResolved = ['CLOSED', 'RESOLVED', 'DONE', 'РЕШЕН', 'ГОТОВ', 'ЗАКРЫТ'].some((s) =>
    (issue.status || '').toUpperCase().includes(s)
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 540, md: 620 }, p: 0, bgcolor: 'background.paper' },
      }}
    >
      {/* Drawer Header */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
            {issue.issueKey || issue.key}
          </Typography>
          <StatusBadge status={issue.status} />
          {issue.priority && <StatusBadge status={issue.priority} variant="outlined" />}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Drawer Content */}
      <Box sx={{ p: 3, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Title and Metadata */}
        <div>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>
            {issue.summary || issue.title}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <StatusBadge
              status={issue.source || 'INTERNAL'}
              label={(issue.source && SRM_SOURCE_MAP[issue.source]?.label) || issue.integration?.name || 'Внутренний инцидент'}
              size="small"
              variant="outlined"
            />
            {issue.failureCategory && (
              <Chip
                label={SRM_FAILURE_CATEGORY_MAP[issue.failureCategory]?.label || issue.failureCategory}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem', fontWeight: 600 }}
              />
            )}
            {issue.warrantyClaim && (
              <Chip
                icon={<ShieldOutlinedIcon sx={{ fontSize: 14 }} />}
                label={`Гарантия: ${issue.contractorName || 'Завод'}`}
                color="warning"
                size="small"
                sx={{ fontSize: '0.75rem', fontWeight: 700 }}
              />
            )}
          </Box>
        </div>

        {/* Linked Equipment Card */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px', bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
              Связанное оборудование (EPS):
            </Typography>
            {issue.equipment && (
              <Button
                size="small"
                endIcon={<LaunchIcon sx={{ fontSize: 14 }} />}
                onClick={() => issue.equipment?.id && router.push(`/eps/${issue.equipment.id}`)}
                sx={{ fontSize: '0.75rem', p: 0 }}
              >
                Открыть паспорт
              </Button>
            )}
          </Box>
          {issue.equipment ? (
            <Box>
              <Typography variant="body1" fontWeight={700} color="text.primary">
                {issue.equipment.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Инв. №: <b>{issue.equipment.inventoryNumber || '—'}</b> | Модель: <b>{issue.equipment.model || issue.equipment.manufacturer || '—'}</b>
              </Typography>
              <Box sx={{ mt: 1 }}>
                <StatusBadge status={issue.equipment.status || 'ACTIVE'} size="small" />
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled">
              Оборудование не привязано к данной заявке
            </Typography>
          )}
        </Paper>

        {/* SLA & Time Metrics */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px' }}>
              <Typography variant="caption" color="text.secondary">
                Регламент решения (SLA):
              </Typography>
              <Typography variant="body2" fontWeight={700} color={issue.slaBreached ? 'error.main' : 'success.main'}>
                {issue.slaDeadline ? new Date(issue.slaDeadline).toLocaleString('ru-RU') : '24 часа'}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px' }}>
              <Typography variant="caption" color="text.secondary">
                Время простоя линии:
              </Typography>
              <Typography variant="body2" fontWeight={700} color="text.primary">
                {issue.downtimeMinutes ? `${Math.round((issue.downtimeMinutes / 60) * 10) / 10} ч (${issue.downtimeMinutes} мин)` : '0 мин'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Description */}
        <div>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
            Описание инцидента и симптомы:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', minHeight: 70, bgcolor: 'background.paper' }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
              {issue.description || (issue.rawData?.description ? String(issue.rawData.description) : null) || 'Подробное текстовое описание отсутствует.'}
            </Typography>
          </Paper>
        </div>

        {/* Linked MRO Work Order */}
        {issue.mroScheduleId ? (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', bgcolor: 'rgba(2, 132, 199, 0.04)', borderColor: 'primary.light' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                Сформирован наряд ТОиР в модуле MRO
              </Typography>
              <Button size="small" onClick={() => router.push('/mro')} sx={{ fontSize: '0.75rem' }}>
                Перейти в MRO →
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Заказ-наряд на ремонт сформирован и привязан к инциденту. Списание запчастей WMS фиксируется в наряде.
            </Typography>
          </Paper>
        ) : (
          <Button
            variant="outlined"
            color="primary"
            startIcon={isCreatingMro ? <CircularProgress size={18} /> : <BuildCircleIcon />}
            onClick={handleCreateMroWorkOrder}
            disabled={isCreatingMro || !issue.equipmentId}
            sx={{ borderRadius: '8px', py: 1, fontWeight: 700 }}
          >
            Сформировать наряд на ремонт в MRO
          </Button>
        )}

        <Divider />

        {/* Fast Action / Resolution Form */}
        <div>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 2 }}>
            Управление статусом и фиксация решения:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Статус заявки</InputLabel>
                <Select
                  value={status}
                  label="Статус заявки"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="OPEN">Новая / Открыта (OPEN)</MenuItem>
                  <MenuItem value="IN_PROGRESS">В работе (IN_PROGRESS)</MenuItem>
                  <MenuItem value="WAITING">Ожидание запчастей / Подрядчика (WAITING)</MenuItem>
                  <MenuItem value="RESOLVED">Решена / Устранена (RESOLVED)</MenuItem>
                  <MenuItem value="CLOSED">Закрыта (CLOSED)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Время простоя (минут)"
                type="number"
                fullWidth
                size="small"
                value={downtimeMinutes}
                onChange={(e) => setDowntimeMinutes(Number(e.target.value))}
                inputProps={{ min: 0, step: 10 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Ответственный исполнитель"
                fullWidth
                size="small"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="ФИО инженера или название сервисной службы"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Резолюция / Принятые меры по устранению"
                fullWidth
                multiline
                rows={3}
                size="small"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Укажите, какие узлы заменены, отрегулированы, сброшены ли ошибки ЧПУ..."
              />
            </Grid>
          </Grid>
        </div>
      </Box>

      {/* Drawer Footer Actions */}
      <Box sx={{ p: 2.5, borderTop: '1px solid divider', display: 'flex', justifyContent: 'flex-end', gap: 1.5, bgcolor: 'background.default' }}>
        <Button onClick={onClose} variant="outlined" sx={{ fontWeight: 600 }}>
          Закрыть
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSaveQuickUpdates}
          disabled={isSaving}
          sx={{ fontWeight: 700, px: 3 }}
        >
          Сохранить изменения
        </Button>
      </Box>
    </Drawer>
  );
}
