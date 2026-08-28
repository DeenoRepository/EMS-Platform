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
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  Alert,
  CircularProgress,
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HandymanIcon from '@mui/icons-material/Handyman';
import SendIcon from '@mui/icons-material/Send';
import { useSnackbar } from 'notistack';
import { FormDialog } from '@/components/ui';

export interface CreateServiceRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEquipmentId?: string | null;
}

const FAILURE_CATEGORIES = [
  { value: 'MECHANICAL', label: 'Механический излом / Узел / Подшипник' },
  { value: 'ELECTRICAL', label: 'Электрооборудование / Привод / КЗ / Двигатель' },
  { value: 'HYDRAULIC', label: 'Гидравлика / Пневматика / Давление / Утечка' },
  { value: 'SOFTWARE', label: 'Сбой ПО / ЧПУ / Контроллер / Автоматика' },
  { value: 'WEAR', label: 'Естественный износ / Деградация расходников' },
  { value: 'OPERATOR_ERROR', label: 'Человеческий фактор / Нарушение регламента' },
  { value: 'OTHER', label: 'Прочая неисправность' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Низкий — плановое устранение без остановки', color: 'info' },
  { value: 'MEDIUM', label: 'Средний — снижение производительности / дефект', color: 'warning' },
  { value: 'HIGH', label: 'Высокий — критический риск остановки оборудования', color: 'error' },
  { value: 'CRITICAL', label: 'Аварийный — полный останов линии / авария', color: 'error' },
];

export default function CreateServiceRequestDialog({
  open,
  onClose,
  onSuccess,
  initialEquipmentId,
}: CreateServiceRequestDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);

  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [failureCategory, setFailureCategory] = useState('MECHANICAL');
  const [assignee, setAssignee] = useState('');
  const [warrantyClaim, setWarrantyClaim] = useState(false);
  const [contractorName, setContractorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSummary('');
      setDescription('');
      setPriority('MEDIUM');
      setFailureCategory('MECHANICAL');
      setAssignee('');
      setWarrantyClaim(false);
      setContractorName('');

      // Загрузка перечня оборудования
      setLoadingEquipment(true);
      fetch('/api/eps/equipment?pageSize=200')
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data?.items) {
            setEquipmentList(json.data.items);
            if (initialEquipmentId) {
              const matched = json.data.items.find((e: any) => e.id === initialEquipmentId);
              if (matched) setSelectedEquipment(matched);
            }
          }
        })
        .catch((err) => console.error('Ошибка загрузки оборудования:', err))
        .finally(() => setLoadingEquipment(false));
    }
  }, [open, initialEquipmentId]);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      enqueueSnackbar('Укажите тему или краткое описание неисправности', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/srm/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: summary.trim(),
          description: description.trim(),
          priority,
          issueType: 'INCIDENT',
          failureCategory,
          equipmentId: selectedEquipment?.id || undefined,
          assignee: assignee.trim() || undefined,
          warrantyClaim,
          contractorName: warrantyClaim ? contractorName.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        enqueueSnackbar(json.message || 'Сервисная заявка успешно зарегистрирована', { variant: 'success' });
        onSuccess();
        onClose();
      } else {
        enqueueSnackbar(json.error || 'Ошибка при регистрации заявки', { variant: 'error' });
      }
    } catch {
      enqueueSnackbar('Ошибка сети при отправке заявки', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHighSeverity = priority === 'HIGH' || priority === 'CRITICAL';

  return (
    <FormDialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Регистрация сервисной заявки / инцидента SRM"
      subtitle="Оперативная фиксация отказа оборудования, вызов дежурной службы ТОиР"
      icon={<BugReportIcon />}
      maxWidth="md"
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? 'Регистрация...' : 'Зарегистрировать инцидент'}
      cancelLabel="Отмена"
      loading={isSubmitting}
    >
      <Box sx={{ mt: 1 }}>
        {isHighSeverity && (
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2.5, borderRadius: '8px' }}>
            <Typography variant="body2" fontWeight={600}>
              Выбран высокий приоритет ({priority === 'CRITICAL' ? 'АВАРИЯ' : 'СРОЧНО'}).
            </Typography>
            <Typography variant="caption" color="text.secondary">
              При регистрации заявки связанное оборудование будет автоматически переведено в статус «На ремонте», а дежурным инженерам будет отправлено экстренное уведомление.
            </Typography>
          </Alert>
        )}

        <Stack spacing={2.5}>
          {/* Тема инцидента */}
          <TextField
            label="Краткая суть неисправности / Тема инцидента"
            fullWidth
            size="small"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="например: Заклинивание главного шпинделя, перегрев подшипникового узла"
            required
            autoFocus
          />

          <Grid container spacing={2}>
            {/* Оборудование */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={equipmentList}
                getOptionLabel={(opt) => `[${opt.inventoryNumber || '—'}] ${opt.name} (${opt.model || opt.manufacturer || 'Без модели'})`}
                value={selectedEquipment}
                onChange={(_, val) => setSelectedEquipment(val)}
                loading={loadingEquipment}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Единица оборудования"
                    placeholder="Поиск по инв. номеру или наименованию..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingEquipment ? <CircularProgress size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Приоритет */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Приоритет инцидента</InputLabel>
                <Select
                  value={priority}
                  label="Приоритет инцидента"
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Категория отказа */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Категория дефекта / отказа</InputLabel>
                <Select
                  value={failureCategory}
                  label="Категория дефекта / отказа"
                  onChange={(e) => setFailureCategory(e.target.value)}
                >
                  {FAILURE_CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Назначенный исполнитель */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Исполнитель / Бригада (опционально)"
                fullWidth
                size="small"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="например: Дежурный механик / Бригада №2"
              />
            </Grid>
          </Grid>

          {/* Описание дефекта и симптомов */}
          <TextField
            label="Подробное описание дефекта, симптомов и условий проявления"
            fullWidth
            multiline
            rows={3}
            size="small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите характер стука, вибрации, показания манометров, код ошибки на стойке ЧПУ..."
          />

          {/* Гарантийный случай */}
          <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: '8px', border: '1px solid divider' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={warrantyClaim}
                  onChange={(e) => setWarrantyClaim(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Гарантийный случай (Рекламация поставщику / заводу-изготовителю)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Отметьте, если оборудование находится на заводской гарантии и ремонт должен выполняться авторизованным сервисным центром
                  </Typography>
                </Box>
              }
            />

            {warrantyClaim && (
              <TextField
                label="Сервисный центр / Подрядчик по гарантии"
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                placeholder="например: ООО «СтанкоСервис», АО «ПромГидравлика»"
              />
            )}
          </Box>
        </Stack>
      </Box>
    </FormDialog>
  );
}
