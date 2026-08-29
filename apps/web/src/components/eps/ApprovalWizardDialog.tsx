'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Stack,
  Paper,
  Autocomplete,
  Alert,
  Divider,
} from '@mui/material';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { useSnackbar } from 'notistack';
import { FormDialog, StatusBadge } from '@/components/ui';
import { APPROVAL_TYPE_MAP, EQUIPMENT_STATUS_MAP } from '@ems/shared';

interface EquipmentOption {
  id: string;
  name: string;
  inventoryNumber?: string | null;
  location?: string | null;
  status?: string;
}

export interface ApprovalWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newApprovalId: string) => void;
  initialEquipmentId?: string;
}

export default function ApprovalWizardDialog({
  open,
  onClose,
  onSuccess,
  initialEquipmentId,
}: ApprovalWizardDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  // Stepper State (0: Выбор оборудования и регламента, 1: Обоснование и параметры, 2: Проверка и подача)
  const [activeStep, setActiveStep] = useState(0);

  // Form Fields
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentOption | null>(null);
  const [approvalType, setApprovalType] = useState('COMMISSIONING');
  const [targetStatus, setTargetStatus] = useState('ACTIVE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionComment, setResolutionComment] = useState('');

  // Equipment List
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setTitle('');
      setDescription('');
      setResolutionComment('');
      setApprovalType('COMMISSIONING');
      setTargetStatus('ACTIVE');

      fetch('/api/eps/equipment?pageSize=300')
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            const list: EquipmentOption[] = json.data?.items || (Array.isArray(json.data) ? json.data : []);
            setEquipmentList(list);
            if (initialEquipmentId) {
              const eq = list.find((e) => e.id === initialEquipmentId);
              if (eq) setSelectedEquipment(eq);
            }
          }
        })
        .catch(() => {
          enqueueSnackbar('Не удалось загрузить список оборудования', { variant: 'error' });
        });
    }
  }, [open, initialEquipmentId, enqueueSnackbar]);

  // Auto-generate title suggestion when type or equipment changes
  useEffect(() => {
    if (selectedEquipment && approvalType) {
      const typeLabel = APPROVAL_TYPE_MAP[approvalType as keyof typeof APPROVAL_TYPE_MAP] || approvalType;
      setTitle(`Заявка на ${typeLabel.toLowerCase()}: ${selectedEquipment.name}`);
    }
  }, [selectedEquipment, approvalType]);

  const handleNextStep = () => {
    if (activeStep === 0) {
      if (!selectedEquipment) {
        enqueueSnackbar('Выберите единицу оборудования', { variant: 'warning' });
        return;
      }
    } else if (activeStep === 1) {
      if (!title.trim()) {
        enqueueSnackbar('Укажите тему заявки', { variant: 'warning' });
        return;
      }
    }
    setActiveStep((prev) => Math.min(prev + 1, 2));
  };

  const handleSubmit = async () => {
    if (!selectedEquipment || !title.trim()) return;

    setIsSubmitting(true);
    try {
      const proposedData: Record<string, any> = {};
      if (approvalType === 'STATUS_CHANGE') {
        proposedData.status = targetStatus;
      }

      const res = await fetch('/api/eps/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: selectedEquipment.id,
          type: approvalType,
          title: title.trim(),
          description: description.trim() || undefined,
          proposedData: Object.keys(proposedData).length > 0 ? proposedData : undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar('Заявка на согласование успешно зарегистрирована и направлена на рассмотрение', {
          variant: 'success',
        });
        onSuccess(json.data.id);
        onClose();
      } else {
        enqueueSnackbar(json.error || 'Ошибка подачи заявки на согласование', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при отправке заявки', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Мастер подачи заявки на согласование"
      subtitle="Оформление регламентной заявки на ввод, вывод из эксплуатации или изменение статуса"
      icon={<AssignmentOutlinedIcon />}
      maxWidth="md"
      steps={[
        '1. Оборудование и регламент',
        '2. Параметры и обоснование',
        '3. Проверка и отправка',
      ]}
      activeStep={activeStep}
      onStepChange={(step) => setActiveStep(step)}
      hideActions
    >
      <Box sx={{ mt: 1.5 }}>
        {/* STEP 0: Выбор оборудования и типа регламента */}
        {activeStep === 0 && (
          <Stack spacing={2.5}>
            <Autocomplete
              options={equipmentList}
              getOptionLabel={(option) =>
                `${option.inventoryNumber ? `[${option.inventoryNumber}] ` : ''}${option.name}`
              }
              value={selectedEquipment}
              onChange={(_, val) => setSelectedEquipment(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Целевое оборудование"
                  placeholder="Начните ввод названия или инвентарного номера..."
                  size="small"
                  fullWidth
                  required
                />
              )}
            />

            {selectedEquipment && (
              <Paper elevation={0} sx={{ p: 2, borderRadius: '8px', bgcolor: 'background.default', border: '1px solid divider' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Наименование:
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {selectedEquipment.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Инв. номер:
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {selectedEquipment.inventoryNumber || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Текущий статус:
                    </Typography>
                    <Box sx={{ mt: 0.25 }}>
                      <StatusBadge status={selectedEquipment.status || 'ACTIVE'} />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}

            <TextField
              select
              size="small"
              label="Тип регламентного согласования"
              value={approvalType}
              onChange={(e) => setApprovalType(e.target.value)}
              fullWidth
              required
            >
              {Object.entries(APPROVAL_TYPE_MAP).map(([k, label]) => (
                <MenuItem key={k} value={k}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button
                variant="contained"
                onClick={handleNextStep}
                disabled={!selectedEquipment}
                sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}
              >
                Далее: Обоснование заявки →
              </Button>
            </Box>
          </Stack>
        )}

        {/* STEP 1: Параметры и обоснование */}
        {activeStep === 1 && (
          <Stack spacing={2.5}>
            {approvalType === 'STATUS_CHANGE' && (
              <TextField
                select
                size="small"
                label="Целевой рабочий статус оборудования"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                fullWidth
                required
              >
                {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, info]) => (
                  <MenuItem key={k} value={k}>
                    {info.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Тема / Название заявки"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              size="small"
              fullWidth
              required
              placeholder="Например: Согласование акта списания насосного агрегата"
            />

            <TextField
              label="Обоснование / Пояснительная записка"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              size="small"
              fullWidth
              placeholder="Укажите причину (выработка нормативного ресурса, результаты дефектовки, приказ руководства)..."
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setActiveStep(0)} sx={{ fontWeight: 600 }}>
                ← Назад
              </Button>
              <Button
                variant="contained"
                onClick={handleNextStep}
                disabled={!title.trim()}
                sx={{ borderRadius: '8px', px: 3, fontWeight: 600 }}
              >
                Далее: Проверка и отправка →
              </Button>
            </Box>
          </Stack>
        )}

        {/* STEP 2: Проверка и подача */}
        {activeStep === 2 && (
          <Stack spacing={2.5}>
            <Alert severity="info" icon={<RateReviewIcon />}>
              Заявка будет зарегистрирована в системе со статусом «На рассмотрении» и станет доступна уполномоченным лицам для утверждения.
            </Alert>

            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '10px', bgcolor: 'background.default', border: '1px solid divider' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Тип согласования:
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                    {APPROVAL_TYPE_MAP[approvalType as keyof typeof APPROVAL_TYPE_MAP] || approvalType}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Оборудование:
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                    {selectedEquipment?.name} ({selectedEquipment?.inventoryNumber || 'б/н'})
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Тема заявки:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {title}
                  </Typography>
                </Grid>
                {description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Обоснование:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {description}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => setActiveStep(1)} sx={{ fontWeight: 600 }}>
                ← Назад к обоснованию
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckCircleIcon />}
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim()}
                sx={{ borderRadius: '8px', px: 4, fontWeight: 700 }}
              >
                {isSubmitting ? 'Отправка...' : 'Подать на согласование'}
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </FormDialog>
  );
}
